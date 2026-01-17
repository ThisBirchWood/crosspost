import requests
import logging
import re

from dto.post import Post
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; ForumScraper/1.0)"
}

class BoardsAPI:
    def __init__(self):
        self.url = "https://www.boards.ie"
        self.source_name = "Boards.ie"

    def get_new_category_posts(self, category: str, limit: int = 100) -> list[Post]:
        urls = []
        current_page = 1

        logger.info(f"Fetching posts from category: {category}")

        while len(urls) < limit:
            url = f"{self.url}/categories/{category}/p{current_page}"
            html = self._fetch_page(url)
            soup = BeautifulSoup(html, "html.parser")

            logger.debug(f"Processing page {current_page} for category {category}")
            for a in soup.select("a.threadbit-threadlink"):
                href = a.get("href")
                if href and len(urls) < limit:
                    urls.append(href)
            
            current_page += 1

        logger.debug(f"Fetched {len(urls)} post URLs from category {category}")

        # Fetch post details for each URL and create Post objects
        posts = []

        for post_url in urls:
            logger.debug(f"Fetching post details from URL: {post_url}")
            html = self._fetch_page(post_url)

            soup = BeautifulSoup(html, "html.parser")
            
            # Author
            author_tag = soup.select_one(".userinfo-username-title")
            author = author_tag.text.strip() if author_tag else None

            # Timestamp
            timestamp_tag = soup.select_one(".postbit-header")
            timestamp = None
            if timestamp_tag:
                match = re.search(r"\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}[AP]M", timestamp_tag.get_text())
                timestamp = match.group(0) if match else None

            # Post ID
            post_link = soup.select_one(".post-couunt .post-link")
            post_num = post_link.get_text(strip=True) if post_link else None

            # Content
            content_tag = soup.select_one(".Message.userContent")
            content = content_tag.get_text(separator="\n", strip=True) if content_tag else None

            # Title
            title_tag = soup.select_one(".PageTitle h1")
            title = title_tag.text.strip() if title_tag else None

            post = Post(
                id=post_num,
                author=author,
                title=title,
                content=content,
                url=post_url,
                timestamp=timestamp,
                source=self.source_name
            )

            posts.append(post)

        return posts

    def _fetch_page(self, url: str) -> str:
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        return response.text

