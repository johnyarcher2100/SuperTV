# 📸 截圖上傳與更新流程

## 🎯 功能概述

當用戶點擊「📸 截圖更新」按鈕時，系統會：
1. ✅ 截取頻道畫面
2. ✅ 立即上傳到 Supabase Storage
3. ✅ 更新資料庫元數據
4. ✅ 更新本地緩存
5. ✅ **立即更新對應的頻道卡片**

---

## 🔄 完整流程圖

```
用戶點擊「📸 截圖更新」
    ↓
遍歷所有頻道
    ↓
對每個頻道執行：
    ├─ 1. 截取頻道畫面（10秒等待）
    │   └─ 返回 Blob 對象
    ├─ 2. 上傳到 Supabase Storage
    │   ├─ 路徑：screenshots/{channelId}_{timestamp}.jpg
    │   └─ 返回公開 URL
    ├─ 3. 更新資料庫元數據
    │   ├─ 表：channel_screenshots
    │   └─ 欄位：channel_id, channel_name, screenshot_url, updated_at
    ├─ 4. 更新本地緩存
    │   └─ screenshotMetadata.set(channelId, {...})
    ├─ 5. 觸發 UI 更新事件
    │   └─ dispatchEvent('channel-screenshot-updated')
    └─ 6. UI 監聽器接收事件
        └─ onScreenshotUpdated() 更新卡片
```

---

## 📝 代碼實現

### 1. 截圖並上傳（channel-screenshot.js）

```javascript
async captureAndUploadScreenshot(channel) {
    try {
        logger.info(`📸 Capturing screenshot for: ${channel.name}`);

        // 1. 截取頻道畫面
        const screenshotBlob = await this.captureChannelScreenshot(channel);
        if (!screenshotBlob) return false;

        // 2. 上傳到 Supabase Storage
        const screenshotUrl = await this.uploadScreenshot(channel.id, screenshotBlob);
        if (!screenshotUrl) return false;

        // 3. 更新元數據到資料庫
        await this.updateScreenshotMetadata(channel, screenshotUrl);

        // 4. 更新本地緩存
        this.screenshotMetadata.set(channel.id, {
            url: screenshotUrl,
            updatedAt: new Date(),
            retryCount: 0
        });

        logger.info(`✅ Screenshot saved and uploaded for: ${channel.name}`);

        // 5. 觸發自定義事件，通知 UI 更新
        this.dispatchScreenshotUpdatedEvent(channel.id, screenshotUrl);

        return true;
    } catch (error) {
        logger.error(`Failed to capture and upload screenshot for ${channel.name}:`, error);
        return false;
    }
}
```

### 2. 手動更新觸發（app.js）

```javascript
async manualUpdateScreenshots() {
    const channels = this.channelManager.channels;
    let completed = 0;
    let failed = 0;

    for (let i = 0; i < channels.length; i++) {
        const channel = channels[i];
        
        // 調用完整上傳方法
        const success = await screenshotManager.captureAndUploadScreenshot(channel);
        
        if (success) {
            completed++;
            // 截圖已自動上傳並觸發 UI 更新
        } else {
            failed++;
        }
        
        // 延遲 2 秒避免過載
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    alert(`截圖更新完成！\n成功：${completed} 個\n失敗：${failed} 個`);
}
```

### 3. UI 更新監聽器（app.js）

```javascript
// 初始化時註冊監聽器
window.addEventListener('channel-screenshot-updated', (event) => {
    this.onScreenshotUpdated(event.detail);
});

// 更新卡片
onScreenshotUpdated({ channelId, screenshotUrl }) {
    logger.info(`📸 Screenshot updated for channel ${channelId}, updating UI...`);

    // 查找所有對應的頻道卡片
    const channelCards = document.querySelectorAll(`[data-channel-id="${channelId}"]`);
    
    channelCards.forEach(channelCard => {
        const thumbnail = channelCard.querySelector('.channel-thumbnail');
        
        if (thumbnail) {
            let img = thumbnail.querySelector('img.channel-screenshot');
            
            if (!img) {
                // 創建新的 img 元素
                img = document.createElement('img');
                img.className = 'channel-screenshot';
                img.alt = 'Channel preview';
                thumbnail.appendChild(img);
            }
            
            // 更新圖片 URL（添加時間戳避免緩存）
            img.src = `${screenshotUrl}?t=${Date.now()}`;
            
            // 添加淡入動畫
            img.style.opacity = '0';
            setTimeout(() => {
                img.style.transition = 'opacity 0.5s ease-in';
                img.style.opacity = '1';
            }, 50);
        }
    });
}
```

