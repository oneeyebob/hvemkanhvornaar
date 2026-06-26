-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for admin-created users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, -- Store hashed passwords only
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Polls table (for date polls)
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  dates TEXT[] NOT NULL, -- Array of date strings (e.g., ['2024-10-10', '2024-10-11'])
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Votes table (tracks which user selected which dates)
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  selected_dates TEXT[] NOT NULL, -- Array of date strings
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(poll_id, user_id) -- Prevent duplicate votes per user per poll
);

-- Enable Row-Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users (only admins can read all users)
CREATE POLICY "Allow admins to manage users"
ON users FOR ALL
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for polls (anyone can read, only admins can create)
CREATE POLICY "Allow reading polls"
ON polls FOR SELECT
USING (TRUE);

CREATE POLICY "Allow admins to create polls"
ON polls FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for votes (users can vote, anyone can read)
CREATE POLICY "Allow users to vote"
ON votes FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()));

CREATE POLICY "Allow reading votes"
ON votes FOR SELECT
USING (TRUE);
