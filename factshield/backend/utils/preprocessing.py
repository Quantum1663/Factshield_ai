import re
import logging

logger = logging.getLogger(__name__)


def clean_input_text(text):
    """Basic input text sanitization before pipeline processing."""
    if not text or not isinstance(text, str):
        return ""
    text = text.strip()
    text = re.sub(r'\s+', ' ', text)
    return text
