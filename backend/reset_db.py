from pymongo import MongoClient
import os
import shutil

# --- CONFIGURATION ---
UPLOAD_DIR = "uploads"
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "nil_guard_db"

def reset_system():
    # 1. Connect to Database
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    print(f"⚠️  WARNING: You are about to wipe the database '{DB_NAME}' and all uploaded files.")
    confirm = input("Type 'yes' to confirm Factory Reset: ")

    if confirm.lower() != "yes":
        print("❌ Reset Cancelled.")
        return

    # 2. Drop Collections (Clear Data)
    print("\n🧹 Clearing Database...")
    db.contracts.drop()
    print("   - Contracts collection dropped.")
    
    db.users.drop()
    print("   - Users collection dropped.")

    # 3. Delete Uploaded Files (Clear Storage)
    print("🗑️  Cleaning Uploads Folder...")
    if os.path.exists(UPLOAD_DIR):
        shutil.rmtree(UPLOAD_DIR)
        os.makedirs(UPLOAD_DIR) # Recreate empty folder
        print("   - Uploads folder wiped and recreated.")
    else:
        os.makedirs(UPLOAD_DIR)
        print("   - Uploads folder created.")

    # 4. Re-seed Default Users (Optional but helpful for demos)
    print("🌱 Re-creating Default Users...")
    
    # Default Student
    db.users.insert_one({
        "name": "Demo Student",
        "username": "student1",
        "password": "123",
        "role": "student"
    })
    print("   - Created: student1 / 123")

    # Default Admin
    db.users.insert_one({
        "name": "Compliance Officer",
        "username": "admin1",
        "password": "123",
        "role": "admin"
    })
    print("   - Created: admin1 / 123")

    print("\n✅ FACTORY RESET COMPLETE. You are ready for a fresh demo!")

if __name__ == "__main__":
    reset_system()