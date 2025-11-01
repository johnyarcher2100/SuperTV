# 📋 Supabase 完整設置指南

## 🎯 必要步驟

### 步驟 1: 創建資料庫表格

1. 打開 **Supabase Dashboard**：https://app.supabase.com/
2. 選擇你的專案：`pecxpugndpvmdysyhxha`
3. 進入 **SQL Editor**（左側選單）
4. 點擊 **New Query**
5. 複製 `supabase-schema.sql` 的內容並貼上
6. 點擊 **Run** 執行

**驗證**：
- 進入 **Table Editor**
- 應該看到 `channel_screenshots` 表格

---

### 步驟 2: 創建 Storage Bucket

#### 方法 A: 使用 Dashboard（推薦）

1. 進入 **Storage**（左側選單）
2. 點擊 **Create a new bucket**
3. 填寫資訊：
   - **Name**: `channel-screenshots`
   - **Public bucket**: ✅ **勾選**（重要！）
   - **File size limit**: `5 MB`
   - **Allowed MIME types**: `image/jpeg, image/png`
4. 點擊 **Create bucket**

#### 方法 B: 使用 SQL

在 SQL Editor 中執行：

```sql
-- 創建 bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('channel-screenshots', 'channel-screenshots', true)
ON CONFLICT (id) DO NOTHING;
```

**驗證**：
- 進入 **Storage**
- 應該看到 `channel-screenshots` bucket
- 確認 **Public** 欄位顯示 ✅

---

### 步驟 3: 設置 Storage 政策（RLS）

在 **Storage** > `channel-screenshots` > **Policies** 中添加以下政策：

#### 政策 1: 公開讀取

```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'channel-screenshots' );
```

#### 政策 2: 匿名用戶可上傳

```sql
CREATE POLICY "Anyone can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'channel-screenshots' );
```

#### 政策 3: 匿名用戶可更新

```sql
CREATE POLICY "Anyone can update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'channel-screenshots' );
```

#### 政策 4: 匿名用戶可刪除（可選）

```sql
CREATE POLICY "Anyone can delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'channel-screenshots' );
```

**驗證**：
- 在 **Storage** > `channel-screenshots` > **Policies**
- 應該看到 4 個政策

---

### 步驟 4: 檢查 API 設定

1. 進入 **Settings** > **API**
2. 確認以下資訊：

```
Project URL: https://pecxpugndpvmdysyhxha.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. 確認 `.env` 文件中的值與此相符

---

## 🧪 測試上傳功能

### 測試 1: 手動上傳測試

在瀏覽器 Console 中執行：

```javascript
// 測試 Supabase 連接
const { createClient } = supabase;
const supabaseUrl = 'https://pecxpugndpvmdysyhxha.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlY3hwdWduZHB2bWR5c3loeGhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5ODA4MjMsImV4cCI6MjA3NzU1NjgyM30.HBjqKh1UWz8nPRDW61zizjnYTgSedZCnSe3SQsIcIHU';

const client = createClient(supabaseUrl, supabaseKey);

// 測試上傳
const testBlob = new Blob(['test'], { type: 'text/plain' });
const { data, error } = await client.storage
    .from('channel-screenshots')
    .upload('test/test.txt', testBlob);

console.log('Upload result:', { data, error });
```

**預期結果**：
- `data` 包含上傳的文件資訊
- `error` 為 `null`

**如果出現錯誤**：
- `Bucket not found` → 檢查 bucket 是否已創建
- `new row violates row-level security policy` → 檢查 Storage 政策
- `Invalid API key` → 檢查 `.env` 文件

---

### 測試 2: 資料庫寫入測試

在瀏覽器 Console 中執行：

```javascript
// 測試資料庫寫入
const { data, error } = await client
    .from('channel_screenshots')
    .upsert({
        channel_id: 'test-123',
        channel_name: '測試頻道',
        channel_url: 'http://test.com',
        screenshot_url: 'http://test.com/test.jpg'
    });

console.log('Database result:', { data, error });
```

**預期結果**：
- `data` 包含插入的記錄
- `error` 為 `null`

**如果出現錯誤**：
- `relation "channel_screenshots" does not exist` → 執行 schema SQL
- `new row violates row-level security policy` → 檢查表格政策

---

## 🔍 常見問題排查

### 問題 1: Bucket 不存在

**錯誤訊息**：
```
Bucket not found
```

**解決方法**：
1. 進入 **Storage**
2. 確認 `channel-screenshots` bucket 存在
3. 如果不存在，按照「步驟 2」創建

---

### 問題 2: RLS 政策錯誤

**錯誤訊息**：
```
new row violates row-level security policy
```

**解決方法**：

#### 對於 Storage：
1. 進入 **Storage** > `channel-screenshots` > **Policies**
2. 確認有以下政策：
   - ✅ Public Access (SELECT)
   - ✅ Anyone can upload (INSERT)
   - ✅ Anyone can update (UPDATE)

#### 對於 Database：
1. 進入 **Table Editor** > `channel_screenshots`
2. 點擊右上角的 **RLS** 圖標
3. 確認有以下政策：
   - ✅ Anyone can view channel screenshots (SELECT)
   - ✅ Authenticated users can insert screenshots (INSERT)
   - ✅ Authenticated users can update screenshots (UPDATE)

---

### 問題 3: CORS 錯誤

**錯誤訊息**：
```
Access to fetch at 'https://pecxpugndpvmdysyhxha.supabase.co/...' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**解決方法**：
1. 進入 **Settings** > **API**
2. 確認 **CORS** 設定允許 `http://localhost:3000`
3. 通常 Supabase 預設允許所有來源，不應該有此問題

---

### 問題 4: API Key 無效

**錯誤訊息**：
```
Invalid API key
```

**解決方法**：
1. 進入 **Settings** > **API**
2. 複製 **anon public** key
3. 更新 `.env` 文件中的 `VITE_SUPABASE_ANON_KEY`
4. 重啟開發伺服器：`npm run dev`

---

## 📊 驗證清單

完成以下檢查，確保所有設定正確：

### Database
- [ ] `channel_screenshots` 表格已創建
- [ ] 表格有 RLS 政策（SELECT, INSERT, UPDATE）
- [ ] 可以手動插入測試資料

### Storage
- [ ] `channel-screenshots` bucket 已創建
- [ ] Bucket 設為 **Public**
- [ ] Bucket 有 RLS 政策（SELECT, INSERT, UPDATE）
- [ ] 可以手動上傳測試文件

### API
- [ ] `.env` 文件中的 URL 正確
- [ ] `.env` 文件中的 Key 正確
- [ ] 開發伺服器已重啟

---

## 🎉 完成後測試

1. 重新整理瀏覽器：http://localhost:3000/
2. 選擇直播源
3. 點擊「📸 截圖更新」
4. 打開 Console，應該看到：
   ```
   📸 Capturing screenshot for: 台視HD
   ✅ Screenshot saved and uploaded for: 台視HD
   ```
5. 檢查 Supabase Dashboard：
   - **Storage** > `channel-screenshots` > 應該有新文件
   - **Table Editor** > `channel_screenshots` > 應該有新記錄

---

## 📞 需要幫助？

如果仍然無法上傳，請提供以下資訊：

1. **Console 錯誤訊息**（完整的錯誤日誌）
2. **Supabase Dashboard 截圖**：
   - Storage 頁面
   - Table Editor 頁面
   - Storage Policies 頁面
3. **`.env` 文件內容**（隱藏敏感資訊）

我會根據這些資訊幫你診斷問題！

