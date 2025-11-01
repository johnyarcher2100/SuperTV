/**
 * Channel Screenshot Manager
 * 自動在背景截取頻道畫面並上傳到 Supabase Storage
 * 優先更新最久沒有更新的頻道截圖
 */

import { createLogger } from './logger.js';
import supabaseClient from './supabase-client.js';
import Hls from 'hls.js';

const logger = createLogger('ChannelScreenshot');

// 配置
const CONFIG = {
    SCREENSHOT_INTERVAL: 5 * 60 * 1000, // 5 分鐘更新一次
    CAPTURE_DELAY: 10 * 1000, // 載入頻道後等待 10 秒再截圖
    MAX_RETRIES: 3, // 最大重試次數
    SCREENSHOT_WIDTH: 640, // 截圖寬度
    SCREENSHOT_HEIGHT: 360, // 截圖高度
    JPEG_QUALITY: 0.8, // JPEG 品質 (0-1)
    STORAGE_BUCKET: 'channel-screenshots' // Supabase Storage bucket 名稱
};

class ChannelScreenshotManager {
    constructor() {
        this.isRunning = false;
        this.currentTask = null;
        this.screenshotQueue = [];
        this.hiddenVideo = null;
        this.hiddenCanvas = null;
        this.screenshotMetadata = new Map(); // 本地緩存截圖元數據
        this.intervalId = null;
    }

    /**
     * 初始化截圖管理器
     */
    async init() {
        try {
            logger.info('Initializing Channel Screenshot Manager...');

            // 初始化 Supabase
            await supabaseClient.init();

            // 創建隱藏的 video 和 canvas 元素用於截圖
            this.createHiddenElements();

            // 載入截圖元數據
            await this.loadScreenshotMetadata();

            logger.info('Channel Screenshot Manager initialized');
        } catch (error) {
            logger.error('Failed to initialize screenshot manager:', error);
        }
    }

    /**
     * 創建隱藏的 video 和 canvas 元素
     */
    createHiddenElements() {
        // 創建隱藏的 video 元素
        this.hiddenVideo = document.createElement('video');
        this.hiddenVideo.style.cssText = `
            position: fixed;
            top: -9999px;
            left: -9999px;
            width: ${CONFIG.SCREENSHOT_WIDTH}px;
            height: ${CONFIG.SCREENSHOT_HEIGHT}px;
            opacity: 0;
            pointer-events: none;
        `;
        this.hiddenVideo.muted = true;
        this.hiddenVideo.playsInline = true;
        this.hiddenVideo.autoplay = false;
        // 不設置 crossOrigin，避免 CORS 問題
        // this.hiddenVideo.crossOrigin = 'anonymous';
        document.body.appendChild(this.hiddenVideo);

        // 創建隱藏的 canvas 元素
        this.hiddenCanvas = document.createElement('canvas');
        this.hiddenCanvas.width = CONFIG.SCREENSHOT_WIDTH;
        this.hiddenCanvas.height = CONFIG.SCREENSHOT_HEIGHT;
        this.hiddenCanvas.style.cssText = 'display: none;';
        document.body.appendChild(this.hiddenCanvas);

        logger.debug('Hidden video and canvas elements created');
    }

    /**
     * 從 Supabase 載入截圖元數據
     */
    async loadScreenshotMetadata() {
        try {
            logger.info('📥 Loading screenshot metadata from Supabase...');

            const { data, error } = await supabaseClient.supabase
                .from('channel_screenshots')
                .select('*')
                .order('updated_at', { ascending: true });

            if (error) {
                logger.warn('Failed to load screenshot metadata from database:', error.message);
                return;
            }

            // 存儲到本地緩存（使用 channel_name 作為 key）
            this.screenshotMetadata.clear();
            if (data && data.length > 0) {
                logger.info(`📊 Found ${data.length} screenshot records in database`);
                data.forEach(item => {
                    logger.debug(`  - ${item.channel_name}: ${item.screenshot_url}`);
                    this.screenshotMetadata.set(item.channel_name, {
                        url: item.screenshot_url,
                        updatedAt: new Date(item.updated_at),
                        retryCount: 0
                    });
                });
            } else {
                logger.info('📊 No screenshot records found in database');
            }

            logger.info(`✅ Loaded ${this.screenshotMetadata.size} screenshot metadata records`);
        } catch (error) {
            logger.error('Failed to load screenshot metadata:', error);
        }
    }

