/**
 * 截圖伺服器 - 使用 Puppeteer 在伺服器端截圖
 * 這是唯一可以繞過 CORS 限制的方法
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Supabase 配置
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pecxpugndpvmdysyhxha.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlY3hwdWduZHB2bWR5c3loeGhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5ODA4MjMsImV4cCI6MjA3NzU1NjgyM30.HBjqKh1UWz8nPRDW61zizjnYTgSedZCnSe3SQsIcIHU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 配置
const CONFIG = {
    SCREENSHOT_WIDTH: 640,
    SCREENSHOT_HEIGHT: 360,
    WAIT_TIME: 5000, // 等待視頻載入的時間（毫秒）
    STORAGE_BUCKET: 'channel-screenshots'
};

/**
 * 使用 Puppeteer 截取頻道截圖
 */
async function captureChannelScreenshot(channelName, channelUrl) {
    let browser = null;
    
    try {
        console.log(`📸 Starting screenshot capture for: ${channelName}`);
        console.log(`📺 URL: ${channelUrl}`);

        // 啟動瀏覽器
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080',
                '--autoplay-policy=no-user-gesture-required'
            ]
        });

        const page = await browser.newPage();

        // 設置視窗大小為目標截圖大小
        // 這樣視頻會自動縮放到這個尺寸
        await page.setViewport({
            width: CONFIG.SCREENSHOT_WIDTH,
            height: CONFIG.SCREENSHOT_HEIGHT
        });

        // 創建一個簡單的 HTML 頁面來播放視頻
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }
        video {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
</head>
<body>
    <video id="video" autoplay muted playsinline></video>
    <script>
        const video = document.getElementById('video');
        const url = '${channelUrl}';
        
        if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: false
            });
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                video.play();
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
            video.play();
        }
    </script>
</body>
</html>
        `;

        // 載入 HTML
        await page.setContent(html);

        // 等待視頻載入並播放
        console.log(`⏳ Waiting ${CONFIG.WAIT_TIME}ms for video to load...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.WAIT_TIME));

        // 截圖（全頁面截圖）
        // 由於 viewport 已經設置為 640x360，截圖會自動是這個尺寸
        console.log(`📸 Taking screenshot...`);
        const screenshotBuffer = await page.screenshot({
            type: 'jpeg',
            quality: 80,
            fullPage: false // 只截取視窗內容，不包括滾動區域
        });

        console.log(`✅ Screenshot captured: ${screenshotBuffer.length} bytes`);

        // 關閉瀏覽器
        await browser.close();
        browser = null;

        // 上傳到 Supabase
        return await uploadToSupabase(channelName, screenshotBuffer);

    } catch (error) {
        console.error(`❌ Failed to capture screenshot for ${channelName}:`, error);
        if (browser) {
            await browser.close();
        }
        return null;
    }
}

/**
 * 上傳截圖到 Supabase
 */
async function uploadToSupabase(channelName, screenshotBuffer) {
    try {
        const timestamp = Date.now();
        const fileName = `${channelName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.jpg`;
        const filePath = `screenshots/${fileName}`;

        console.log(`📤 Uploading to Supabase: ${filePath}`);

        // 上傳到 Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(CONFIG.STORAGE_BUCKET)
            .upload(filePath, screenshotBuffer, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (uploadError) {
            console.error(`❌ Upload error:`, uploadError);
            return null;
        }

        // 獲取公開 URL
        const { data: urlData } = supabase.storage
            .from(CONFIG.STORAGE_BUCKET)
            .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;
        console.log(`✅ Uploaded successfully: ${publicUrl}`);

        // 記錄到資料庫（可選，如果表結構不匹配則跳過）
        try {
            const { error: dbError } = await supabase
                .from('channel_screenshots')
                .upsert({
                    channel_name: channelName,
                    screenshot_url: publicUrl,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'channel_name'
                });

            if (dbError) {
                console.warn(`⚠️  Database update skipped:`, dbError.message);
            } else {
                console.log(`✅ Database updated for: ${channelName}`);
            }
        } catch (dbError) {
            console.warn(`⚠️  Database update failed:`, dbError.message);
        }

        return publicUrl;

    } catch (error) {
        console.error(`❌ Failed to upload to Supabase:`, error);
        return null;
    }
}

/**
 * 批量截圖
 */
async function batchCaptureScreenshots(channels) {
    console.log(`📸 Starting batch screenshot capture for ${channels.length} channels`);
    
    const results = [];
    
    for (let i = 0; i < channels.length; i++) {
        const channel = channels[i];
        console.log(`\n📸 [${i + 1}/${channels.length}] Processing: ${channel.name}`);
        
        const url = await captureChannelScreenshot(channel.name, channel.url);
        
        results.push({
            name: channel.name,
            url: url,
            success: url !== null
        });
        
        // 每個頻道之間延遲 2 秒
        if (i < channels.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    // 統計結果
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n✅ Batch screenshot complete!`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    
    return results;
}

// 導出函數
export { captureChannelScreenshot, batchCaptureScreenshots };

// 如果直接執行此文件，運行測試
if (import.meta.url === `file://${process.argv[1]}`) {
    // 測試單個頻道
    const testChannel = {
        name: '測試頻道',
        url: 'http://breezy-audrie-zspace-7524863c.koyeb.app/sub?token=leifeng&id=4gtv-4gtv072'
    };
    
    captureChannelScreenshot(testChannel.name, testChannel.url)
        .then(url => {
            console.log(`\n✅ Test complete!`);
            console.log(`   Screenshot URL: ${url}`);
            process.exit(0);
        })
        .catch(error => {
            console.error(`\n❌ Test failed:`, error);
            process.exit(1);
        });
}

