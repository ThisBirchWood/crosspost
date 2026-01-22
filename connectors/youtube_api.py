import os
import datetime

from dotenv import load_dotenv
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from dto.post import Post
from dto.comment import Comment

load_dotenv()

API_KEY = os.getenv("YOUTUBE_API_KEY")

class YouTubeAPI:
    def __init__(self):
        self.youtube = build('youtube', 'v3', developerKey=API_KEY)

    def search_videos(self, query, limit):
        request = self.youtube.search().list(
            q=query,
            part='snippet',
            type='video',
            maxResults=limit
        )
        response = request.execute()
        return response.get('items', [])
    
    def get_video_comments(self, video_id, limit):
        request = self.youtube.commentThreads().list(
            part='snippet',
            videoId=video_id,
            maxResults=limit,
            textFormat='plainText'
        )

        try:
            response = request.execute()
        except HttpError as e:
            print(f"Error fetching comments for video {video_id}: {e}")
            return []
        return response.get('items', [])
    
    def fetch_and_parse_videos(self, query, video_limit, comment_limit):
        videos = self.search_videos(query, video_limit)
        posts = []

        for video in videos:
            video_id = video['id']['videoId']
            snippet = video['snippet']
            title = snippet['title']
            description = snippet['description']
            published_at = datetime.datetime.strptime(snippet['publishedAt'], "%Y-%m-%dT%H:%M:%SZ").timestamp()
            channel_title = snippet['channelTitle']

            post = Post(
                id=video_id,
                content=f"{title}\n\n{description}",
                author=channel_title,
                timestamp=published_at,
                url=f"https://www.youtube.com/watch?v={video_id}",
                title=title,
                source="YouTube"
            )

            post.comments = []
            comments_data = self.get_video_comments(video_id, comment_limit)
            for comment_thread in comments_data:
                comment_snippet = comment_thread['snippet']['topLevelComment']['snippet']
                comment = Comment(
                    id=comment_thread['id'],
                    post_id=video_id,
                    content=comment_snippet['textDisplay'],
                    author=comment_snippet['authorDisplayName'],
                    timestamp=comment_snippet['publishedAt'],
                    reply_to=None,
                    source="YouTube"
                )
                post.comments.append(comment)

            posts.append(post)

        return posts