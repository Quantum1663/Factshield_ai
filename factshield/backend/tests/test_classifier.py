"""Tests for the local XLM-Roberta classifier."""
import pytest
from models.classifier import classify, CLASSES, VERACITY_INDICES, TOXICITY_INDICES


def test_classify_returns_expected_structure():
    result = classify("The sky is blue.")
    assert "veracity" in result
    assert "toxicity" in result
    assert "label" in result["veracity"]
    assert "confidence" in result["veracity"]
    assert "label" in result["toxicity"]
    assert "confidence" in result["toxicity"]


def test_classify_veracity_label_is_valid():
    result = classify("NASA confirmed the moon landing was real.")
    valid_labels = {"real", "fake", "misleading", "unknown"}
    assert result["veracity"]["label"] in valid_labels


def test_classify_toxicity_label_is_valid():
    result = classify("This is a normal news headline.")
    valid_labels = {"hate", "safe", "unknown"}
    assert result["toxicity"]["label"] in valid_labels


def test_classify_confidence_in_range():
    result = classify("Breaking: major earthquake hits Tokyo.")
    v_conf = result["veracity"]["confidence"]
    t_conf = result["toxicity"]["confidence"]
    assert 0.0 <= v_conf <= 1.0, f"Veracity confidence out of range: {v_conf}"
    assert 0.0 <= t_conf <= 1.0, f"Toxicity confidence out of range: {t_conf}"


def test_classify_handles_empty_string():
    result = classify("")
    assert result["veracity"]["label"] in {"real", "fake", "misleading", "unknown"}


def test_classify_handles_long_text():
    long_text = "This is a test sentence. " * 200
    result = classify(long_text)
    assert result["veracity"]["label"] in {"real", "fake", "misleading", "unknown"}
