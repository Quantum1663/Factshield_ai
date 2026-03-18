from newspaper import Article
import tldextract

def scrape_article(url):
    try:
        article = Article(url)
        article.download()
        article.parse()

        domain = tldextract.extract(url).domain
        publish_date = article.publish_date.isoformat() if article.publish_date else None

        print(f"DEBUG: Scraped text length: {len(article.text)} from {domain}")

        return {
            "text": article.text,
            "url": url,
            "source": domain,
            "date": publish_date
        }

    except Exception as e:
        print("DEBUG: Scraping failed:", e)
        return None
