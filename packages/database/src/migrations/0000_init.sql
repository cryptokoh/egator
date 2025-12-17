-- AIeGator Database Initialization
-- Run this before Drizzle migrations to set up extensions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "vector";    -- pgvector for embeddings

-- Create custom types (if needed)
-- CREATE TYPE event_source AS ENUM ('eventbrite', 'ticketmaster', 'meetup', 'yelp', 'allevents', 'bandsintown', 'schema-crawler', 'user');

-- Create embedding vector column type helper
-- Note: After running Drizzle migrations, you may want to alter the embedding column:
-- ALTER TABLE events ADD COLUMN embedding_vector vector(768);
-- UPDATE events SET embedding_vector = embedding::vector WHERE embedding IS NOT NULL;
-- CREATE INDEX events_embedding_idx ON events USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);

-- Create full-text search configuration
-- CREATE TEXT SEARCH CONFIGURATION aiegator (COPY = english);

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aiegator_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aiegator_app;
