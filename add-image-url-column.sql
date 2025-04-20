-- Add image_url column to news_stories table
ALTER TABLE public.news_stories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to news_sources table if it doesn't already exist
-- (The TypeScript interface already has this field)
ALTER TABLE public.news_sources ADD COLUMN IF NOT EXISTS image_url TEXT;
