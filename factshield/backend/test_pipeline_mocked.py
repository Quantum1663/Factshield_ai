import os
import sys
from pathlib import Path
import json
from unittest.mock import patch, MagicMock

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from models.classifier import classify
from rag.retrieval import retrieve_fact
from models.reasoning import analyze_claim_with_llm


def test_pipeline_mocked():
    print("\n--- TESTING FACTSHIELD PIPELINE (MOCKED LLM) ---")

    test_claim = "The Strait of Hormuz is closed due to the Iran conflict."

    # 1. Classifier
    print(f"1. Testing Classifier for claim: '{test_claim}'")
    pred = classify(test_claim)
    print(f"   Result: Veracity={pred['veracity']['label']} (Conf: {pred['veracity']['confidence']:.2f})")

    # 2. RAG
    print("\n2. Testing RAG Retrieval (with Cross-Encoder Reranking)...")
    evidence = retrieve_fact(test_claim, k=3)
    print(f"   Found {len(evidence)} pieces of evidence.")
    for i, ev in enumerate(evidence):
        print(f"   [{i + 1}] {ev[:100]}...")

    # 3. Mocked Llama — patch get_groq_client to return a mock client
    print("\n3. Testing Llama 3 Analysis (MOCKED)...")

    mock_response = {
        "verdict": "Supports",
        "veracity": "real",
        "toxicity": "safe",
        "propaganda_anatomy": "The claim uses geopolitical tension framing.",
        "reason": "Retrieved reports confirm the Strait of Hormuz tensions.",
        "historical_context": "Hormuz tensions recur periodically since 1980s."
    }

    mock_msg = MagicMock()
    mock_msg.content = json.dumps(mock_response)
    mock_choice = MagicMock()
    mock_choice.message = mock_msg
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_completion

    with patch('models.reasoning.get_groq_client', return_value=mock_client):
        analysis = analyze_claim_with_llm(test_claim, evidence)
        print(f"   Verdict: {analysis.get('verdict')}")
        print(f"   Veracity: {analysis.get('veracity')}")
        print(f"   Reason: {analysis.get('reason')}")

    print("\n--- TEST COMPLETE ---")


if __name__ == "__main__":
    test_pipeline_mocked()
