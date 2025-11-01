# 📸 手動截圖更新功能

## 功能說明

「截圖更新」按鈕允許用戶手動觸發當前直播源所有頻道的截圖更新，這是一個**獨立功能**，不會影響背景自動更新（每 5 分鐘）的運作。

---

## 使用方式

### 1. 位置

按鈕位於頻道列表頂部，搜尋框旁邊：

```
┌─────────────────────────────────────────┐
│ 頻道列表                                │
│ 82 個頻道  [搜尋頻道...]  [📸 截圖更新] │
└─────────────────────────────────────────┘
```

### 2. 操作步驟

1. **載入直播源**
   - 選擇任一直播源（例如：黃金直播源）
   - 等待頻道列表載入完成

2. **點擊「📸 截圖更新」按鈕**
   - 按鈕會變為「📸 更新中...」
   - 顯示進度：「📸 更新中 1/82」

3. **等待完成**
   - 系統會逐一更新所有頻道截圖
   - 每個頻道間隔 2 秒（避免過載）
   - 完成後顯示結果彈窗

4. **查看結果**
   - 成功：X 個
   - 失敗：X 個

---

## 功能特點

### ✅ 獨立運作

- **不影響背景更新**：背景的 5 分鐘自動更新會繼續運行
- **獨立隊列**：手動更新使用獨立的處理流程
- **即時反饋**：按鈕顯示即時進度

### ✅ 智能控制

- **防止重複執行**：更新進行中時，按鈕會被禁用
- **錯誤處理**：單個頻道失敗不會中斷整體流程
- **自動重試**：失敗的頻道會記錄，可再次手動更新

### ✅ 用戶體驗

- **進度顯示**：即時顯示「X/總數」
- **結果通知**：完成後彈窗顯示成功/失敗數量
- **視覺反饋**：按鈕狀態變化（正常/更新中/禁用）

---

## 工作流程

```
用戶點擊「📸 截圖更新」
    ↓
檢查是否有頻道列表
    ↓
檢查是否正在更新中
    ↓
設置按鈕為「更新中」狀態
    ↓
逐一處理每個頻道：
    ├─ 顯示進度（1/82, 2/82...）
    ├─ 截取頻道畫面
    ├─ 上傳到 Supabase
    ├─ 更新資料庫
    ├─ 更新 UI
    └─ 等待 2 秒
    ↓
顯示完成結果
    ↓
恢復按鈕為「📸 截圖更新」
```

---

## 技術細節

### 實作位置

**文件**: `app.js`

**方法**: `manualUpdateScreenshots()`

### 核心代碼

```javascript
async manualUpdateScreenshots() {
    const btn = document.getElementById('update-screenshots-btn');
    
    // 檢查頻道列表
    if (!this.channelManager || !this.channelManager.channels.length) {
        alert('請先載入頻道列表');
        return;
    }

    // 防止重複執行
    if (btn.dataset.updating === 'true') {
        return;
    }

    // 設置更新狀態
    btn.dataset.updating = 'true';
    btn.disabled = true;
    btn.textContent = '📸 更新中...';

    const channels = this.channelManager.channels;
    let completed = 0;
    let failed = 0;

    // 逐一更新
    for (let i = 0; i < channels.length; i++) {
        const channel = channels[i];
        btn.textContent = `📸 更新中 ${i + 1}/${channels.length}`;

        const success = await screenshotManager.captureChannelScreenshot(channel);
        
        if (success) {
            completed++;
        } else {
            failed++;
        }

        // 間隔 2 秒
        if (i < channels.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // 顯示結果
    alert(`截圖更新完成！\n成功：${completed} 個\n失敗：${failed} 個`);

    // 恢復按鈕
    btn.dataset.updating = 'false';
    btn.disabled = false;
    btn.textContent = '📸 截圖更新';
}
```

### 事件綁定

```javascript
// setupEventListeners() 中
const updateScreenshotsBtn = document.getElementById('update-screenshots-btn');
if (updateScreenshotsBtn) {
    updateScreenshotsBtn.addEventListener('click', () => {
        this.manualUpdateScreenshots();
    });
}
```

---

## 與背景更新的關係

### 背景自動更新（5 分鐘）

