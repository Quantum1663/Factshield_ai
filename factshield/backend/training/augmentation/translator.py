import logging
from deep_translator import GoogleTranslator

logger = logging.getLogger(__name__)

LANGUAGES = ["hi", "mr", "ur", "bn", "ta"]


def translate_claim(text):
    translations = []

    for lang in LANGUAGES:
        try:
            translated = GoogleTranslator(
                source="auto",
                target=lang
            ).translate(text)

            translations.append({
                "claim": translated,
                "language": lang
            })
        except Exception as e:
            logger.warning(f"Translation to {lang} failed: {e}")
            continue

    return translations
