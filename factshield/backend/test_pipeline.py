import os
import sys
from pathlib import Path
import json

# Add backend to path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

# Mock the classifier to avoid needing the full BERT model for a quick logic test
# if it's too slow, but here we will try to use the real one if possible.
from models.classifier import classify
from rag.retrieval import retrieve_fact
from models.reasoning import analyze_claim_with_llm

def test_pipeline():
    print("\n--- TESTING FACTSHIELD PIPELINE ---")
    
    # Check for API Key
    if "GROQ_API_KEY" not in os.environ or os.environ["GROQ_API_KEY"] == "dummy_key_to_prevent_crash_if_not_set":
        print("WARNING: GROQ_API_KEY is not set. Llama analysis will fail.")
        # We will still proceed to test RAG retrieval
    
    test_claim = "The Strait of Hormuz is closed due to the Iran conflict."
    
    print(f"1. Testing Classifier for claim: '{test_claim}'")
    try:
        pred = classify(test_claim)
        print(f"   Result: Veracity={pred['veracity']['label']} (Conf: {pred['veracity']['confidence']:.2f})")
    except Exception as e:
        print(f"   Classifier failed: {e}")

    print("\n2. Testing RAG Retrieval (with Cross-Encoder Reranking)...")
    try:
        evidence = retrieve_fact(test_claim, k=3)
        print(f"   Found {len(evidence)} pieces of evidence.")
        for i, ev in enumerate(evidence):
            print(f"   [{i+1}] {ev[:100]}...")
    except Exception as e:
        print(f"   RAG failed: {e}")
        evidence = []

    print("\n3. Testing Llama 3 Analysis (NLI + Reasoning)...")
    try:
        analysis = analyze_claim_with_llm(test_claim, evidence)
        print(f"   Verdict: {analysis.get('verdict')}")
        print(f"   Veracity: {analysis.get('veracity')}")
        print(f"   Reason: {analysis.get('reason')}")
    except Exception as e:
        print(f"   Llama analysis failed: {e}")

if __name__ == "__main__":
    test_pipeline()
