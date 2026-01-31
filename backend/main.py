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

app = FastAPI()

# --- 1. SETUP UPLOADS FOLDER ---
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount the folder so files can be accessed via URL (e.g., localhost:8000/uploads/file.pdf)
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
    
    new_user = {
        "username": user.username,
        "password": user.password,
        "role": user.role,
        "name": user.name
    }
    users_collection.insert_one(new_user)
    return {"status": "success", "message": f"User {user.name} created successfully!"}

# --- CONTRACT ROUTES ---
@app.post("/analyze")
async def analyze_upload(user_id: str, file: UploadFile = File(...)):
    # 1. Generate a unique filename to prevent overwrites
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # 2. Save the file PERMANENTLY to the uploads folder
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # 3. Analyze the saved file
        ai_response = analyze_contract(file_path)
        
        # 4. Save to Database with the FILE URL
        db_record = {
            "user_id": user_id,
            "filename": file.filename,  # Original name for display
            "file_url": f"http://localhost:8000/uploads/{unique_filename}", # Access link
            "analysis": ai_response,
            "status": "AI_Reviewed",
            "timestamp": os.path.getmtime(file_path)
        }
        contracts_collection.insert_one(db_record)
        return {"status": "success", "data": ai_response}
    except Exception as e:
        # If analysis fails, we still keep the file for debugging, or you could delete it here
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/send-to-nilgo")
def send_to_nilgo(req: StatusUpdateRequest):
    result = contracts_collection.update_one(
        {"_id": ObjectId(req.contract_id)},
        {"$set": {"status": req.status}}
    )
    if result.modified_count == 1:
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Contract not found")

@app.get("/contracts/{role}/{user_id}")
def get_contracts(role: str, user_id: str):
    contracts = []
    
    if role == "admin":
        # FIX: Admin ONLY sees contracts that have been sent to compliance
        # They should NOT see "AI_Reviewed" (Drafts)
        cursor = contracts_collection.find({"status": "Sent_to_Compliance"})
    else:
        # Student sees all their own contracts (Drafts + Sent)
        cursor = contracts_collection.find({"user_id": user_id})
    
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        contracts.append(doc)
        
    return contracts

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)