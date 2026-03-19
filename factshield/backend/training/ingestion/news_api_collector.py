import os
import logging
import requests

logger = logging.getLogger(__name__)

def fetch_news():
    api_key = os.environ.get("NEWSAPI_KEY")
    if not api_key:
        logger.error("NEWSAPI_KEY is not configured in environment variables.")
        return []

    url = f"https://newsapi.org/v2/everything?q=politics OR religion OR conflict&pageSize=100&language=en&apiKey={api_key}"

    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            logger.warning(f"NewsAPI returned status {response.status_code}")
            return []

        data = response.json()
        articles = []

        for article in data.get("articles", []):
            articles.append({
                "title": article.get("title", ""),
                "content": article.get("description", ""),
                "source": article.get("source", {}).get("name", "unknown"),
                "url": article.get("url", ""),
                "type": "news"
            })

        return articles
    except Exception as e:
        logger.error(f"NewsAPI fetch failed: {e}")
        return []