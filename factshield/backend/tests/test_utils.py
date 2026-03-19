"""Tests for utility modules."""
import pytest
from utils.web_scraper import _is_safe_url
from utils.live_search import search_news, UNRELIABLE_SOURCES, TRUSTED_SOURCES


class TestSSRFProtection:
    def test_blocks_localhost(self):
        assert _is_safe_url("http://localhost:8000/admin") is False

    def test_blocks_127(self):
        assert _is_safe_url("http://127.0.0.1/secret") is False

    def test_blocks_private_ip(self):
        assert _is_safe_url("http://192.168.1.1/api") is False
        assert _is_safe_url("http://10.0.0.1/data") is False

    def test_blocks_file_protocol(self):
        assert _is_safe_url("file:///etc/passwd") is False

    def test_allows_public_urls(self):
        assert _is_safe_url("https://www.bbc.com/news") is True
        assert _is_safe_url("https://reuters.com/article") is True

    def test_blocks_local_domain(self):
        assert _is_safe_url("http://internal.local/admin") is False


class TestSourceFiltering:
    def test_unreliable_sources_defined(self):
        assert len(UNRELIABLE_SOURCES) > 0
        assert "infowars" in UNRELIABLE_SOURCES

    def test_trusted_sources_defined(self):
        assert len(TRUSTED_SOURCES) > 0
        assert "reuters" in TRUSTED_SOURCES

    def test_no_overlap_between_trusted_and_unreliable(self):
        assert TRUSTED_SOURCES.isdisjoint(UNRELIABLE_SOURCES)
