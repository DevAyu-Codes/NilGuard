import os
from openai import OpenAI
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import traceback
from pypdf import PdfReader

# --- CONFIGURATION ---
<<<<<<< HEAD
# 1. OPENAI KEY (GPT-4o)
OPENAI_API_KEY = "YOUR_API_KEY"
openai_client = OpenAI(api_key=OPENAI_API_KEY)
=======
# 1. API KEY
GOOGLE_API_KEY = "YOUR_API_KEY"
genai.configure(api_key=GOOGLE_API_KEY)
>>>>>>> 9cc5f4aa39e9fa45b4b4cb528679d49382c635db

# 2. EMBEDDING MODEL (Hugging Face - Local)
embed_model = SentenceTransformer('all-MiniLM-L6-v2') 

# --- KNOWLEDGE BASE ---
RULES_FILE = "ncaa_rules.txt"
rules_embeddings = None
rules_chunks = []

def load_knowledge_base():
    global rules_embeddings, rules_chunks
    if not os.path.exists(RULES_FILE):
        return
    with open(RULES_FILE, 'r') as f:
        text = f.read()
    # Split by double newline to get distinct rules
    rules_chunks = [chunk.strip() for chunk in text.split('\n\n') if chunk.strip()]
    rules_embeddings = embed_model.encode(rules_chunks)
    print(f"Knowledge Base Ready: {len(rules_chunks)} rules indexed.")

# Load immediately
load_knowledge_base()

def find_relevant_rules(contract_text):
    if rules_embeddings is None: return "No rules database found."
    
    # Encode the first 1000 chars of the contract for search context
    query_embedding = embed_model.encode([contract_text[:1000]])
    
    # Calculate similarity
    similarities = cosine_similarity(query_embedding, rules_embeddings)[0]
    
    # Get top 3 matches
    top_indices = np.argsort(similarities)[-3:][::-1]
    
    return "\n".join([f"- {rules_chunks[i]}" for i in top_indices])

def extract_text_from_pdf(pdf_file):
    reader = PdfReader(pdf_file)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text

# --- ANALYSIS FUNCTION ---
def analyze_contract(pdf_file):
    try:
        # 1. Extract Text
        contract_text = extract_text_from_pdf(pdf_file)
        if not contract_text.strip():
            return "Error: Could not read text from PDF."

        # 2. RAG Search
        relevant_laws = find_relevant_rules(contract_text)

        # 3. Construct Prompt
        prompt = f"""
        You are an expert legal assistant. Compare the contract below against the provided Rules.
        
        RELEVANT RULES FROM DATABASE:
        {relevant_laws}
        
        CONTRACT TEXT:
        {contract_text}
        
        TASK:
        Identify violations based ONLY on the Rules provided above.
        Format the output as a clean Markdown table with columns: 'Rule Violated', 'Description', and 'Offending Clause'.
        If no violations are found, explicitly state "No Violations Found" in the table.
        """

        # 4. Call GPT-4o
        print(f"🤖 Analyzing with OpenAI GPT-4o...")
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1 # Low temperature for more factual responses
        )
        return response.choices[0].message.content

    except Exception as e:
        traceback.print_exc()
        return f"System Error: {str(e)}"
