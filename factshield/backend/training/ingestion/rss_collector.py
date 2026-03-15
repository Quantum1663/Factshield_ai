import feedparser

RSS_FEEDS = [
    "http://rss.cnn.com/rss/edition.rss",
    "http://feeds.bbci.co.uk/news/rss.xml",
    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms"
]

def fetch_rss():

    articles = []

    for url in RSS_FEEDS:

        feed = feedparser.parse(url)

        for entry in feed.entries:

            title = getattr(entry, "title", "")
            summary = getattr(entry, "summary", "")
            link = getattr(entry, "link", "")

            articles.append({
                "title": title,
                "content": summary,
                "source": url,
                "url": link,
                "type": "news"
            })

    return articles