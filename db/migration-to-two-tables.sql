-- Migration script to convert from 5-table structure to 2-table structure
-- Run this in the Supabase SQL Editor

-- Create the news_analysis table if it doesn't exist
CREATE TABLE IF NOT EXISTS news_analysis (
  story_id UUID PRIMARY KEY REFERENCES news_stories(id) ON DELETE CASCADE,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  unique_claims JSONB,
  source_bias JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add news_type column to news_stories if it doesn't exist
ALTER TABLE news_stories 
ADD COLUMN IF NOT EXISTS news_type TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_news_analysis_sources ON news_analysis USING GIN (sources jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_news_analysis_source_bias ON news_analysis USING GIN (source_bias jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_news_stories_news_type ON news_stories (news_type);

-- Migrate existing data from the old tables to the new structure
-- This will run for each existing story in news_stories that doesn't have an entry in news_analysis
DO $$
DECLARE
  story_record RECORD;
BEGIN
  FOR story_record IN 
    SELECT ns.id 
    FROM news_stories ns
    LEFT JOIN news_analysis na ON ns.id = na.story_id
    WHERE na.story_id IS NULL
  LOOP
    -- Insert sources
    WITH sources AS (
      SELECT 
        json_agg(
          json_build_object(
            'title', title,
            'source', source,
            'link', link
          )
        ) AS sources_json
      FROM news_sources
      WHERE story_id = story_record.id
    ),
    -- Insert unique claims
    claims AS (
      SELECT 
        json_agg(
          json_build_object(
            'source', source,
            'claims', claims,
            'bias', bias
          )
        ) AS claims_json
      FROM unique_claims
      WHERE story_id = story_record.id
    ),
    -- Insert source bias with quotes
    bias AS (
      SELECT 
        json_agg(
          json_build_object(
            'source', sb.source,
            'bias', sb.bias,
            'quotes', (
              SELECT json_agg(bq.quote)
              FROM bias_quotes bq
              WHERE bq.source_bias_id = sb.id
            )
          )
        ) AS bias_json
      FROM source_bias sb
      WHERE sb.story_id = story_record.id
    )
    INSERT INTO news_analysis (story_id, sources, unique_claims, source_bias)
    SELECT 
      story_record.id,
      COALESCE((SELECT sources_json FROM sources), '[]'::jsonb),
      COALESCE((SELECT claims_json FROM claims), NULL),
      COALESCE((SELECT bias_json FROM bias), NULL);
      
    -- Update the news_type in news_stories
    UPDATE news_stories
    SET news_type = 'static'
    WHERE id = story_record.id AND news_type IS NULL;
  END LOOP;
END
$$;

-- Output success message
SELECT 'Migration completed successfully. New tables: news_stories (with news_type) and news_analysis' AS message;
