-- ============================================
-- SuperTV Supabase Schema Fix
-- ============================================
-- This script fixes the database schema issues
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Drop existing table if it exists (backup data first!)
-- Uncomment the following line if you want to start fresh
-- DROP TABLE IF EXISTS channel_screenshots CASCADE;

-- 2. Create channel_screenshots table with proper constraints
CREATE TABLE IF NOT EXISTS channel_screenshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_name TEXT NOT NULL,
    channel_url TEXT NOT NULL,
    screenshot_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add unique constraint to prevent duplicate screenshots
    CONSTRAINT unique_channel_screenshot UNIQUE (channel_name, channel_url)
);

-- 3. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_channel_screenshots_name 
ON channel_screenshots(channel_name);

CREATE INDEX IF NOT EXISTS idx_channel_screenshots_updated 
ON channel_screenshots(updated_at DESC);

-- 4. Create or replace function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_channel_screenshots_updated_at ON channel_screenshots;
CREATE TRIGGER update_channel_screenshots_updated_at
    BEFORE UPDATE ON channel_screenshots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Enable Row Level Security (RLS)
ALTER TABLE channel_screenshots ENABLE ROW LEVEL SECURITY;

-- 7. Create policies for public access (adjust as needed)
-- Allow anyone to read screenshots
CREATE POLICY "Allow public read access" 
ON channel_screenshots FOR SELECT 
USING (true);

-- Allow authenticated users to insert/update screenshots
CREATE POLICY "Allow authenticated insert" 
ON channel_screenshots FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow authenticated update" 
ON channel_screenshots FOR UPDATE 
USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 8. Grant permissions
GRANT ALL ON channel_screenshots TO authenticated;
GRANT ALL ON channel_screenshots TO anon;

-- ============================================
-- Verification Queries
-- ============================================
-- Run these to verify the schema is correct:

-- Check table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'channel_screenshots';

-- Check constraints
-- SELECT constraint_name, constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_name = 'channel_screenshots';

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'channel_screenshots';

