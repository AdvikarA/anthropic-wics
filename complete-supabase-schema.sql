-- Complete Supabase Schema for News App
-- This script sets up all tables, RLS policies, and extensions needed

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS public.bias_quotes CASCADE;
DROP TABLE IF EXISTS public.source_bias CASCADE;
DROP TABLE IF EXISTS public.unique_claims CASCADE;
DROP TABLE IF EXISTS public.news_sources CASCADE;
DROP TABLE IF EXISTS public.news_stories CASCADE;

-- Create tables for news stories and related data
-- News stories table
CREATE TABLE IF NOT EXISTS public.news_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  headline TEXT NOT NULL,
  summary TEXT,
  published_at TIMESTAMPTZ,
  full_content TEXT,
  category TEXT,
  main_keywords TEXT[],
  common_facts TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- News sources table
CREATE TABLE IF NOT EXISTS public.news_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES public.news_stories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique claims table
CREATE TABLE IF NOT EXISTS public.unique_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES public.news_stories(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  claims TEXT[],
  bias TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source bias table
CREATE TABLE IF NOT EXISTS public.source_bias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES public.news_stories(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  bias TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bias quotes table
CREATE TABLE IF NOT EXISTS public.bias_quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_bias_id UUID NOT NULL REFERENCES public.source_bias(id) ON DELETE CASCADE,
  quote TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_news_stories_category ON public.news_stories(category);
CREATE INDEX IF NOT EXISTS idx_news_sources_story_id ON public.news_sources(story_id);
CREATE INDEX IF NOT EXISTS idx_unique_claims_story_id ON public.unique_claims(story_id);
CREATE INDEX IF NOT EXISTS idx_source_bias_story_id ON public.source_bias(story_id);
CREATE INDEX IF NOT EXISTS idx_bias_quotes_source_bias_id ON public.bias_quotes(source_bias_id);

-- IMPORTANT: Disable RLS first to avoid conflicts when recreating policies
ALTER TABLE IF EXISTS public.news_stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.news_sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.unique_claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.source_bias DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bias_quotes DISABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow anyone to read news stories" ON public.news_stories;
DROP POLICY IF EXISTS "Allow authenticated users to insert news stories" ON public.news_stories;
DROP POLICY IF EXISTS "Allow service role full access" ON public.news_stories;

DROP POLICY IF EXISTS "Allow anyone to read news sources" ON public.news_sources;
DROP POLICY IF EXISTS "Allow authenticated users to insert news sources" ON public.news_sources;
DROP POLICY IF EXISTS "Allow service role full access to news sources" ON public.news_sources;

DROP POLICY IF EXISTS "Allow anyone to read unique claims" ON public.unique_claims;
DROP POLICY IF EXISTS "Allow authenticated users to insert unique claims" ON public.unique_claims;
DROP POLICY IF EXISTS "Allow service role full access to unique claims" ON public.unique_claims;

DROP POLICY IF EXISTS "Allow anyone to read source bias" ON public.source_bias;
DROP POLICY IF EXISTS "Allow authenticated users to insert source bias" ON public.source_bias;
DROP POLICY IF EXISTS "Allow service role full access to source bias" ON public.source_bias;

DROP POLICY IF EXISTS "Allow anyone to read bias quotes" ON public.bias_quotes;
DROP POLICY IF EXISTS "Allow authenticated users to insert bias quotes" ON public.bias_quotes;
DROP POLICY IF EXISTS "Allow service role full access to bias quotes" ON public.bias_quotes;

-- Enable Row Level Security on all tables
ALTER TABLE public.news_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unique_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_bias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bias_quotes ENABLE ROW LEVEL SECURITY;

-- Create policies for news_stories table
-- Allow public access for reading
CREATE POLICY "Allow anyone to read news stories"
  ON public.news_stories
  FOR SELECT
  USING (true);

-- Allow anon and authenticated users to insert (important for API access)
CREATE POLICY "Allow anon and authenticated to insert news stories"
  ON public.news_stories
  FOR INSERT
  WITH CHECK (true);

-- Allow service role to do everything
CREATE POLICY "Allow service role full access to news stories"
  ON public.news_stories
  USING (auth.role() = 'service_role');

-- Create policies for news_sources table
CREATE POLICY "Allow anyone to read news sources"
  ON public.news_sources
  FOR SELECT
  USING (true);

CREATE POLICY "Allow anon and authenticated to insert news sources"
  ON public.news_sources
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to news sources"
  ON public.news_sources
  USING (auth.role() = 'service_role');

-- Create policies for unique_claims table
CREATE POLICY "Allow anyone to read unique claims"
  ON public.unique_claims
  FOR SELECT
  USING (true);

CREATE POLICY "Allow anon and authenticated to insert unique claims"
  ON public.unique_claims
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to unique claims"
  ON public.unique_claims
  USING (auth.role() = 'service_role');

-- Create policies for source_bias table
CREATE POLICY "Allow anyone to read source bias"
  ON public.source_bias
  FOR SELECT
  USING (true);

CREATE POLICY "Allow anon and authenticated to insert source bias"
  ON public.source_bias
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to source bias"
  ON public.source_bias
  USING (auth.role() = 'service_role');

-- Create policies for bias_quotes table
CREATE POLICY "Allow anyone to read bias quotes"
  ON public.bias_quotes
  FOR SELECT
  USING (true);

CREATE POLICY "Allow anon and authenticated to insert bias quotes"
  ON public.bias_quotes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to bias quotes"
  ON public.bias_quotes
  USING (auth.role() = 'service_role');

-- NextAuth.js Schema (if you're using NextAuth with Supabase)
-- This is based on the standard NextAuth schema

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  email TEXT UNIQUE,
  email_verified TIMESTAMPTZ,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  oauth_token_secret TEXT,
  oauth_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.verification_tokens (
  identifier TEXT,
  token TEXT,
  expires TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (identifier, token)
);

-- Enable RLS on NextAuth tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing NextAuth policies to avoid conflicts
DROP POLICY IF EXISTS "Allow users to read their own data" ON public.users;
DROP POLICY IF EXISTS "Allow service role full access to users" ON public.users;
DROP POLICY IF EXISTS "Allow users to read their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Allow service role full access to accounts" ON public.accounts;
DROP POLICY IF EXISTS "Allow users to read their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Allow service role full access to sessions" ON public.sessions;
DROP POLICY IF EXISTS "Allow service role full access to verification tokens" ON public.verification_tokens;

-- Create policies for NextAuth tables
CREATE POLICY "Allow users to read their own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Allow service role full access to users"
  ON public.users
  USING (auth.role() = 'service_role');

CREATE POLICY "Allow users to read their own accounts"
  ON public.accounts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Allow service role full access to accounts"
  ON public.accounts
  USING (auth.role() = 'service_role');

CREATE POLICY "Allow users to read their own sessions"
  ON public.sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Allow service role full access to sessions"
  ON public.sessions
  USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to verification tokens"
  ON public.verification_tokens
  USING (auth.role() = 'service_role');

-- Create special policy to allow NextAuth.js to work with the anon key
CREATE POLICY "Allow public access for NextAuth.js operations"
  ON public.users
  FOR ALL
  USING (true);

CREATE POLICY "Allow public access for NextAuth.js account operations"
  ON public.accounts
  FOR ALL
  USING (true);

CREATE POLICY "Allow public access for NextAuth.js session operations"
  ON public.sessions
  FOR ALL
  USING (true);

CREATE POLICY "Allow public access for NextAuth.js verification operations"
  ON public.verification_tokens
  FOR ALL
  USING (true);

-- Create indexes for NextAuth tables
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON public.sessions(session_token);

-- Grant necessary permissions to the authenticated and anon roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Final confirmation message
DO $$
BEGIN
  RAISE NOTICE 'Schema setup complete. All tables and policies have been created.';
END $$;
