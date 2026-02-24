CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE datasets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nlp_completed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL,

    author VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    source VARCHAR(255) NOT NULL,

    topic VARCHAR(255),
    topic_confidence FLOAT,

    ner_entities JSONB,

    emotion_anger FLOAT,
    emotion_disgust FLOAT,
    emotion_fear FLOAT,
    emotion_joy FLOAT,
    emotion_neutral FLOAT,
    emotion_sadness FLOAT,
    emotion_surprise FLOAT,

    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
);

CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL,

    post_id INTEGER NOT NULL,
    author VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    reply_to VARCHAR(255),
    source VARCHAR(255) NOT NULL,

    topic VARCHAR(255),
    topic_confidence FLOAT,

    ner_entities JSONB,

    emotion_anger FLOAT,
    emotion_disgust FLOAT,
    emotion_fear FLOAT,
    emotion_joy FLOAT,
    emotion_neutral FLOAT,
    emotion_sadness FLOAT,
    emotion_surprise FLOAT,

    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
);