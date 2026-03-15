import re
import emoji


def clean_social_media_text(text):
    if not text:
        return ""

    # 1. Remove HTML tags
    text = re.sub(r'<.*?>', '', text)

    # 2. Remove URLs
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)

    # 3. Handle User Mentions (e.g., @username -> [USER])
    # For hate speech, knowing someone was targeted is useful, but the specific name isn't.
    text = re.sub(r'@\w+', '[USER]', text)

    # 4. Extract or format Hashtags (e.g., #FakeNews -> FakeNews)
    text = re.sub(r'#(\w+)', r'\1', text)

    # 5. Translate Emojis to text (e.g., 😡 -> :enraged_face:)
    # Emojis carry heavy sentiment in hate speech.
    text = emoji.demojize(text)

    # 6. Remove extra whitespace and newlines
    text = re.sub(r'\s+', ' ', text)

    return text.strip()


# Test the function if run directly
if __name__ == "__main__":
    sample_tweet = "OMG @JohnDoe this is the worst news ever! 😡 #FakeNews http://lies.com <br>"
    print(clean_social_media_text(sample_tweet))
    # Expected Output: "OMG [USER] this is the worst news ever! :enraged_face: FakeNews"