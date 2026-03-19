import logging
from langdetect import detect

logger = logging.getLogger(__name__)


def detect_language(text):
    try:
        return detect(text)
    except Exception as e:
        logger.warning(f"Language detection failed: {e}")
        return "unknown"
