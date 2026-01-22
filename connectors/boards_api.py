import datetime
import requests
import logging
import re

from dto.post import Post
from dto.comment import Comment
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; ForumScraper/1.0)"
}

class BoardsAPI:
    def __init__(self):
        self.url = "https://www.boards.ie"
        self.source_name = "Boards.ie"

    def get_new_category_posts(self, category: str, limit: int = 100) -> tuple[list[Post], list[Comment]]:
        urls = []
        current_page = 1

        logger.info(f"Fetching posts from category: {category}")

        while len(urls) < limit:
            url = f"{self.url}/categories/{category}/p{current_page}"
            html = self._fetch_page(url)
            soup = BeautifulSoup(html, "html.parser")

            logger.debug(f"Processing page {current_page} for category {category}")
            for a in soup.select("a.threadbit-threadlink"):
                if len(urls) >= limit:
                    break

                href = a.get("href")
                if href:
                    urls.append(href)
            
            current_page += 1

        logger.debug(f"Fetched {len(urls)} post URLs from category {category}")

        # Fetch post details for each URL and create Post objects
        posts = []
        comments = []

        def fetch_and_parse(post_url):
            html = self._fetch_page(post_url)
            post = self._parse_thread(html, post_url)
            comments = self._parse_comments(post_url, post.id, comment_limit=500)
            return (post, comments)

        with ThreadPoolExecutor(max_workers=30) as executor:
            futures = {executor.submit(fetch_and_parse, url): url for url in urls}

            for i, future in enumerate(as_completed(futures)):
                post_url = futures[future]
                logger.debug(f"Fetching Post {i + 1} / {len(urls)} details from URL: {post_url}")
                try:
                    post, post_comments = future.result()
                    posts.append(post)
                    comments.extend(post_comments)
                except Exception as e:
                    logger.error(f"Error fetching post from {post_url}: {e}")

        return posts, comments


    def _fetch_page(self, url: str) -> str:
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        return response.text

    def _parse_thread(self, html: str, post_url: str) -> Post:
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
            # convert to unix epoch
            timestamp = datetime.datetime.strptime(timestamp, "%d-%m-%Y %I:%M%p").timestamp() if timestamp else None

        # Post ID
        post_num = re.search(r"discussion/(\d+)", post_url)
        post_num = post_num.group(1) if post_num else None

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

        return post

    def _parse_comments(self, url: str, post_id: str, comment_limit: int = 500) -> list[Comment]:
        comments = []
        current_url = url

        while current_url and len(comments) < comment_limit:
            html = self._fetch_page(current_url)
            page_comments = self._parse_page_comments(html, post_id)
            comments.extend(page_comments)

            # Check for next page
            soup = BeautifulSoup(html, "html.parser")
            next_link = soup.find("a", class_="Next")

            if next_link and next_link.get('href'):
                href = next_link.get('href')
                current_url = href if href.startswith('http') else self.url + href
            else:
                current_url = None

        return comments

    def _parse_page_comments(self, html: str, post_id: str) -> list:
        comments = []
        soup = BeautifulSoup(html, "html.parser")
        comment_tags = soup.find_all("li", class_="ItemComment")

        for tag in comment_tags:
            # COmment ID
            comment_id = tag.get("id")

            # Author
            user_elem = tag.find('span', class_='userinfo-username-title')
            username = user_elem.get_text(strip=True) if user_elem else None

            # Timestamp
            date_elem = tag.find('span', class_='DateCreated')
            timestamp = date_elem.get_text(strip=True) if date_elem else None
            timestamp = datetime.datetime.strptime(timestamp, "%d-%m-%Y %I:%M%p").timestamp() if timestamp else None

            # Content
            message_div = tag.find('div', class_='Message userContent')

            if message_div.blockquote:
                message_div.blockquote.decompose()

            content = message_div.get_text(separator="\n", strip=True) if message_div else None

            comment = Comment(
                id=comment_id,
                post_id=post_id,
                author=username,
                content=content,
                timestamp=timestamp,
                reply_to=None,
                source=self.source_name
            )
            comments.append(comment)

        return comments


