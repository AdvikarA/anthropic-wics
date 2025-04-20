-- Create tables for news stories and related data

-- News stories table
CREATE TABLE IF NOT EXISTS public.news_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  headline TEXT NOT NULL,
  summary TEXT,
  published_at TIMESTAMPTZ,
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.news_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unique_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_bias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bias_quotes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (read-only)
CREATE POLICY "News stories are viewable by everyone" 
  ON public.news_stories FOR SELECT USING (true);

CREATE POLICY "News sources are viewable by everyone" 
  ON public.news_sources FOR SELECT USING (true);

CREATE POLICY "Unique claims are viewable by everyone" 
  ON public.unique_claims FOR SELECT USING (true);

CREATE POLICY "Source bias is viewable by everyone" 
  ON public.source_bias FOR SELECT USING (true);

CREATE POLICY "Bias quotes are viewable by everyone" 
  ON public.bias_quotes FOR SELECT USING (true);

-- Create policies for authenticated users (full access)
CREATE POLICY "Authenticated users can insert news stories" 
  ON public.news_stories FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update news stories" 
  ON public.news_stories FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete news stories" 
  ON public.news_stories FOR DELETE USING (auth.role() = 'authenticated');

-- Similar policies for other tables
CREATE POLICY "Authenticated users can insert news sources" 
  ON public.news_sources FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert unique claims" 
  ON public.unique_claims FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert source bias" 
  ON public.source_bias FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert bias quotes" 
  ON public.bias_quotes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
