CREATE SCHEMA IF NOT EXISTS ethnograph;

CREATE TABLE IF NOT EXISTS ethnograph.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    created_utc TIMESTAMP NOT NULL,
    karma INTEGER
);

CREATE TABLE IF NOT EXISTS ethnograph.posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES ethnograph.users(id),
    content TEXT NOT NULL,
    created_utc TIMESTAMP NOT NULL
);