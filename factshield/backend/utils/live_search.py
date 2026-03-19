import feedparser
import urllib.parse
import logging
import tldextract

logger = logging.getLogger(__name__)

TRUSTED_SOURCES = {"bbc", "reuters", "apnews", "npr", "nytimes", "washingtonpost"}
UNRELIABLE_SOURCES = {"breitbart", "infowars", "thegatewaypundit"}


def search_news(query):
    encoded_query = urllib.parse.quote(query)
    rss_url = f"https://www.bing.com/news/search?q={encoded_query}&format=rss"

    try:
        feed = feedparser.parse(rss_url)
        urls = []

        for entry in feed.entries:
            if hasattr(entry, "link"):
                domain = tldextract.extract(entry.link).domain
                if domain in UNRELIABLE_SOURCES:
                    logger.info(f"Skipping unreliable source: {domain}")
                    continue
                if domain in TRUSTED_SOURCES:
                    urls.insert(0, entry.link)
                else:
                    urls.append(entry.link)

            if len(urls) >= 5:
                break

        logger.info(f"Found {len(urls)} URLs for query: '{query}'")
        return urls

    except Exception as e:
        logger.error(f"Live search failed: {e}")
        return []