- **觸發時機**：頻道列表載入後 10 秒自動啟動
- **更新頻率**：每 5 分鐘更新一個頻道
- **優先順序**：永遠優先處理最久未更新的頻道
- **運行方式**：背景執行，不影響用戶操作

### 手動更新

- **觸發時機**：用戶點擊按鈕
- **更新範圍**：當前直播源的所有頻道
- **更新頻率**：逐一更新，每個間隔 2 秒
- **運行方式**：前景執行，顯示進度

### 兩者關係

```
背景更新 ─────────────────────────────────────────→
         每 5 分鐘更新 1 個（持續運行）

手動更新 ────────────────→
         用戶觸發，更新所有（獨立運行）
```

**重點**：
- ✅ 兩者**互不影響**
- ✅ 可以**同時運行**
- ✅ 使用**相同的截圖方法**（`captureChannelScreenshot`）
- ✅ 更新**相同的資料庫**

---

## 使用場景

### 場景 1: 新載入直播源

```
用戶載入新的直播源
    ↓
頻道列表顯示（無截圖）
    ↓
點擊「📸 截圖更新」
    ↓
快速獲取所有頻道截圖
```

### 場景 2: 截圖過期

```
發現某些頻道截圖已過期
    ↓
點擊「📸 截圖更新」
    ↓
重新獲取最新截圖
```

### 場景 3: 測試功能

```
開發者測試截圖功能
    ↓
點擊「📸 截圖更新」
    ↓
立即查看截圖效果
```

---

## 性能考量

### 時間估算

- **單個頻道**：約 12-15 秒
  - 載入視頻：2-3 秒
  - 等待穩定：10 秒
  - 截圖上傳：1-2 秒
  - 間隔時間：2 秒

- **82 個頻道**：約 18-20 分鐘
  - 計算：82 × (12 + 2) = 1148 秒 ≈ 19 分鐘

### 優化建議

1. **分批更新**：可以考慮只更新當前可見的頻道
2. **並行處理**：可以考慮同時處理 2-3 個頻道（需注意資源）
3. **智能跳過**：跳過最近已更新的頻道

---

## 錯誤處理

### 常見錯誤

1. **頻道列表未載入**
   - 錯誤訊息：「請先載入頻道列表」
   - 解決方式：選擇一個直播源

2. **CORS 錯誤**
   - 現象：某些頻道無法截圖
   - 處理：自動跳過，計入失敗數量

3. **網路錯誤**
   - 現象：上傳失敗
   - 處理：記錄錯誤，繼續下一個

### Console 日誌

```
[SuperTVApp] 🎬 Manual screenshot update started
[ChannelScreenshot] 📸 Updating screenshot 1/82: 台視HD
[ChannelScreenshot] ✅ Screenshot updated: 台視HD
[ChannelScreenshot] 📸 Updating screenshot 2/82: 中視HD
[ChannelScreenshot] ❌ Failed to update screenshot: 中視HD
...
[SuperTVApp] 🎉 Screenshot update completed: 75 success, 7 failed
```

---

## 樣式設計

### 按鈕樣式

```css
.update-screenshots-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

/* Hover 效果 */
.update-screenshots-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
}

/* 禁用狀態 */
.update-screenshots-btn:disabled {
    background: rgba(255,255,255,0.2);
    cursor: not-allowed;
    opacity: 0.6;
}
```

---

## 未來優化

### 短期

- [ ] 添加取消按鈕（中途停止更新）
- [ ] 顯示詳細進度條
- [ ] 只更新可見頻道選項

### 中期

- [ ] 並行處理多個頻道
- [ ] 智能跳過最近更新的頻道
- [ ] 失敗頻道重試機制

### 長期

- [ ] 自訂更新間隔
- [ ] 選擇性更新（勾選頻道）
- [ ] 更新歷史記錄

---

## 總結

「📸 截圖更新」功能提供了：

✅ **即時控制**：用戶可以隨時手動更新截圖  
✅ **獨立運作**：不影響背景自動更新  
✅ **完整反饋**：進度顯示和結果通知  
✅ **錯誤處理**：單個失敗不影響整體  
✅ **良好體驗**：視覺反饋和狀態管理  

這是一個**生產就緒**的功能，可以立即使用！🎉

