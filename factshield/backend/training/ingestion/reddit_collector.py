import logging
import requests

logger = logging.getLogger(__name__)


def fetch_reddit():
    url = "https://www.reddit.com/r/worldnews.json"
    headers = {"User-Agent": "factshield/1.0 (educational research project)"}

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        posts = response.json().get("data", {}).get("children", [])
        dataset = []

        for post in posts:
            post_data = post.get("data", {})
            dataset.append({
                "title": post_data.get("title", ""),
                "content": post_data.get("selftext", ""),
                "source": "reddit",
                "type": "social"
            })

        return dataset
    except Exception as e:
        logger.error(f"Reddit fetch failed: {e}")
        return []
