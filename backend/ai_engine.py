import os
from openai import OpenAI
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import traceback
from pypdf import PdfReader
import re
import requests

# --- CONFIGURATION ---
OPENAI_API_KEY = "PASTE_YOUR_API_KEY_HERE""
openai_client = OpenAI(api_key=OPENAI_API_KEY)

embed_model = SentenceTransformer('all-MiniLM-L6-v2') 

RULES_FILE = "ncaa_rules.txt"
rules_embeddings = None
rules_chunks = []

def load_knowledge_base():
    global rules_embeddings, rules_chunks
    if not os.path.exists(RULES_FILE):
        return
    with open(RULES_FILE, 'r') as f:
        text = f.read()
    rules_chunks = [chunk.strip() for chunk in text.split('\n\n') if chunk.strip()]
    rules_embeddings = embed_model.encode(rules_chunks)
    print(f"Knowledge Base Ready: {len(rules_chunks)} rules indexed.")

load_knowledge_base()

def find_relevant_rules(contract_text):
    if rules_embeddings is None: return "No rules database found."
    query_embedding = embed_model.encode([contract_text[:1000]])
    similarities = cosine_similarity(query_embedding, rules_embeddings)[0]
    top_indices = np.argsort(similarities)[-3:][::-1]
    return "\n".join([f"- {rules_chunks[i]}" for i in top_indices])

def extract_text_from_pdf(pdf_file):
    reader = PdfReader(pdf_file)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text

def analyze_contract(pdf_file):
    try:
        contract_text = extract_text_from_pdf(pdf_file)
        if not contract_text.strip():
            return "Error: Could not read text from PDF."

        relevant_laws = find_relevant_rules(contract_text)

        prompt = f"""
        You are an expert legal assistant. Compare the contract below against the provided Rules.
        
        RELEVANT RULES:
        {relevant_laws}
        
        CONTRACT TEXT:
        {contract_text}
        
        TASK:
        Identify violations based ONLY on the Rules provided.
        Output the result ONLY as a Markdown table with these columns: 'Rule Violated', 'Description', 'Offending Clause'.
        Do not add introductory text. Do not use code blocks. Start directly with the table header.
        """

        print(f"🤖 Analyzing with OpenAI GPT-4o...")
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1
        )
        
        raw_text = response.choices[0].message.content

        # --- CLEANUP LOGIC ---
        clean_text = re.sub(r"^```markdown\s*", "", raw_text, flags=re.MULTILINE)
        clean_text = re.sub(r"^```\s*", "", clean_text, flags=re.MULTILINE)
        clean_text = re.sub(r"```$", "", clean_text, flags=re.MULTILINE)
        
        lines = [line.strip() for line in clean_text.split('\n')]
        return "\n".join(lines)

    except Exception as e:
        traceback.print_exc()
        return f"System Error: {str(e)}"

def upload_to_gofile(file_path):
    """
    Uploads a file to Gofile.io and returns the public download link.
    Works on both Linux and Windows.
    """
    try:
        server_response = requests.get("https://api.gofile.io/servers")
        server_data = server_response.json()
        
        if server_data['status'] != 'ok':
            return None
            
        server = server_data['data']['servers'][0]['name']
        
        with open(file_path, "rb") as f:
            upload_response = requests.post(
                f"https://{server}.gofile.io/uploadFile",
                files={"file": f}
            )
            
        upload_data = upload_response.json()
        
        if upload_data['status'] == 'ok':
            return upload_data['data']['downloadPage']
        else:
            print("Gofile Upload Error:", upload_data)
            return None

    except Exception as e:
        print(f"Gofile Exception: {e}")
        return None
