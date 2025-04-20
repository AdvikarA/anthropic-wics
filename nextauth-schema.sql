-- NextAuth.js required tables for Supabase

-- Create tables in the public schema
-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  email TEXT UNIQUE,
  email_verified TIMESTAMPTZ,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts table (linked to a user)
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification tokens for email verification, password resets, etc.
CREATE TABLE IF NOT EXISTS public.verification_tokens (
  identifier TEXT,
  token TEXT,
  expires TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (identifier, token)
);

-- Create Row Level Security (RLS) policies
-- Users table policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own data" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Accounts table policies
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accounts are viewable by owner" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Accounts are insertable by owner" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Accounts are updatable by owner" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Accounts are deletable by owner" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- Sessions table policies
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sessions are viewable by owner" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Sessions are insertable by everyone" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Sessions are updatable by owner" ON public.sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Sessions are deletable by owner" ON public.sessions FOR DELETE USING (auth.uid() = user_id);

-- Verification tokens policies
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Verification tokens are viewable by everyone" ON public.verification_tokens FOR SELECT USING (true);
CREATE POLICY "Verification tokens are insertable by everyone" ON public.verification_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Verification tokens are updatable by everyone" ON public.verification_tokens FOR UPDATE USING (true);
CREATE POLICY "Verification tokens are deletable by everyone" ON public.verification_tokens FOR DELETE USING (true);
