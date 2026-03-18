from newspaper import Article, Config
import tldextract

def scrape_article(url):
    try:
        config = Config()
        config.request_timeout = 5  # 5 seconds timeout
        config.browser_user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        
        article = Article(url, config=config)
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