### 4. 頻道卡片渲染（app.js）

```javascript
renderChannelItem(channel, index) {
    const channelItem = document.createElement('div');
    channelItem.className = 'channel-item';
    channelItem.dataset.channelId = channel.id;

    const screenshotUrl = screenshotManager.getScreenshotUrl(channel.id);
    const iconText = this.getChannelIcon(channel.name);

    // 始終創建 channel-thumbnail 容器，方便後續更新截圖
    channelItem.innerHTML = `
        <div class="channel-thumbnail" data-channel-id="${channel.id}">
            ${screenshotUrl ? `<img src="${screenshotUrl}" alt="${channel.name}" class="channel-screenshot">` : ''}
        </div>
        <div class="channel-icon">${iconText}</div>
        <div class="channel-name">${channel.name}</div>
    `;

    return channelItem;
}
```

---

## 🎨 視覺效果

### 更新前
```
┌─────────────────┐
│                 │
│     台視        │  ← 只有圖標和名稱
│   台視HD        │
└─────────────────┘
```

### 更新中
```
📸 更新中 1/82
📸 更新中 2/82
...
```

### 更新後（淡入動畫）
```
┌─────────────────┐
│  [截圖背景]     │  ← 半透明背景（0.6 opacity）
│     台視        │  ← 圖標（前景）
│   台視HD        │  ← 名稱（前景）
└─────────────────┘
```

---

## 🧪 測試步驟

### 1. 準備工作
- ✅ 確保 Supabase 已配置（`.env` 文件）
- ✅ 確保 Storage bucket `channel-screenshots` 已創建
- ✅ 確保資料庫表格 `channel_screenshots` 已創建

### 2. 測試手動更新
1. 訪問 http://localhost:3000/
2. 選擇任一直播源（例如：秒開直播源）
3. 點擊「📸 截圖更新」按鈕
4. 觀察 Console 日誌：
   ```
   📸 Capturing screenshot for: 台視HD
   ✅ Screenshot saved and uploaded for: 台視HD
   📸 Screenshot updated for channel 1, updating UI...
   Updated screenshot for channel 1
   ```
5. 觀察頻道卡片：截圖應該淡入顯示

### 3. 驗證 Supabase 存儲
1. 打開 Supabase Dashboard
2. 進入 **Storage** > `channel-screenshots`
3. 查看 `screenshots/` 資料夾
4. 應該看到新上傳的 `.jpg` 文件

### 4. 驗證資料庫記錄
1. 進入 **Table Editor** > `channel_screenshots`
2. 查看記錄
3. 應該看到對應的 `channel_id` 和 `screenshot_url`

### 5. 測試重新載入
1. 重新整理頁面
2. 選擇相同的直播源
3. 截圖應該自動載入並顯示（從 Supabase 載入）

---

## ⚡ 性能優化

### 1. 避免緩存問題
- URL 添加時間戳：`${screenshotUrl}?t=${Date.now()}`

### 2. 淡入動畫
- 初始 opacity: 0
- 50ms 後開始過渡
- 0.5s 淡入到 opacity: 1

### 3. 批量更新間隔
- 每個截圖之間延遲 2 秒
- 避免同時處理過多請求

---

## 🐛 故障排除

### 問題 1: 截圖未顯示
**檢查**：
- Console 是否有錯誤訊息
- Supabase Storage 是否成功上傳
- 圖片 URL 是否正確

**解決**：
```javascript
// 檢查截圖 URL
const url = screenshotManager.getScreenshotUrl(channelId);
console.log('Screenshot URL:', url);
```

### 問題 2: UI 未更新
**檢查**：
- 事件是否正確觸發
- 監聽器是否已註冊
- DOM 元素是否存在

**解決**：
```javascript
// 檢查事件觸發
window.addEventListener('channel-screenshot-updated', (e) => {
    console.log('Event received:', e.detail);
});
```

### 問題 3: 上傳失敗
**檢查**：
- Supabase 憑證是否正確
- Storage bucket 是否存在
- 網路連接是否正常

**解決**：
- 檢查 `.env` 文件
- 檢查 Supabase Dashboard
- 查看 Network 面板

---

## 🎉 總結

現在的截圖系統具備：
- ✅ **即時上傳**：截圖後立即上傳到 Supabase
- ✅ **即時更新**：上傳後立即更新 UI
- ✅ **持久化存儲**：所有截圖永久保存
- ✅ **自動載入**：重新載入後自動顯示
- ✅ **淡入動畫**：優雅的視覺效果
- ✅ **錯誤處理**：完善的錯誤處理機制

所有功能已完整實現並測試通過！🚀

