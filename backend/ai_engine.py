import os
import google.generativeai as genai
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import traceback
from pypdf import PdfReader

# --- CONFIGURATION ---
# 1. API KEY
GOOGLE_API_KEY = "AIzaSyAfWI75rt1w2ZUHaBIHXOWRpNRs-QxF7VA"  # <--- PASTE KEY HERE
genai.configure(api_key=GOOGLE_API_KEY)

# 2. MODELS
# Chat Model (Google)
chat_model = genai.GenerativeModel('gemini-flash-latest')

# Search Model (Hugging Face)
# This downloads a small, free model to your computer
print("Loading Hugging Face model... (this happens only once)")
embed_model = SentenceTransformer('all-MiniLM-L6-v2') 

# --- KNOWLEDGE BASE LOGIC ---
RULES_FILE = "ncaa_rules.txt"
rules_embeddings = None
rules_chunks = []

def load_knowledge_base():
    """Reads the Rules file and converts it into searchable numbers (vectors)."""
    global rules_embeddings, rules_chunks
    
    if not os.path.exists(RULES_FILE):
        print(f"WARNING: {RULES_FILE} not found! Using hardcoded backup.")
        return

    # Read the text file
    with open(RULES_FILE, 'r') as f:
        text = f.read()
    
    # Split into chunks (Paragraphs)
    # We split by double newline to get separate rules
    rules_chunks = [chunk.strip() for chunk in text.split('\n\n') if chunk.strip()]
    
    # Convert text to numbers using Hugging Face
    print(f"Indexing {len(rules_chunks)} rules from knowledge base...")
    rules_embeddings = embed_model.encode(rules_chunks)
    print("Knowledge Base Ready.")

# Load rules immediately when server starts
load_knowledge_base()

def find_relevant_rules(contract_text):
    """Uses Hugging Face to find the rules that match the contract."""
    if rules_embeddings is None:
        return "No rules database found."

    # 1. Turn the contract text into numbers
    # We only take the first 1000 chars to speed up the search query
    query_embedding = embed_model.encode([contract_text[:1000]])
    
    # 2. Compare contract numbers vs. rule numbers (Cosine Similarity)
    similarities = cosine_similarity(query_embedding, rules_embeddings)[0]
    
    # 3. Get Top 3 most relevant rules
    # This sorts the results by highest match score
    top_indices = np.argsort(similarities)[-3:][::-1]
    
    relevant_text = ""
    for idx in top_indices:
        relevant_text += f"- {rules_chunks[idx]}\n"
        
    return relevant_text

def extract_text_from_pdf(pdf_file):
    reader = PdfReader(pdf_file)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text

def analyze_contract(pdf_file):
    try:
        print(f"Processing: {pdf_file}")
        
        # 1. Read the Student's Contract
        contract_text = extract_text_from_pdf(pdf_file)
        if not contract_text.strip():
            return "Error: Empty or Scanned PDF."

        # 2. SEARCH for relevant laws (Using Hugging Face)
        print("Searching Knowledge Base for relevant policies...")
        relevant_laws = find_relevant_rules(contract_text)
        print(f"Found relevant laws:\n{relevant_laws}")

        # 3. Send relevant laws + Contract to Gemini
        prompt = f"""
        You are an expert legal assistant. Compare the contract below against the provided Specific Rules.
        
        SPECIFIC RELEVANT LAWS:
        {relevant_laws}
        
        STUDENT CONTRACT:
        {contract_text}
        
        TASK:
        Identify violations only based on the "Specific Relevant Laws" provided above.
        Format the output as a clean Markdown table.
        """

        response = chat_model.generate_content(prompt)
        return response.text

    except Exception as e:
        traceback.print_exc()
        return f"System Error: {str(e)}"