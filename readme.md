# 🛡️ NIL Guard - Student Athlete Compliance Portal

**NIL Guard** is an AI-powered compliance platform designed to help student-athletes and university compliance officers verify Name, Image, and Likeness (NIL) contracts.

It uses **Retrieval-Augmented Generation (RAG)** to cross-reference uploaded contracts against a database of NCAA rules, identifying "High Risk" clauses (like pay-for-play) instantly.

---

## 🚀 Key Features

* **📄 AI Contract Analysis:** Upload PDF contracts and get an instant risk assessment (Safe / High Risk) using Google Gemini 2.0 & Hugging Face.
* **⚖️ RAG Rule Engine:** Uses a vector database (Hugging Face `all-MiniLM-L6-v2`) to cite specific NCAA violations.
* **👥 Role-Based Access:**
    * **Students:** Upload contracts, view private analysis, and "Submit to Compliance."
    * **Admins:** Review submitted contracts and manage user accounts.
* **🔒 Secure Disclosure:** Contracts remain private drafts until the student explicitly clicks "Send to NILGO."
* **🎨 Modern UI:** Glassmorphism design with Dark Mode support.

# 🛡️ NIL Guard - Student Athlete Compliance Portal

**NIL Guard** is an AI-powered compliance platform designed to help student-athletes and university compliance officers verify Name, Image, and Likeness (NIL) contracts.

It uses **Retrieval-Augmented Generation (RAG)** to cross-reference uploaded contracts against a database of NCAA rules, identifying "High Risk" clauses (like pay-for-play) instantly.

---

## 🚀 Key Features

* **📄 AI Contract Analysis:** Upload PDF contracts and get an instant risk assessment (Safe / High Risk) using Google Gemini 2.0 & Hugging Face.
* **⚖️ RAG Rule Engine:** Uses a vector database (Hugging Face `all-MiniLM-L6-v2`) to cite specific NCAA violations.
* **👥 Role-Based Access:**
    * **Students:** Upload contracts, view private analysis, and "Submit to Compliance."
    * **Admins:** Review submitted contracts and manage user accounts.
* **🔒 Secure Disclosure:** Contracts remain private drafts until the student explicitly clicks "Send to NILGO."
* **🎨 Modern UI:** Glassmorphism design with Dark Mode support.

---

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/nil-guard.git](https://github.com/your-username/nil-guard.git)
cd nil-guard
```
### 2. Database Setup

Make sure MongoDB is running locally.
* Linux: `sudo systemctl start mongod`
* Windows: Open "Services", find MongoDB, and click Start.

### 3. Backend Setup
<b>Linux / macOS</b>
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
<b>Windows (PowerShell)</b>
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt
```

#### ⚠️ Important Configuration:
Open `backend/ai_engine.py` and replace the placeholder API key:
```python
GOOGLE_API_KEY = "PASTE_YOUR_GEMINI_API_KEY_HERE"
```

### 4. Frontend Setup
Open a new terminal window.

```bash
cd frontend
npm install
npm install axios react-markdown remark-gfm
```
---
## 🏃‍♂️ How to Run

You need two terminal windows open (one for Backend, one for Frontend).
### Terminal 1: Backend (FastAPI)

Ensure your virtual environment is activated (`source venv/bin/activate` or `venv\Scripts\activate`).
```bash
cd backend
python main.py
```
Server will start at: `http://localhost:8000`

### Terminal 2: Frontend (React)
```bash
cd frontend
npm run dev
```
App will start at: `http://localhost:5173`

---
## 🧪 Usage Guide

### Default Login Credentials
The system comes pre-seeded with these accounts (after running the reset script):

| Role | Username | Password |
| :--- | :--- | :--- |
| **Student** | `student1` | `123` |
| **Admin** | `admin1` | `123` |

### Workflow
1.  **Log in as Student (`student1`):**
    * Upload a contract PDF.
    * Wait for the AI analysis (High Risk / Safe).
    * Click **"🚀 Send to NILGO"** to submit it to the university.
2.  **Log in as Admin (`admin1`):**
    * View the dashboard. You will see the contract *only* after the student has submitted it.
    * Use the "Create Account" panel to register new students.
    
---
## 🧹 Resetting the System (Demo Mode)

If you want to clear all uploaded files and database entries to start a fresh demonstration:

**Linux / macOS:**
```bash
cd backend
source venv/bin/activate
python reset_db.py
```
**Windows:**
```bash
cd backend
.\venv\Scripts\Activate
python reset_db.py
```
Type `yes` when prompted. This creates a clean slate.

---
## 📜 License

This project is for educational purposes only, created by Ayu Kashyap.