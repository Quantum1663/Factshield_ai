import feedparser
import urllib.parse
import logging
import tldextract

logger = logging.getLogger(__name__)

# Source Reliability Index mapping
TRUSTED_SOURCES = {"bbc", "reuters", "apnews", "npr", "nytimes", "washingtonpost"}
UNRELIABLE_SOURCES = {"breitbart", "infowars", "thegatewaypundit"}

def search_news(query):
    # Encode the query safely for a URL
    encoded_query = urllib.parse.quote(query)
    rss_url = f"https://www.bing.com/news/search?q={encoded_query}&format=rss"

    try:
        feed = feedparser.parse(rss_url)
        urls = []

        for entry in feed.entries:
            if hasattr(entry, "link"):
                domain = tldextract.extract(entry.link).domain
                # Filter out known unreliable sources
                if domain in UNRELIABLE_SOURCES:
                    logger.info(f"Skipping unreliable source: {domain}")
                    continue
                urls.append(entry.link)
            
            # Stop when we have enough valid urls
            if len(urls) >= 5:
                break

        logger.info(f"Found {len(urls)} URLs for query: '{query}'")
        return urls

    except Exception as e:
        logger.error(f"Live search failed: {e}")
        return []