# Supabase 設置指南

本指南將幫助你設置 Supabase 後端，實現頻道截圖、用戶收藏、觀看歷史等功能。

## 📋 目錄

1. [創建 Supabase 專案](#1-創建-supabase-專案)
2. [執行資料庫架構](#2-執行資料庫架構)
3. [設置 Storage Bucket](#3-設置-storage-bucket)
4. [配置環境變數](#4-配置環境變數)
5. [測試連接](#5-測試連接)
6. [功能說明](#6-功能說明)

---

## 1. 創建 Supabase 專案

### 步驟：

1. 訪問 [Supabase Dashboard](https://app.supabase.com/)
2. 點擊 **"New Project"**
3. 填寫專案資訊：
   - **Name**: `SuperTV` (或任何你喜歡的名稱)
   - **Database Password**: 設置一個強密碼（請記住！）
   - **Region**: 選擇離你最近的區域（例如：`Southeast Asia (Singapore)`）
4. 點擊 **"Create new project"**
5. 等待專案創建完成（約 2 分鐘）

---

## 2. 執行資料庫架構

### 步驟：

1. 在 Supabase Dashboard 中，點擊左側選單的 **"SQL Editor"**
2. 點擊 **"New query"**
3. 複製 `supabase-schema.sql` 文件的全部內容
4. 貼上到 SQL Editor 中
5. 點擊 **"Run"** 執行

### 驗證：

執行完成後，你應該看到以下表格被創建：

- ✅ `favorites` - 用戶收藏頻道
- ✅ `watch_history` - 觀看歷史
- ✅ `user_settings` - 用戶設定
- ✅ `custom_playlists` - 自訂播放清單
- ✅ `channel_screenshots` - 頻道截圖元數據

你可以在左側選單的 **"Table Editor"** 中查看這些表格。

---

## 3. 設置 Storage Bucket

### 步驟：

1. 在 Supabase Dashboard 中，點擊左側選單的 **"Storage"**
2. 點擊 **"Create a new bucket"**
3. 填寫 Bucket 資訊：
   - **Name**: `channel-screenshots`
   - **Public bucket**: ✅ **勾選**（允許公開訪問截圖）
4. 點擊 **"Create bucket"**

### 設置 Storage 政策：

1. 點擊剛創建的 `channel-screenshots` bucket
2. 點擊 **"Policies"** 標籤
3. 點擊 **"New Policy"**

#### 政策 1：公開讀取

```sql
-- 允許所有人讀取截圖
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'channel-screenshots' );
```

#### 政策 2：認證用戶上傳

```sql
-- 允許認證用戶上傳截圖
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( 
    bucket_id = 'channel-screenshots' 
    AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);
```

#### 政策 3：認證用戶更新

```sql
-- 允許認證用戶更新截圖
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING ( 
    bucket_id = 'channel-screenshots' 
    AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);
```

---

## 4. 配置環境變數

### 步驟：

1. 在 Supabase Dashboard 中，點擊左側選單的 **"Settings"** > **"API"**
2. 複製以下資訊：
   - **Project URL** (例如：`https://xxxxx.supabase.co`)
   - **anon public** key (在 "Project API keys" 區域)

3. 在專案根目錄創建 `.env` 文件（已提供）：

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://pecxpugndpvmdysyhxha.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Debug Mode
VITE_DEBUG=true
```

4. **重要**：將 `.env` 添加到 `.gitignore`（避免洩露密鑰）

```bash
echo ".env" >> .gitignore
```

---

## 5. 測試連接

### 安裝依賴：

```bash
npm install @supabase/supabase-js
```

### 啟動開發伺服器：

```bash
npm run dev
```

### 驗證：

1. 打開瀏覽器開發者工具（F12）
2. 查看 Console，應該看到：
   ```
   [SupabaseClient] Initializing Supabase client...
   [SupabaseClient] Supabase client initialized successfully
   [ChannelScreenshot] Initializing Channel Screenshot Manager...
   [ChannelScreenshot] Channel Screenshot Manager initialized
   ```

3. 選擇一個直播源並載入頻道
4. 等待 10 秒後，應該看到：
   ```
   [SuperTVApp] Screenshot task started in background
   [ChannelScreenshot] 📸 Capturing screenshot for: 台視HD
   ```

---

## 6. 功能說明

### 📸 自動截圖系統

**工作原理：**

1. 用戶載入頻道列表後，系統會在背景啟動截圖任務
2. 每 5 分鐘自動截取一個頻道的畫面
3. 優先更新最久沒有更新的頻道
4. 截圖上傳到 Supabase Storage
5. 元數據存儲到 `channel_screenshots` 表
6. 頻道卡片自動顯示最新截圖

**配置選項：**

在 `channel-screenshot.js` 中可以調整：

```javascript
const CONFIG = {
    SCREENSHOT_INTERVAL: 5 * 60 * 1000, // 截圖間隔（毫秒）
    CAPTURE_DELAY: 10 * 1000, // 載入後等待時間
    MAX_RETRIES: 3, // 最大重試次數
    SCREENSHOT_WIDTH: 640, // 截圖寬度
    SCREENSHOT_HEIGHT: 360, // 截圖高度
    JPEG_QUALITY: 0.8 // JPEG 品質
};
```

### ⭐ 用戶收藏

**使用方式：**

```javascript
import supabaseClient from './supabase-client.js';

// 保存收藏
await supabaseClient.saveFavorite(
    channelId, 
    channelName, 
    channelUrl
);

// 獲取收藏列表
const favorites = await supabaseClient.getFavorites();

// 移除收藏
await supabaseClient.removeFavorite(channelId);
```

### 📊 觀看歷史

**使用方式：**

```javascript
// 保存觀看記錄
await supabaseClient.saveWatchHistory(
    channelId,
    channelName,
    channelUrl,
    duration // 觀看時長（秒）
);

// 獲取觀看歷史
const history = await supabaseClient.getWatchHistory(50); // 最近 50 筆
```

### ⚙️ 用戶設定同步

**使用方式：**

```javascript
// 保存設定到雲端
await supabaseClient.saveSettings({
    volume: 80,
    autoPlay: true,
    preferredEngine: 'hls'
});

// 從雲端載入設定
const settings = await supabaseClient.getSettings();
```

---

## 🔧 故障排除

### 問題 1：截圖無法上傳

**可能原因：**
- Storage bucket 未設置為 public
- Storage 政策未正確配置

**解決方案：**
1. 檢查 bucket 是否為 public
2. 重新執行 Storage 政策 SQL

### 問題 2：CORS 錯誤

**可能原因：**
- Supabase URL 配置錯誤

**解決方案：**
1. 檢查 `.env` 中的 `VITE_SUPABASE_URL` 是否正確
2. 確保 URL 格式為 `https://xxxxx.supabase.co`（不要有尾隨斜線）

### 問題 3：截圖顯示空白

**可能原因：**
- 頻道 URL 有 CORS 限制
- 視頻無法在隱藏元素中播放

**解決方案：**
- 這是正常現象，某些頻道可能無法截圖
- 系統會自動重試，並在失敗後延後處理

---

## 📈 監控和維護

### 查看截圖狀態

在 Supabase Dashboard > Table Editor > `channel_screenshots` 中可以查看：

- 已截圖的頻道數量
- 最後更新時間
- 截圖 URL

### 清理舊截圖

可以設置定時任務清理 30 天前的觀看歷史：

1. 在 Supabase Dashboard > Database > Cron Jobs
2. 創建新任務：

```sql
SELECT cron.schedule(
    'cleanup-old-history',
    '0 2 * * *', -- 每天凌晨 2 點執行
    $$SELECT cleanup_old_watch_history()$$
);
```

---

## 🎉 完成！

現在你的 SuperTV 已經整合了 Supabase 後端，享受以下功能：

- ✅ 自動頻道截圖
- ✅ 跨裝置收藏同步
- ✅ 觀看歷史記錄
- ✅ 雲端設定同步

如有問題，請查看瀏覽器 Console 的日誌輸出。

