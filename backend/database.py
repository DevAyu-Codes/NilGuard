from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client.nil_guard_db
contracts_collection = db.contracts
users_collection = db.users

# --- SEED DATA (Run this once to create test users) ---
def seed_users():
    if users_collection.count_documents({}) == 0:
        users_collection.insert_many([
            {"username": "student1", "password": "123", "role": "student", "name": "Mike Ross"},
            {"username": "admin1", "password": "123", "role": "admin", "name": "Sports Administrator"}
        ])
        print("Test users created: student1/123 and admin1/123")

seed_users()