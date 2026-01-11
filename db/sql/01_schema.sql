CREATE SCHEMA IF NOT EXISTS ethnograph;

CREATE TABLE IF NOT EXISTS ethnograph.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    created_utc TIMESTAMP NOT NULL,
    karma INTEGER
);

CREATE TABLE IF NOT EXISTS ethnograph.posts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_username VARCHAR(255),
    created_utc TIMESTAMP NOT NULL
);