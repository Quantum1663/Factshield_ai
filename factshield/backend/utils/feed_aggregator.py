import feedparser
import logging
import random
import uuid
from pathlib import Path

logger = logging.getLogger(__name__)

NEWS_FEEDS = {
    "BBC India": "https://www.bing.com/news/search?q=India+News+BBC&format=rss",
    "The Hindu": "https://www.thehindu.com/news/national/feeder/default.rss",
    "Scroll.in": "https://scroll.in/feed",
    "NDTV": "http://feeds.feedburner.com/ndtvnews-india-news"
}

SOCIAL_SOURCES = [
    {"platform": "X/Twitter", "source": "Trending India"},
    {"platform": "Instagram", "source": "Viral Reels Context"}
]


def get_live_feed():
    feed_items = []

    for source_name, url in NEWS_FEEDS.items():
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:3]:
                feed_items.append({
                    "id": f"news-{uuid.uuid4().hex[:8]}",
                    "type": "NEWS",
                    "source": source_name,
                    "title": entry.title,
                    "description": getattr(entry, 'summary', entry.title),
                    "link": entry.link,
                    "status": "CHECKING",
                    "timestamp": getattr(entry, 'published', "Recent")
                })
        except Exception as e:
            logger.warning(f"Failed to fetch feed from {source_name}: {e}")
            continue

    social_claims = [
        "Viral Reel claiming historical inaccuracies about Gandhi ji partition stance.",
        "X campaign targeting specific community in West Bengal gaining 50k+ shares.",
        "Manipulated video of political rally in UP spreading on WhatsApp.",
        "Religious myth regarding historical monument in Karnataka trending."
    ]

    for claim in social_claims:
        platform = random.choice(SOCIAL_SOURCES)
        feed_items.append({
            "id": f"social-{uuid.uuid4().hex[:8]}",
            "type": "SOCIAL",
            "source": platform["platform"],
            "title": f"Viral {platform['platform']} Alert",
            "description": claim,
            "link": "#",
            "status": "SUSPICIOUS",
            "timestamp": "Trending Now"
        })

    random.shuffle(feed_items)
    return feed_items


if __name__ == "__main__":
    import json
    print(json.dumps(get_live_feed()[:5], indent=2))
