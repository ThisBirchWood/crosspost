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
    topics JSONB,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE events (
    /* Required Fields */
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL,
    type VARCHAR(255) NOT NULL,

    author VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    date DATE NOT NULL,
    dt TIMESTAMP NOT NULL,
    hour INTEGER NOT NULL,
    weekday VARCHAR(255) NOT NULL,

    /* Posts Only */
    title VARCHAR(255),

    /* Comments Only*/
    parent_id VARCHAR(255),
    reply_to VARCHAR(255),
    source VARCHAR(255) NOT NULL,

    /* NLP Fields */
    topic VARCHAR(255),
    topic_confidence FLOAT,

    ner_entities JSONB,

    emotion_anger FLOAT,
    emotion_disgust FLOAT,
    emotion_fear FLOAT,
    emotion_joy FLOAT,
    emotion_sadness FLOAT,

    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
);