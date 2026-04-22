"""Tests for FastAPI endpoints."""
import pytest
import json
from unittest.mock import patch, MagicMock

# Patch heavy model imports before importing app
with patch('models.classifier.classify', return_value={"veracity": {"label": "fake", "confidence": 0.8}, "toxicity": {"label": "safe", "confidence": 0.9}}):
    with patch('models.interpretability.explain_prediction', return_value=[]):
        pass

from fastapi.testclient import TestClient
from app import app
from utils.cache_manager import result_cache, rate_limiter


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def clear_rate_limiter():
    rate_limiter._requests.clear()
    result_cache._cache.clear()
    yield


class TestSystemEndpoints:
    def test_system_status(self, client):
        r = client.get("/system-status")
        assert r.status_code == 200
        data = r.json()
        assert data["api_status"] == "running"
        assert "dataset_entries" in data
        assert "faiss_vectors" in data

    def test_neural_stats(self, client):
        r = client.get("/neural-stats")
        assert r.status_code == 200
        data = r.json()
        assert "local_classifier" in data
        assert "reasoner" in data
        assert "retrieval_status" in data
        assert "index_consistent" in data

    def test_retrieval_health(self, client):
        r = client.get("/retrieval-health")
        assert r.status_code == 200
        data = r.json()
        assert "metadata_count" in data
        assert "vector_count" in data
        assert "index_consistent" in data

    def test_feed_returns_list(self, client):
        r = client.get("/feed")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_trending_returns_list(self, client):
        r = client.get("/trending")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_archive_returns_list(self, client):
        r = client.get("/archive")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestVerifyEndpoint:
    def test_verify_returns_task_id(self, client):
        r = client.post("/verify", json={"text": "Test claim for verification"})
        assert r.status_code == 200
        data = r.json()
        assert "task_id" in data
        assert data["status"] == "processing"

    def test_verify_rejects_empty_body(self, client):
        r = client.post("/verify", json={})
        assert r.status_code == 422

    def test_verify_rejects_tiny_claim(self, client):
        r = client.post("/verify", json={"text": "   hi   "})
        assert r.status_code == 400

    def test_task_status_returns_for_valid_id(self, client):
        r = client.post("/verify", json={"text": "Some claim"})
        task_id = r.json()["task_id"]
        r2 = client.get(f"/task-status/{task_id}")
        assert r2.status_code == 200
        assert "status" in r2.json()

    def test_task_status_handles_unknown_id(self, client):
        r = client.get("/task-status/nonexistent-id")
        assert r.status_code == 200
        assert r.json()["status"] == "failed"


class TestRateLimiting:
    def test_rate_limit_allows_normal_usage(self, client):
        for _ in range(5):
            r = client.post("/verify", json={"text": "Rate limit test"})
            assert r.status_code == 200

    def test_rate_limit_blocks_excessive_requests(self, client):
        for _ in range(15):
            client.post("/verify", json={"text": "Spam"})
        r = client.post("/verify", json={"text": "One more"})
        assert r.status_code == 429


class TestImageEndpoint:
    def test_verify_image_rejects_non_image(self, client):
        r = client.post("/verify-image", files={"file": ("test.txt", b"not an image", "text/plain")})
        assert r.status_code == 400


class TestCaching:
    def test_cache_stores_and_retrieves(self):
        result_cache.put("test claim", {"veracity": "fake"})
        cached = result_cache.get("test claim")
        assert cached is not None
        assert cached["veracity"] == "fake"

    def test_cache_is_case_insensitive(self):
        result_cache.put("Test Claim", {"veracity": "real"})
        assert result_cache.get("test claim") is not None

    def test_cache_returns_none_for_unknown(self):
        assert result_cache.get("never seen this claim") is None
