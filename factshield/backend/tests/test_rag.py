"""Tests for RAG retrieval and vector store."""
import pytest
from rag.retrieval import retrieve_fact


def test_retrieve_fact_returns_list():
    results = retrieve_fact("climate change effects", k=3)
    assert isinstance(results, list)


def test_retrieve_fact_respects_k():
    results = retrieve_fact("India politics election", k=2)
    assert len(results) <= 2


def test_retrieve_fact_returns_strings():
    results = retrieve_fact("COVID vaccine efficacy", k=3)
    for item in results:
        assert isinstance(item, str)


def test_retrieve_fact_handles_empty_query():
    results = retrieve_fact("", k=3)
    assert isinstance(results, list)
