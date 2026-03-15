import requests

API_KEY = "cc1402a2706b4c79a0397af531264aeb"

def fetch_news():

    url = f"https://newsapi.org/v2/everything?q=politics OR religion OR conflict&pageSize=100&language=en&apiKey={API_KEY}"

    response = requests.get(url)

    if response.status_code != 200:
        return []

    data = response.json()

    articles = []

    for article in data["articles"]:

        articles.append({
            "title": article["title"],
            "content": article["description"],
            "source": article["source"]["name"],
            "url": article["url"],
            "type": "news"
        })

    return articles