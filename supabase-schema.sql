-- SuperTV Supabase Database Schema
-- 在 Supabase SQL Editor 中執行此腳本來創建所需的表

-- ============================================
-- 1. 用戶收藏頻道表 (favorites)
-- ============================================
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    channel_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 確保每個用戶對每個頻道只有一個收藏記錄
    UNIQUE(user_id, channel_id)
);

-- 為 favorites 表創建索引以提升查詢性能
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_updated_at ON public.favorites(updated_at DESC);

-- 啟用 Row Level Security (RLS)
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- RLS 政策：用戶只能查看和修改自己的收藏
CREATE POLICY "Users can view their own favorites"
    ON public.favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
    ON public.favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorites"
    ON public.favorites FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
    ON public.favorites FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 2. 觀看歷史表 (watch_history)
-- ============================================
CREATE TABLE IF NOT EXISTS public.watch_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    channel_url TEXT NOT NULL,
    duration INTEGER DEFAULT 0, -- 觀看時長（秒）
    watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 為 watch_history 表創建索引
CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON public.watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_watched_at ON public.watch_history(watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_history_channel_id ON public.watch_history(channel_id);

-- 啟用 Row Level Security (RLS)
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- RLS 政策：用戶只能查看和修改自己的觀看歷史
CREATE POLICY "Users can view their own watch history"
    ON public.watch_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watch history"
    ON public.watch_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watch history"
    ON public.watch_history FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 3. 用戶設定表 (user_settings)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 為 user_settings 表創建索引
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- 啟用 Row Level Security (RLS)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS 政策：用戶只能查看和修改自己的設定
CREATE POLICY "Users can view their own settings"
    ON public.user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON public.user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON public.user_settings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
    ON public.user_settings FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 4. 自訂播放清單表 (custom_playlists) - 可選
-- ============================================
CREATE TABLE IF NOT EXISTS public.custom_playlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    channels JSONB NOT NULL DEFAULT '[]', -- 頻道列表 JSON
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 為 custom_playlists 表創建索引
CREATE INDEX IF NOT EXISTS idx_custom_playlists_user_id ON public.custom_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_playlists_is_public ON public.custom_playlists(is_public);

-- 啟用 Row Level Security (RLS)
ALTER TABLE public.custom_playlists ENABLE ROW LEVEL SECURITY;

-- RLS 政策：用戶可以查看自己的和公開的播放清單
CREATE POLICY "Users can view their own playlists"
    ON public.custom_playlists FOR SELECT
    USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can insert their own playlists"
    ON public.custom_playlists FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists"
    ON public.custom_playlists FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists"
    ON public.custom_playlists FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 5. 自動更新 updated_at 的觸發器
-- ============================================

-- 創建更新 updated_at 的函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為 favorites 表添加觸發器
DROP TRIGGER IF EXISTS update_favorites_updated_at ON public.favorites;
CREATE TRIGGER update_favorites_updated_at
    BEFORE UPDATE ON public.favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 為 user_settings 表添加觸發器
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 為 custom_playlists 表添加觸發器
DROP TRIGGER IF EXISTS update_custom_playlists_updated_at ON public.custom_playlists;
CREATE TRIGGER update_custom_playlists_updated_at
    BEFORE UPDATE ON public.custom_playlists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. 頻道截圖表 (channel_screenshots)
-- ============================================
CREATE TABLE IF NOT EXISTS public.channel_screenshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id TEXT NOT NULL UNIQUE,
    channel_name TEXT NOT NULL,
    channel_url TEXT NOT NULL,
    screenshot_url TEXT NOT NULL,
    file_size INTEGER, -- 檔案大小（bytes）
    width INTEGER DEFAULT 640,
    height INTEGER DEFAULT 360,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 為 channel_screenshots 表創建索引
CREATE INDEX IF NOT EXISTS idx_channel_screenshots_channel_id ON public.channel_screenshots(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_screenshots_updated_at ON public.channel_screenshots(updated_at ASC);

-- 啟用 Row Level Security (RLS)
ALTER TABLE public.channel_screenshots ENABLE ROW LEVEL SECURITY;

-- RLS 政策：所有人都可以讀取截圖（公開資料）
CREATE POLICY "Anyone can view channel screenshots"
    ON public.channel_screenshots FOR SELECT
    USING (true);

-- RLS 政策：只有認證用戶可以插入/更新截圖（系統自動執行）
CREATE POLICY "Authenticated users can insert screenshots"
    ON public.channel_screenshots FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Authenticated users can update screenshots"
    ON public.channel_screenshots FOR UPDATE
    USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 為 channel_screenshots 表添加觸發器
DROP TRIGGER IF EXISTS update_channel_screenshots_updated_at ON public.channel_screenshots;
CREATE TRIGGER update_channel_screenshots_updated_at
    BEFORE UPDATE ON public.channel_screenshots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. 清理舊觀看歷史的函數（可選）
-- ============================================

-- 創建清理 30 天前觀看歷史的函數
CREATE OR REPLACE FUNCTION cleanup_old_watch_history()
RETURNS void AS $$
BEGIN
    DELETE FROM public.watch_history
    WHERE watched_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 可以設置定時任務來執行此函數
-- 在 Supabase Dashboard > Database > Cron Jobs 中設置

-- ============================================
-- 8. 創建 Storage Bucket
-- ============================================

-- 創建 channel-screenshots bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'channel-screenshots',
    'channel-screenshots',
    true,  -- 公開訪問
    5242880,  -- 5MB = 5 * 1024 * 1024 bytes
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- ============================================
-- 9. 設置 Storage 政策（RLS）
-- ============================================

-- 刪除舊政策（如果存在）
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete" ON storage.objects;

-- 政策 1: 允許所有人讀取（公開訪問）
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'channel-screenshots' );

-- 政策 2: 允許所有人上傳（包括匿名用戶）
CREATE POLICY "Anyone can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'channel-screenshots' );

-- 政策 3: 允許所有人更新
CREATE POLICY "Anyone can update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'channel-screenshots' );

-- 政策 4: 允許所有人刪除（可選）
CREATE POLICY "Anyone can delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'channel-screenshots' );

-- ============================================
-- 10. 驗證安裝
-- ============================================

-- 驗證表是否創建成功
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('favorites', 'watch_history', 'user_settings', 'custom_playlists', 'channel_screenshots')
ORDER BY table_name;

-- 驗證 Storage Bucket 是否創建成功
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets
WHERE id = 'channel-screenshots';

-- 驗證 Storage 政策是否創建成功
SELECT
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname IN ('Public Access', 'Anyone can upload', 'Anyone can update', 'Anyone can delete');

-- ============================================
-- 完成！
-- ============================================

-- 如果以上查詢都返回正確的結果，說明設置成功！
--
-- 預期結果：
-- 1. 應該看到 5 個表格（favorites, watch_history, user_settings, custom_playlists, channel_screenshots）
-- 2. 應該看到 1 個 bucket（channel-screenshots，public = true）
-- 3. 應該看到 4 個 Storage 政策（Public Access, Anyone can upload, Anyone can update, Anyone can delete）

