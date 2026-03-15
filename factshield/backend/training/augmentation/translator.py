from deep_translator import GoogleTranslator

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

        except:
            continue

    return translations