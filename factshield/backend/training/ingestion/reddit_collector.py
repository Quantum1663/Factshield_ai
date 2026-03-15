import requests

def fetch_reddit():

    url = "https://www.reddit.com/r/worldnews.json"

    headers = {"User-Agent": "factshield"}

    response = requests.get(url, headers=headers)

    posts = response.json()["data"]["children"]

    dataset = []

    for post in posts:

        dataset.append({
            "title": post["data"]["title"],
            "content": post["data"]["selftext"],
            "source": "reddit",
            "type": "social"
        })

    return dataset