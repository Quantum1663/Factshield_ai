import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
TRENDING_FILE = BASE_DIR / "data" / "trending_propaganda.json"

# Curated list of high-impact misinformation currently relevant in the Indian context
initial_trends = [
    {
        "id": 1,
        "title": "AI-Generated Political Speeches",
        "description": "Deepfake audio of major politicians making inflammatory communal remarks is circulating on WhatsApp.",
        "tag": "FAKE",
        "impact": "High"
    },
    {
        "id": 2,
        "title": "Historical Revisionism: Gandhi ji",
        "description": "Viral memes claiming Gandhi ji was responsible for specific partition violence are based on doctored quotes.",
        "tag": "MISLEADING",
        "impact": "Medium"
    },
    {
        "id": 3,
        "title": "Fake Schemes targeting Minorities",
        "description": "False news about government withdrawing schemes for specific communities to incite fear.",
        "tag": "FAKE",
        "impact": "High"
    },
    {
        "id": 4,
        "title": "Manipulated Video: Protests",
        "description": "Old footage from other countries being shared as recent protests in Indian cities.",
        "tag": "FAKE",
        "impact": "High"
    }
]

def init_trends():
    if not TRENDING_FILE.exists():
        with open(TRENDING_FILE, "w", encoding="utf-8") as f:
            json.dump(initial_trends, f, indent=2)
        print(f"Created initial trending data at {TRENDING_FILE}")

if __name__ == "__main__":
    init_trends()
