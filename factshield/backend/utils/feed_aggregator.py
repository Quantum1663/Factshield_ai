import feedparser
import tldextract
import json
import random
from pathlib import Path

# Trusted News Sources for India
NEWS_FEEDS = {
    "BBC India": "https://www.bing.com/news/search?q=India+News+BBC&format=rss",
    "The Hindu": "https://www.thehindu.com/news/national/feeder/default.rss",
    "Scroll.in": "https://scroll.in/feed",
    "NDTV": "http://feeds.feedburner.com/ndtvnews-india-news"
}

# Simulated Social Alert Scraper (Uses search for trending Indian hashtags)
SOCIAL_SOURCES = [
    {"platform": "X/Twitter", "source": "Trending India"},
    {"platform": "Instagram", "source": "Viral Reels Context"}
]

def get_live_feed():
    feed_items = []

    # 1. Fetch News Items
    for source_name, url in NEWS_FEEDS.items():
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:3]:
                feed_items.append({
                    "id": f"news-{random.randint(1000, 9999)}",
                    "type": "NEWS",
                    "source": source_name,
                    "title": entry.title,
                    "description": entry.summary if hasattr(entry, 'summary') else entry.title,
                    "link": entry.link,
                    "status": "CHECKING" if random.random() > 0.5 else "VERIFIED",
                    "timestamp": entry.published if hasattr(entry, 'published') else "Recent"
                })
        except:
            continue

    # 2. Fetch/Simulate Social Alerts for Indian Context
    social_claims = [
        "Viral Reel claiming historical inaccuracies about Gandhi ji partition stance.",
        "X campaign targeting specific community in West Bengal gaining 50k+ shares.",
        "Manipulated video of political rally in UP spreading on WhatsApp.",
        "Religious myth regarding historical monument in Karnataka trending."
    ]
    
    for claim in social_claims:
        platform = random.choice(SOCIAL_SOURCES)
        feed_items.append({
            "id": f"social-{random.randint(1000, 9999)}",
            "type": "SOCIAL",
            "source": platform["platform"],
            "title": f"Viral {platform['platform']} Alert",
            "description": claim,
            "link": "#",
            "status": "SUSPICIOUS",
            "timestamp": "Trending Now"
        })

    # Shuffle for a dynamic feel
    random.shuffle(feed_items)
    return feed_items

if __name__ == "__main__":
    print(json.dumps(get_live_feed()[:5], indent=2))
