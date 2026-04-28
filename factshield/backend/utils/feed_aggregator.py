import feedparser
import logging
import random
import socket
import uuid

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

FALLBACK_NEWS_ITEMS = [
    {
        "source": "BBC India",
        "title": "India has splurged billions on metro trains. But where are the commuters?",
        "description": "Transport spending, commuter reality, and public narrative risk are under review.",
        "link": "https://www.bbc.com",
    },
    {
        "source": "NDTV",
        "title": "UPMSP UP Board 10th, 12th Result 2026 Date Live Updates",
        "description": "Education-result claims and reposted timing rumors remain high-volume verification targets.",
        "link": "https://www.ndtv.com",
    },
    {
        "source": "The Hindu",
        "title": "Policy and misinformation narratives continue to shape election discourse",
        "description": "National policy conversation remains a frequent source of misleading clips and reposted quotes.",
        "link": "https://www.thehindu.com",
    },
]


def _build_feed_item(source_name, entry, status="CHECKING"):
    return {
        "id": f"news-{uuid.uuid4().hex[:8]}",
        "type": "NEWS",
        "source": source_name,
        "title": entry["title"],
        "description": entry["description"],
        "link": entry["link"],
        "status": status,
        "timestamp": entry.get("timestamp", "Recent"),
    }


def _fetch_news_items():
    items = []
    previous_timeout = socket.getdefaulttimeout()
    socket.setdefaulttimeout(2.5)

    try:
        for source_name, url in NEWS_FEEDS.items():
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries[:3]:
                    items.append({
                        "id": f"news-{uuid.uuid4().hex[:8]}",
                        "type": "NEWS",
                        "source": source_name,
                        "title": getattr(entry, "title", "Untitled signal"),
                        "description": getattr(entry, "summary", getattr(entry, "title", "Untitled signal")),
                        "link": getattr(entry, "link", "#"),
                        "status": "CHECKING",
                        "timestamp": getattr(entry, "published", "Recent"),
                    })
            except Exception as e:
                logger.warning(f"Failed to fetch feed from {source_name}: {e}")
                continue
    finally:
        socket.setdefaulttimeout(previous_timeout)

    if items:
        return items

    logger.warning("Live RSS feed fetch returned no items. Using curated fallback feed items.")
    return [_build_feed_item(item["source"], item) for item in FALLBACK_NEWS_ITEMS]


def get_live_feed():
    feed_items = _fetch_news_items()

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
