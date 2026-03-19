import logging
import ipaddress
from urllib.parse import urlparse
from newspaper import Article, Config
import tldextract

logger = logging.getLogger(__name__)

BLOCKED_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "[::1]"}


def _is_safe_url(url):
    """Validate URL to prevent SSRF attacks against internal networks."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname or ""
        if hostname in BLOCKED_HOSTS or hostname.endswith(".local") or hostname.endswith(".internal"):
            return False
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return False
        except ValueError:
            pass
        return True
    except Exception:
        return False


def scrape_article(url):
    if not _is_safe_url(url):
        logger.warning(f"Blocked potentially unsafe URL: {url}")
        return None

    try:
        config = Config()
        config.request_timeout = 5
        config.browser_user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

        article = Article(url, config=config)
        article.download()
        article.parse()

        domain = tldextract.extract(url).domain
        publish_date = article.publish_date.isoformat() if article.publish_date else None

        logger.info(f"Scraped text length: {len(article.text)} from {domain}")

        return {
            "text": article.text,
            "url": url,
            "source": domain,
            "date": publish_date
        }

    except Exception as e:
        logger.error(f"Scraping failed for {url}: {e}")
        return None
