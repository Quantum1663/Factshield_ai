import feedparser
import urllib.parse
import logging

logger = logging.getLogger(__name__)


def search_news(query):
    # Encode the query safely for a URL
    encoded_query = urllib.parse.quote(query)
    rss_url = f"https://www.bing.com/news/search?q={encoded_query}&format=rss"

    try:
        feed = feedparser.parse(rss_url)
        urls = []

        for entry in feed.entries[:5]:
            if hasattr(entry, "link"):
                urls.append(entry.link)

        logger.info(f"Found {len(urls)} URLs for query: '{query}'")
        return urls

    except Exception as e:
        logger.error(f"Live search failed: {e}")
        return []