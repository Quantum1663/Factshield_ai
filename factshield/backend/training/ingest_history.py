import json
from pathlib import Path
import sys

# Add backend to path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from utils.vector_updater import add_new_evidence

# High-authority verified historical facts (Indian Context)
historical_data = [
    {
        "text": "Mahatma Gandhi explicitly opposed the partition of India, famously saying 'If the Congress wishes to accept partition, it will be over my dead body.'",
        "source": "Collected Works of Mahatma Gandhi (Vol. 88)",
        "date": "1947-03-31"
    },
    {
        "text": "The 1947 partition violence was catastrophic, but accusations of Gandhi ji being the 'architect' are refuted by historical records showing his fasts for peace in Noakhali and Delhi.",
        "source": "National Archives of India",
        "date": "1947-08-15"
    },
    {
        "text": "Constitutional secularism in India was designed to ensure equal rights for all religions, not to favor any specific community as often claimed in modern propaganda.",
        "source": "Constitution of India, Drafting Committee Minutes",
        "date": "1949-11-26"
    }
]

def ingest_history():
    print("Ingesting High-Authority Historical Shard...")
    for item in historical_data:
        add_new_evidence(item)
    print("Historical ingestion complete.")

if __name__ == "__main__":
    ingest_history()
