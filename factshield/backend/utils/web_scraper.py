from newspaper import Article

def scrape_article(url):

    try:
        article = Article(url)
        article.download()
        article.parse()

        print("DEBUG: Scraped text length:", len(article.text))

        return article.text

    except Exception as e:
        print("DEBUG: Scraping failed:", e)
        return None