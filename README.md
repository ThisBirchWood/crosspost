# crosspost
A web-based analytics platform for exploring online communities. Built as a final year CS project at UCC, crosspost ingests data from Reddit, YouTube, and Boards.ie, runs NLP analysis on it (emotion detection, topic classification, named entity recognition, stance markers), and surfaces the results through an interactive dashboard.
The motivating use case is digital ethnography — studying how people talk, what they talk about, and how culture forms in online spaces. The included dataset is centred on Cork, Ireland.

## What it does
- Fetch posts and comments from Reddit, YouTube, and Boards.ie (or upload your own .jsonl file)
- Normalise everything into a unified schema regardless of source
- Run NLP analysis asynchronously in the background via Celery workers
- Explore results through a tabbed dashboard: temporal patterns, word clouds, emotion breakdowns, user activity, interaction graphs, topic clusters, and more
- Multi-user support — each user has their own datasets, isolated from everyone else

# Prerequisites
- Docker & Docker Compose
- A Reddit App (client id & secret)
- YouTube Data v3 API Key

# Setup
1) **Clone the Repo**
```
git clone https://github.com/your-username/crosspost.git
cd crosspost
```

2) **Configure Enviornment Vars**
```
cp example.env .env
```
Fill in each required empty env. Some are already filled in, these are sensible defaults that usually don't need to be changed

3) **Start everything**
```
docker compose up -d
```

This starts:
- `crosspost_db` — PostgreSQL on port 5432
- `crosspost_redis` — Redis on port 6379
- `crosspost_flask` — Flask API on port 5000
- `crosspost_worker` — Celery worker for background NLP/fetching tasks
- `crosspost_frontend` — Vite dev server on port 5173

# Data Format for Manual Uploads
If you want to upload your own data rather than fetch it via the connectors, the expected format is newline-delimited JSON (.jsonl) where each line is a post object:
```json
{"id": "abc123", "author": "username", "title": "Post title", "content": "Post body", "url": "https://...", "timestamp": 1700000000.0, "source": "reddit", "comments": []}
```

# Notes
- **GPU support**: The Celery worker is configured with `--pool=solo` to avoid memory conflicts when multiple NLP models are loaded. If you have an NVIDIA GPU, uncomment the deploy.resources block in docker-compose.yml and make sure the NVIDIA Container Toolkit is installed.