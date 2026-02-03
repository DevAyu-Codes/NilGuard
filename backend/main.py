from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ai_engine import analyze_contract
from database import contracts_collection, users_collection
from bson import ObjectId
import shutil
import os
import uuid
from pymongo import MongoClient

app = FastAPI()

# --- DATABASE ---
client = MongoClient("mongodb://localhost:27017/")
db = client.nil_guard_db

# --- STORAGE ---
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELS ---
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str
    name: str

class StatusUpdateRequest(BaseModel):
    contract_id: str
    status: str

# --- AUTH ROUTES ---
@app.post("/login")
def login(creds: LoginRequest):
    user = users_collection.find_one({"username": creds.username, "password": creds.password})
    if user:
        return {"status": "success", "role": user["role"], "name": user["name"], "user_id": str(user["_id"])}
    raise HTTPException(status_code=400, detail="Invalid credentials")

@app.post("/register")
def register_user(user: RegisterRequest):
    if users_collection.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="User ID already exists!")
    users_collection.insert_one(user.dict())
    return {"status": "success", "message": "User created!"}

# --- CONTRACT ROUTES ---
@app.post("/analyze")
async def analyze_upload(user_id: str, file: UploadFile = File(...)):
    # 1. Save File
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # 2. Analyze (Always uses GPT-4o now)
        ai_response = analyze_contract(file_path)
        
        # 3. Save to DB
        db_record = {
            "user_id": user_id,
            "filename": file.filename,
            "file_url": f"http://localhost:8000/uploads/{unique_filename}",
            "analysis": ai_response,
            "status": "AI_Reviewed",
            "model_used": "GPT-4o",
            "timestamp": os.path.getmtime(file_path)
        }
        contracts_collection.insert_one(db_record)
        return {"status": "success", "data": ai_response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# UPDATED: GENERIC STATUS UPDATE ENDPOINT
# This handles "Sent_to_Compliance", "Approved", and "Rejected"
@app.post("/update-status")
def update_status(req: StatusUpdateRequest):
    result = contracts_collection.update_one(
        {"_id": ObjectId(req.contract_id)}, 
        {"$set": {"status": req.status}}
    )
    if result.modified_count == 1: 
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Contract not found")

@app.get("/contracts/{role}/{user_id}")
def get_contracts(role: str, user_id: str):
    if role == "admin":
        # Admin sees pending submissions AND processed ones (to verify history)
        cursor = contracts_collection.find({
            "status": {"$in": ["Sent_to_Compliance", "Approved", "Rejected"]}
        })
    else:
        cursor = contracts_collection.find({"user_id": user_id})
    
    return [{**doc, "_id": str(doc["_id"])} for doc in cursor]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)