    /**
     * 開始自動截圖任務
     */
    start(channels) {
        if (this.isRunning) {
            logger.warn('Screenshot manager is already running');
            return;
        }

        this.isRunning = true;
        this.screenshotQueue = this.buildScreenshotQueue(channels);

        logger.info(`Starting screenshot manager with ${this.screenshotQueue.length} channels`);

        // 立即執行第一次截圖
        this.processNextScreenshot();

        // 設置定時器，每 5 分鐘執行一次
        this.intervalId = setInterval(() => {
            this.processNextScreenshot();
        }, CONFIG.SCREENSHOT_INTERVAL);
    }

    /**
     * 停止自動截圖任務
     */
    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        logger.info('Screenshot manager stopped');
    }

    /**
     * 建立截圖隊列（按最久未更新排序）
     */
    buildScreenshotQueue(channels) {
        const queue = channels.map(channel => {
            const metadata = this.screenshotMetadata.get(channel.id);
            return {
                channel,
                lastUpdated: metadata?.updatedAt || new Date(0), // 沒有記錄的設為最舊
                retryCount: metadata?.retryCount || 0
            };
        });

        // 按最久未更新排序
        queue.sort((a, b) => a.lastUpdated - b.lastUpdated);

        return queue;
    }

    /**
     * 處理下一個截圖任務
     */
    async processNextScreenshot() {
        if (!this.isRunning || this.currentTask) {
            return;
        }

        // 重新排序隊列（確保總是處理最舊的）
        this.screenshotQueue.sort((a, b) => a.lastUpdated - b.lastUpdated);

        const task = this.screenshotQueue[0];
        if (!task) {
            logger.debug('Screenshot queue is empty');
            return;
        }

        this.currentTask = task;

        try {
            logger.info(`📸 Capturing screenshot for: ${task.channel.name}`);

            // 截取頻道畫面
            const screenshotBlob = await this.captureChannelScreenshot(task.channel);

            if (screenshotBlob) {
                // 上傳到 Supabase Storage
                const screenshotUrl = await this.uploadScreenshot(task.channel.id, screenshotBlob);

                if (screenshotUrl) {
                    // 更新元數據
                    await this.updateScreenshotMetadata(task.channel, screenshotUrl);

                    // 更新本地緩存
                    this.screenshotMetadata.set(task.channel.id, {
                        url: screenshotUrl,
                        updatedAt: new Date(),
                        retryCount: 0
                    });

                    // 更新任務的最後更新時間
                    task.lastUpdated = new Date();
                    task.retryCount = 0;

                    logger.info(`✅ Screenshot saved for: ${task.channel.name}`);

                    // 觸發自定義事件，通知 UI 更新
                    this.dispatchScreenshotUpdatedEvent(task.channel.id, screenshotUrl);
                }
            }
        } catch (error) {
            logger.error(`Failed to capture screenshot for ${task.channel.name}:`, error);

            // 增加重試計數
            task.retryCount++;

            // 如果重試次數超過限制，延後處理
            if (task.retryCount >= CONFIG.MAX_RETRIES) {
                logger.warn(`Max retries reached for ${task.channel.name}, will retry later`);
                task.lastUpdated = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 小時後再試
                task.retryCount = 0;
            }
        } finally {
            this.currentTask = null;
        }
    }

    /**
     * 截取頻道畫面並上傳到 Supabase（完整流程）
     * @param {Object} channel - 頻道對象
     * @param {HTMLVideoElement} videoElement - 可選的視頻元素（已禁用，因為 CORS 限制）
     * @returns {Promise<boolean>} - 成功返回 true，失敗返回 false
     */
    async captureAndUploadScreenshot(channel, videoElement = null) {
        try {
            logger.info(`📸 Capturing screenshot for: ${channel.name}`);

            // 直接使用伺服器端 API（Puppeteer）
            // 前端截圖因為 CORS 限制已禁用
            logger.debug(`Using screenshot API for: ${channel.name}`);
            const screenshotUrl = await this.captureScreenshotViaAPI(channel);

            if (!screenshotUrl) {
                logger.warn(`❌ Failed to capture screenshot for: ${channel.name}`);
                return false;
            }

            logger.info(`✅ Screenshot captured successfully for: ${channel.name}`);
            logger.info(`✅ Screenshot URL: ${screenshotUrl}`);

            // 更新緩存
            if (this.screenshotMetadata) {
                this.screenshotMetadata.set(channel.name, {
                    channel_name: channel.name,
                    screenshot_url: screenshotUrl,
                    updated_at: new Date().toISOString()
                });
            }

            // 觸發事件通知 UI 更新
            window.dispatchEvent(new CustomEvent('channel-screenshot-updated', {
                detail: {
                    channelName: channel.name,
                    screenshotUrl: screenshotUrl
                }
            }));

            return true;

        } catch (error) {
            logger.error(`Failed to capture and upload screenshot for ${channel.name}:`, error);
            return false;
        }
    }

    /**
     * 從視頻元素直接截圖（前端截圖已禁用，因為 CORS 限制）
     * @param {HTMLVideoElement} video - 視頻元素
     * @param {string} channelName - 頻道名稱
     * @returns {Promise<Blob|null>} - 截圖 Blob 或 null
     */
    async captureFromVideoElement(video, channelName) {
        // 前端截圖因為 CORS 限制無法使用
        // 直接返回 null，讓系統使用伺服器端 API
        logger.debug(`Skipping client-side screenshot due to CORS restrictions`);
        return null;
    }



    /**
     * 使用伺服器端 API 截取視頻畫面（Puppeteer）
     * @param {Object} channel - 頻道對象
     * @returns {Promise<string|null>} - 截圖 URL 或 null
     */
    async captureScreenshotViaAPI(channel) {
        try {
            logger.debug(`Requesting screenshot via API for: ${channel.name}`);

            // 調用截圖 API
            const response = await fetch('/api/screenshot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: channel.url,
                    channelName: channel.name
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error(`Screenshot API error for ${channel.name}:`, response.status, errorText);
                return null;
            }

            const result = await response.json();

            if (!result.success || !result.url) {
                logger.warn(`Screenshot API failed for ${channel.name}`);
                return null;
            }

            logger.info(`✅ Screenshot URL received from API: ${result.url}`);
            return result.url;

        } catch (error) {
            logger.error(`Failed to capture screenshot via API for ${channel.name}:`, error);
            return null;
        }
    }

    /**
     * 上傳並保存截圖（共用邏輯）
     */
    async uploadAndSaveScreenshot(channel, screenshotBlob) {
        try {
            // 1. 上傳到 Supabase Storage
            const screenshotUrl = await this.uploadScreenshot(channel.id, screenshotBlob);

            if (!screenshotUrl) {
                logger.warn(`Failed to upload screenshot for: ${channel.name}`);
                return false;
            }

            // 2. 更新元數據到資料庫
            await this.updateScreenshotMetadata(channel, screenshotUrl);

            // 3. 更新本地緩存
            this.screenshotMetadata.set(channel.id, {
                url: screenshotUrl,
                updatedAt: new Date(),
                retryCount: 0
            });

            logger.info(`✅ Screenshot saved and uploaded for: ${channel.name}`);

            // 4. 觸發自定義事件，通知 UI 更新
            this.dispatchScreenshotUpdatedEvent(channel.id, screenshotUrl);

            return true;
        } catch (error) {
            logger.error(`Failed to upload and save screenshot for ${channel.name}:`, error);
            return false;
        }
    }

    /**
     * 從視頻流截取畫面（使用 HLS.js）
     * @param {Object} channel - 頻道對象
     * @returns {Promise<Blob|null>} - 截圖 Blob 或 null
     */
    async captureScreenshotFromVideo(channel) {
        return new Promise((resolve) => {
            let hls = null;
            let timeout = null;
            let captureTimeout = null;

            const cleanup = () => {
                if (timeout) clearTimeout(timeout);
                if (captureTimeout) clearTimeout(captureTimeout);
                if (hls) {
                    hls.destroy();
                    hls = null;
                }
                if (this.hiddenVideo) {
                    this.hiddenVideo.pause();
                    this.hiddenVideo.src = '';
                    this.hiddenVideo.load();
                }
            };

            try {
                logger.debug(`Loading video for screenshot: ${channel.name}`);

                const video = this.hiddenVideo;
                const canvas = this.hiddenCanvas;

                if (!video || !canvas) {
                    logger.error('Hidden video or canvas not initialized');
                    resolve(null);
                    return;
                }

                // 處理 URL（使用代理避免 CORS 問題）
                let videoUrl = channel.url;
                logger.debug(`Original URL: ${videoUrl}`);

                const needsProxy = this.needsProxy(videoUrl);
                if (needsProxy) {
                    videoUrl = `/api/proxy?url=${encodeURIComponent(videoUrl)}`;
                    logger.debug(`Using proxy URL for screenshot`);
                }

                // 設置總超時（30 秒）
                timeout = setTimeout(() => {
                    logger.warn(`⏱️ Screenshot timeout (30s) for: ${channel.name}`);
                    cleanup();
                    resolve(null);
                }, 30000);

                // 檢查是否為 HLS 串流
                const isHLS = videoUrl.includes('.m3u8') || videoUrl.includes('m3u');
                logger.debug(`Is HLS: ${isHLS}, HLS supported: ${Hls.isSupported()}`);

                if (isHLS && Hls.isSupported()) {
                    logger.debug(`Using HLS.js for: ${channel.name}`);

                    // 使用 HLS.js
                    hls = new Hls({
                        enableWorker: true,
                        lowLatencyMode: false,
                        backBufferLength: 0,
                        maxBufferLength: 10,
                        maxMaxBufferLength: 10,
                        maxBufferSize: 10 * 1000 * 1000,
                        maxBufferHole: 0.5,
                    });

                    hls.on(Hls.Events.ERROR, (event, data) => {
                        logger.error(`HLS error for ${channel.name}:`, data.type, data.details);
                        if (data.fatal) {
                            cleanup();
                            resolve(null);
                        }
                    });

                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        logger.debug(`HLS manifest parsed for: ${channel.name}`);
                        video.play().catch(error => {
                            logger.error(`Failed to play HLS video for ${channel.name}:`, error);
                            cleanup();
                            resolve(null);
                        });
                    });

                    // 當有足夠的數據可以播放時截圖
                    video.oncanplay = () => {
                        logger.debug(`Video can play, waiting for stable frame: ${channel.name}`);

                        // 等待 3 秒讓視頻穩定
                        captureTimeout = setTimeout(() => {
                            this.captureFrame(video, canvas, channel.name)
                                .then(blob => {
                                    cleanup();
                                    resolve(blob);
                                })
                                .catch(error => {
                                    logger.error(`Failed to capture frame: ${channel.name}`, error);
                                    cleanup();
                                    resolve(null);
                                });
                        }, 3000);
                    };

                    hls.loadSource(videoUrl);
                    hls.attachMedia(video);
                    video.muted = true;

                } else {
                    // 使用原生播放器
                    logger.debug(`Using native player for: ${channel.name}`);

                    video.oncanplay = () => {
                        logger.debug(`Video can play, waiting for stable frame: ${channel.name}`);

                        captureTimeout = setTimeout(() => {
                            this.captureFrame(video, canvas, channel.name)
                                .then(blob => {
                                    cleanup();
                                    resolve(blob);
                                })
                                .catch(error => {
                                    logger.error(`Failed to capture frame: ${channel.name}`, error);
                                    cleanup();
                                    resolve(null);
                                });
                        }, 3000);
                    };

                    video.onerror = (event) => {
                        const errorDetails = {
                            networkState: video.networkState,
                            readyState: video.readyState,
                            error: video.error ? {
                                code: video.error.code,
                                message: video.error.message
                            } : 'Unknown error'
                        };
                        logger.error(`Video load error for ${channel.name}:`, errorDetails);
                        cleanup();
                        resolve(null);
                    };

                    video.src = videoUrl;
                    video.muted = true;
                    // 不設置 crossOrigin，避免 CORS 問題
                    // video.crossOrigin = 'anonymous';
                    video.play().catch(error => {
                        logger.error(`Failed to play video for ${channel.name}:`, error);
                        cleanup();
                        resolve(null);
                    });
                }

            } catch (error) {
                logger.error(`Failed to capture screenshot from video for ${channel.name}:`, error);
                cleanup();
                resolve(null);
            }
        });
    }

    /**
     * 從 video 元素截取當前幀
     */
    async captureFrame(video, canvas, channelName) {
        return new Promise((resolve, reject) => {
            try {
                // 繪製視頻幀到 canvas
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, CONFIG.SCREENSHOT_WIDTH, CONFIG.SCREENSHOT_HEIGHT);

                // 轉換為 Blob
                canvas.toBlob(
                    (blob) => {
                        if (blob && blob.size > 1000) { // 確保不是空白圖片
                            logger.debug(`Screenshot captured successfully: ${channelName}, size: ${blob.size} bytes`);
                            resolve(blob);
                        } else {
                            logger.warn(`Screenshot too small or empty: ${channelName}`);
                            resolve(null);
                        }
                    },
                    'image/jpeg',
                    CONFIG.JPEG_QUALITY
                );
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 檢查 URL 是否需要代理
     */
    needsProxy(url) {
        if (!url) return false;

        // 需要代理的域名列表
        const proxyDomains = [
            'smart.pendy.dpdns.org',
            'simate.pendy.dpdns.org',
            '220.134.196.147',
            'breezy-audrie-zspace',
            '晓峰.azip.dpdns.org'
        ];

        return proxyDomains.some(domain => url.includes(domain));
    }

    /**
     * 生成佔位圖（備用方案）
     * @param {Object} channel - 頻道對象
     * @returns {Promise<Blob|null>} - 截圖 Blob 或 null
     */
    async generatePlaceholderScreenshot(channel) {
        return new Promise((resolve) => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = CONFIG.SCREENSHOT_WIDTH;
                canvas.height = CONFIG.SCREENSHOT_HEIGHT;
                const ctx = canvas.getContext('2d');

                // 繪製漸變背景
                const gradient = ctx.createLinearGradient(0, 0, CONFIG.SCREENSHOT_WIDTH, CONFIG.SCREENSHOT_HEIGHT);
                gradient.addColorStop(0, '#1e3c72');
                gradient.addColorStop(1, '#2a5298');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, CONFIG.SCREENSHOT_WIDTH, CONFIG.SCREENSHOT_HEIGHT);

                // 繪製頻道名稱
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 48px Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(channel.name, CONFIG.SCREENSHOT_WIDTH / 2, CONFIG.SCREENSHOT_HEIGHT / 2);

                // 繪製圖標
                ctx.font = '32px Arial, sans-serif';
                ctx.fillText('📺', CONFIG.SCREENSHOT_WIDTH / 2, CONFIG.SCREENSHOT_HEIGHT / 2 - 60);

                // 轉換為 Blob
                canvas.toBlob(
                    (blob) => {
                        resolve(blob);
                    },
                    'image/jpeg',
                    CONFIG.JPEG_QUALITY
                );
            } catch (error) {
                logger.error('Failed to generate placeholder screenshot:', error);
                resolve(null);
            }
        });
    }

    /**
     * 截取頻道畫面（僅截圖，不上傳）
     * @param {Object} channel - 頻道對象
     * @returns {Promise<Blob|null>} - 截圖 Blob 或 null
     */
    async captureChannelScreenshot(channel) {
        return new Promise((resolve) => {
            let timeoutId;
            let playingHandler;
            let errorHandler;

            const cleanup = () => {
                clearTimeout(timeoutId);
                this.hiddenVideo.removeEventListener('playing', playingHandler);
                this.hiddenVideo.removeEventListener('error', errorHandler);
                this.hiddenVideo.removeEventListener('loadeddata', playingHandler);
                this.hiddenVideo.pause();
                this.hiddenVideo.src = '';
                // 清空 canvas
                const ctx = this.hiddenCanvas.getContext('2d');
                ctx.clearRect(0, 0, CONFIG.SCREENSHOT_WIDTH, CONFIG.SCREENSHOT_HEIGHT);
            };

            // 錯誤處理
            errorHandler = () => {
                logger.warn(`Failed to load channel: ${channel.name}`);
                cleanup();
                resolve(null);
            };

            // 截圖函數
            const captureFrame = () => {
                try {
                    const ctx = this.hiddenCanvas.getContext('2d');

                    // 檢查視頻是否有有效的尺寸
                    if (this.hiddenVideo.videoWidth === 0 || this.hiddenVideo.videoHeight === 0) {
                        logger.warn(`Video has no dimensions for: ${channel.name}`);
                        cleanup();
                        resolve(null);
                        return;
                    }

                    // 繪製到 canvas
                    ctx.drawImage(
                        this.hiddenVideo,
                        0, 0,
                        CONFIG.SCREENSHOT_WIDTH,
                        CONFIG.SCREENSHOT_HEIGHT
                    );

                    // 嘗試轉換為 Blob
                    try {
                        this.hiddenCanvas.toBlob(
                            (blob) => {
                                if (blob && blob.size > 0) {
                                    logger.debug(`Screenshot captured: ${blob.size} bytes`);
                                    cleanup();
                                    resolve(blob);
                                } else {
                                    logger.warn(`Empty blob for: ${channel.name}`);
                                    cleanup();
                                    resolve(null);
                                }
                            },
                            'image/jpeg',
                            CONFIG.JPEG_QUALITY
                        );
                    } catch (blobError) {
                        // CORS 錯誤：嘗試使用 toDataURL 作為備選方案
                        logger.warn(`toBlob failed (CORS?), trying toDataURL for: ${channel.name}`);
                        try {
                            const dataUrl = this.hiddenCanvas.toDataURL('image/jpeg', CONFIG.JPEG_QUALITY);
                            // 將 Data URL 轉換為 Blob
                            const blob = this.dataURLToBlob(dataUrl);
                            cleanup();
                            resolve(blob);
                        } catch (dataUrlError) {
                            logger.error(`Both toBlob and toDataURL failed for: ${channel.name}`, dataUrlError);
                            cleanup();
                            resolve(null);
                        }
                    }
                } catch (error) {
                    logger.error('Failed to capture screenshot:', error);
                    cleanup();
                    resolve(null);
                }
            };

            // 播放開始後等待一段時間再截圖
            playingHandler = () => {
                setTimeout(captureFrame, CONFIG.CAPTURE_DELAY);
            };

            // 設置超時（30 秒）
            timeoutId = setTimeout(() => {
                logger.warn(`Timeout capturing screenshot for: ${channel.name}`);
                cleanup();
                resolve(null);
            }, 30000);

            // 監聽事件
            this.hiddenVideo.addEventListener('playing', playingHandler);
            this.hiddenVideo.addEventListener('loadeddata', playingHandler);
            this.hiddenVideo.addEventListener('error', errorHandler);

            // 載入頻道（使用代理）
            const proxyUrl = this.getProxyUrl(channel.url);
            this.hiddenVideo.src = proxyUrl;
            this.hiddenVideo.play().catch(errorHandler);
        });
    }

    /**
     * 獲取代理 URL
     */
    getProxyUrl(url) {
        // 如果 URL 已經是代理 URL，直接返回
        if (url.includes('/api/proxy')) {
            return url;
        }
        // 否則，使用代理
        return `/api/proxy?url=${encodeURIComponent(url)}`;
    }

    /**
     * 將 Data URL 轉換為 Blob
     */
    dataURLToBlob(dataURL) {
        const parts = dataURL.split(',');
        const contentType = parts[0].match(/:(.*?);/)[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);

        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }

        return new Blob([uInt8Array], { type: contentType });
    }

    /**
     * 上傳截圖到 Supabase Storage
     */
    async uploadScreenshot(channelId, blob) {
        try {
            const fileName = `${channelId}_${Date.now()}.jpg`;
            const filePath = `screenshots/${fileName}`;

            const { data, error } = await supabaseClient.supabase.storage
                .from(CONFIG.STORAGE_BUCKET)
                .upload(filePath, blob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (error) throw error;

            // 獲取公開 URL
            const { data: urlData } = supabaseClient.supabase.storage
                .from(CONFIG.STORAGE_BUCKET)
                .getPublicUrl(filePath);

            return urlData.publicUrl;
        } catch (error) {
            logger.error('Failed to upload screenshot:', error);
            return null;
        }
    }

    /**
     * 更新截圖元數據到資料庫
     */
    async updateScreenshotMetadata(channel, screenshotUrl) {
        try {
            const { data, error } = await supabaseClient.supabase
                .from('channel_screenshots')
                .upsert({
                    channel_name: channel.name,
                    channel_url: channel.url,
                    screenshot_url: screenshotUrl,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'channel_name,channel_url',
                    ignoreDuplicates: false
                });

            if (error) {
                logger.warn('⚠️  Database update failed:', error.message);
                // 不拋出錯誤，因為截圖已經上傳成功
                return;
            }

            logger.debug('✅ Database updated successfully');
        } catch (error) {
            logger.error('Failed to update screenshot metadata:', error);
        }
    }

    /**
     * 繁簡轉換映射表（常用字）
     */
    getSimplifiedChar(char) {
        const map = {
            '東': '东', '視': '视', '聞': '闻', '臺': '台', '灣': '湾',
            '華': '华', '鏡': '镜', '電': '电', '財': '财', '經': '经',
            '業': '业', '國': '国', '際': '际', '島': '岛', '寰': '寰',
            '宇': '宇', '美': '美', '音': '音', '非': '非', '凡': '凡',
            '商': '商', '第': '第', '中': '中', '天': '天', '民': '民',
            '新': '新', '台': '台', '頻': '频', '道': '道', '綜': '综',
            '藝': '艺', '戲': '戏', '劇': '剧', '電': '电', '影': '影',
            '體': '体', '育': '育', '兒': '儿', '童': '童', '之': '之',
            '聲': '声', '森': '森', '鳳': '凤', '凰': '凰', '衛': '卫',
            '星': '星', '探': '探', '索': '索', '動': '动', '物': '物',
            '歷': '历', '史': '史', '紀': '纪', '錄': '录', '片': '片',
            '頻': '频', '道': '道', '購': '购', '物': '物', '時': '时',
            '尚': '尚', '娛': '娱', '樂': '乐', '音': '音', '樂': '乐',
            '戲': '戏', '劇': '剧', '綜': '综', '合': '合', '資': '资',
            '訊': '讯', '證': '证', '券': '券', '金': '金', '融': '融'
        };
        return map[char] || char;
    }

    /**
     * 將繁體中文轉換為簡體中文
     */
    toSimplified(text) {
        if (!text) return text;
        return text.split('').map(char => this.getSimplifiedChar(char)).join('');
    }

    /**
     * 獲取頻道截圖 URL（支援繁簡體匹配）
     * @param {string} channelName - 頻道名稱
     * @returns {string|null} - 截圖 URL 或 null
     */
    getScreenshotUrl(channelName) {
        if (!channelName) return null;

        // 1. 先嘗試直接匹配
        let metadata = this.screenshotMetadata.get(channelName);
        if (metadata) {
            logger.debug(`✅ Direct match found for: ${channelName}`);
            return metadata.url || null;
        }

        // 2. 嘗試簡體匹配（將輸入的簡體轉換為繁體來查找）
        // 遍歷所有已存儲的頻道名稱，看看簡體化後是否匹配
        const simplifiedInputName = this.toSimplified(channelName);

        for (let [storedName, data] of this.screenshotMetadata.entries()) {
            const simplifiedStoredName = this.toSimplified(storedName);

            if (simplifiedStoredName === simplifiedInputName) {
                logger.debug(`✅ Simplified match found: "${channelName}" (${simplifiedInputName}) matches "${storedName}" (${simplifiedStoredName})`);
                return data.url || null;
            }
        }

        // 3. 都沒找到，返回 null
        logger.debug(`❌ No match found for: ${channelName} (${simplifiedInputName})`);
        return null;
    }

    /**
     * 觸發截圖更新事件
     */
    dispatchScreenshotUpdatedEvent(channelId, screenshotUrl) {
        const event = new CustomEvent('channel-screenshot-updated', {
            detail: { channelId, screenshotUrl }
        });
        window.dispatchEvent(event);
    }

    /**
     * 清理資源
     */
    destroy() {
        this.stop();

        if (this.hiddenVideo) {
            this.hiddenVideo.remove();
            this.hiddenVideo = null;
        }

        if (this.hiddenCanvas) {
            this.hiddenCanvas.remove();
            this.hiddenCanvas = null;
        }

        this.screenshotMetadata.clear();
        this.screenshotQueue = [];
    }
}

// 創建單例
const screenshotManager = new ChannelScreenshotManager();

// 🔧 調試：暴露為全局變量
if (typeof window !== 'undefined') {
    window.screenshotManager = screenshotManager;
}

export default screenshotManager;
export { ChannelScreenshotManager };

