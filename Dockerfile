# Use slim to reduce size
FROM python:3.13-slim

# Prevent Python from buffering stdout
ENV PYTHONUNBUFFERED=1

# System deps required for psycopg2 + torch
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "main.py"]