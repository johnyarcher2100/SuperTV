# 📸 截圖功能測試指南

## 🎯 當前狀態

由於 CORS（跨域資源共享）限制，直接從視頻流截圖會遇到以下錯誤：

```
SecurityError: Failed to execute 'toBlob' on 'HTMLCanvasElement': 
Tainted canvases may not be exported.
```

## 🔧 臨時解決方案

目前使用**佔位圖生成**方案：
- 生成帶有頻道名稱的漸變背景圖
- 上傳到 Supabase Storage
- 更新資料庫元數據
- 更新 UI 顯示

這個方案可以驗證整個上傳流程是否正常工作。

---

## 🧪 測試步驟

### 1. 重新整理瀏覽器
訪問：http://localhost:3000/

### 2. 選擇直播源
選擇任一直播源（例如：秒開直播源）

### 3. 點擊「📸 截圖更新」按鈕
位置：頻道列表頂部，搜尋框右側

### 4. 觀察 Console 日誌
應該看到：
```
📸 Capturing screenshot for: 台視HD
✅ Screenshot saved and uploaded for: 台視HD
📸 Screenshot updated for channel 1, updating UI...
Updated screenshot for channel 1
```

### 5. 檢查 Supabase Storage
1. 打開 Supabase Dashboard
2. 進入 **Storage** > `channel-screenshots`
3. 查看 `screenshots/` 資料夾
4. 應該看到新上傳的 `.jpg` 文件

### 6. 檢查資料庫記錄
1. 進入 **Table Editor** > `channel_screenshots`
2. 查看記錄
3. 應該看到對應的 `channel_id` 和 `screenshot_url`

### 7. 檢查 UI 更新
- 頻道卡片應該顯示佔位圖（漸變背景 + 頻道名稱）
- 圖片應該淡入顯示

---

## 🐛 CORS 問題說明

### 問題原因
1. 視頻流來自第三方伺服器
2. 這些伺服器沒有設置 CORS 標頭
3. Canvas 無法導出「被污染」的內容

### 嘗試過的方案
1. ❌ 設置 `crossOrigin = 'anonymous'` - 視頻無法載入
2. ❌ 不設置 `crossOrigin` - Canvas 被污染
3. ❌ 使用代理伺服器 - 視頻流本身仍無 CORS 標頭
4. ✅ 生成佔位圖 - 可以驗證上傳流程

---

## 💡 未來解決方案

### 方案 1: 伺服器端截圖
使用 Node.js + Puppeteer 或 FFmpeg 在伺服器端截圖：

```javascript
// 伺服器端 API
app.post('/api/screenshot', async (req, res) => {
    const { channelUrl } = req.body;
    
    // 使用 FFmpeg 截圖
    const screenshot = await ffmpeg(channelUrl)
        .screenshots({
            timestamps: ['00:00:10'],
            filename: 'screenshot.jpg',
            size: '640x360'
        });
    
    // 上傳到 Supabase
    const url = await uploadToSupabase(screenshot);
    
    res.json({ url });
});
```

### 方案 2: 使用主播放器截圖
當用戶正在觀看某個頻道時，從主播放器的視頻元素截圖：

```javascript
// 從主播放器截圖
async captureFromMainPlayer(channelId) {
    const videoElement = document.getElementById('fullscreen-video');
    
    if (videoElement && videoElement.readyState >= 2) {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, 640, 360);
        
        return new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.8);
        });
    }
    
    return null;
}
```

### 方案 3: 使用第三方截圖服務
使用 Screenshot API 服務（例如：ScreenshotOne, ApiFlash）：

```javascript
const screenshotUrl = `https://api.screenshotone.com/take?
    access_key=YOUR_KEY&
    url=${encodeURIComponent(channelUrl)}&
    viewport_width=640&
    viewport_height=360&
    format=jpg`;
```

---

## 📊 當前功能狀態

| 功能 | 狀態 | 說明 |
|------|------|------|
| 生成佔位圖 | ✅ 正常 | 漸變背景 + 頻道名稱 |
| 上傳到 Supabase | ✅ 正常 | Storage + Database |
| UI 更新 | ✅ 正常 | 淡入動畫 |
| 持久化存儲 | ✅ 正常 | 重新載入後仍可用 |
| 真實視頻截圖 | ❌ CORS 限制 | 需要伺服器端方案 |

---

## 🎨 佔位圖效果

```
┌─────────────────────────────┐
│                             │
│         📺                  │
│                             │
│       台視HD                │
│                             │
│   (藍色漸變背景)            │
│                             │
└─────────────────────────────┘
```

---

## 🚀 下一步計劃

1. **短期**：使用佔位圖驗證上傳流程
2. **中期**：實現「從主播放器截圖」功能
3. **長期**：部署伺服器端截圖服務

---

## 📝 測試清單

- [ ] 點擊「📸 截圖更新」按鈕
- [ ] 觀察 Console 日誌（無錯誤）
- [ ] 檢查 Supabase Storage（有新文件）
- [ ] 檢查 Supabase Database（有新記錄）
- [ ] 檢查 UI 更新（顯示佔位圖）
- [ ] 重新載入頁面（截圖仍然顯示）

---

## 🎉 成功標準

如果以上測試都通過，說明：
- ✅ Supabase 連接正常
- ✅ 上傳流程正常
- ✅ 資料庫操作正常
- ✅ UI 更新機制正常
- ✅ 持久化存儲正常

唯一的問題是：**無法截取真實的視頻畫面**（CORS 限制）

這需要使用伺服器端方案來解決。

