/**
 * 專業 IPTV 播放器類
 * 基於網路最佳實踐，專門處理 m3u8 直播流
 */
class IPTVPlayer {
    constructor(videoElement) {
        this.video = videoElement;
        this.hls = null;
        this.currentUrl = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        this.setupVideoElement();
    }

    setupVideoElement() {
        // 設置視頻元素屬性以最大化相容性
        this.video.setAttribute('playsinline', '');
        this.video.setAttribute('webkit-playsinline', '');
        this.video.setAttribute('crossorigin', 'anonymous');
        this.video.muted = true; // 允許自動播放
        
        // 添加事件監聽
        this.video.addEventListener('loadstart', () => this.onLoadStart());
        this.video.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
        this.video.addEventListener('canplay', () => this.onCanPlay());
        this.video.addEventListener('playing', () => this.onPlaying());
        this.video.addEventListener('error', (e) => this.onError(e));
        this.video.addEventListener('stalled', () => this.onStalled());
        this.video.addEventListener('waiting', () => this.onWaiting());
    }

    async loadStream(url) {
        console.log('IPTV Player: Loading stream:', url);
        this.currentUrl = url;
        this.retryCount = 0;

        try {
            await this.stopCurrentStream();

            // 強制重新渲染視頻元素
            this.forceVideoRerender();

            // 嘗試多種載入方法
            await this.tryMultipleLoadMethods(url);

            // 載入後再次強制重新渲染
            setTimeout(() => {
                this.forceVideoRerender();
            }, 100);

        } catch (error) {
            console.error('IPTV Player: All loading methods failed:', error);
            throw error;
        }
    }

    async tryMultipleLoadMethods(url) {
        // 檢測是否為 iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

        // iOS 優先使用原生播放器，桌面優先使用 HLS.js
        const methods = isIOS ? [
            // iOS 方法 1: 原生 HLS 播放器
            async () => {
                console.log('IPTV Player: Using native HLS player (iOS)');
                if (this.isHLSStream(url)) {
                    return await this.loadNativeHLS(url);
                } else {
                    return await this.loadNativeStream(url);
                }
            },
            // iOS 方法 2: 原生播放器後備
            async () => {
                console.log('IPTV Player: Fallback to native stream player (iOS)');
                return await this.loadNativeStream(url);
            }
        ] : [
            // 桌面方法 1: 智能檢測 (HLS.js 優先)
            async () => {
                if (this.isHLSStream(url)) {
                    return await this.loadHLSStream(url);
                } else {
                    return await this.loadNativeStream(url);
                }
            },
            // 桌面方法 2: 強制使用 HLS.js
            async () => {
                if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                    console.log('IPTV Player: Forcing HLS.js');
                    return await this.loadWithHLSJS(url);
                }
                throw new Error('HLS.js not available');
            },
            // 桌面方法 3: 原生播放器後備
            async () => {
                console.log('IPTV Player: Fallback to native player');
                return await this.loadNativeStream(url);
            }
        ];

        let lastError;
        for (let i = 0; i < methods.length; i++) {
            try {
                console.log(`IPTV Player: Trying loading method ${i + 1}/${methods.length}`);
                await methods[i]();
                console.log(`IPTV Player: Loading method ${i + 1} succeeded`);
                return; // 成功載入，退出
            } catch (error) {
                console.warn(`IPTV Player: Loading method ${i + 1} failed:`, error.message);
                lastError = error;

                // 在嘗試下一個方法前稍作等待（減少跳閃）
                if (i < methods.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }

        // 所有方法都失敗了
        throw lastError || new Error('All loading methods failed');
    }

    isHLSStream(url) {
        return url.includes('.m3u8') || url.includes('m3u8') || url.includes('.ts') ||
               url.includes('hls') || url.includes('playlist') ||
               // 檢查是否為可能的串流 API 端點
               (url.includes('token=') && url.includes('id=')) ||
               url.includes('sub?') || url.includes('stream');
    }

    async loadHLSStream(url) {
        // 優先使用 HLS.js，因為它更穩定
        if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            console.log('IPTV Player: Using HLS.js (preferred)');
            try {
                return await this.loadWithHLSJS(url);
            } catch (error) {
                console.warn('IPTV Player: HLS.js failed, trying native HLS:', error);
            }
        }

        // 檢查瀏覽器原生 HLS 支援
        if (this.hasNativeHLSSupport()) {
            console.log('IPTV Player: Trying native HLS support');
            try {
                return await this.loadNativeHLS(url);
            } catch (error) {
                console.warn('IPTV Player: Native HLS failed, trying native stream:', error);
            }
        }

        // 最後嘗試原生播放
        console.log('IPTV Player: Fallback to native player');
        return this.loadNativeStream(url);
    }

    hasNativeHLSSupport() {
        // Safari 和 iOS 有原生 HLS 支援
        const canPlayHLS = this.video.canPlayType('application/vnd.apple.mpegurl') !== '' ||
                          this.video.canPlayType('application/x-mpegURL') !== '';
        
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        return canPlayHLS && (isSafari || isIOS);
    }

    // 在 HTTPS 環境將不安全的 http 串流改寫為同源代理，避免混合內容
    rewriteUrlForHttps(url) {
        try {
            if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && /^http:\/\//i.test(url)) {
                // 統一使用 Functions 代理，避免各種混合內容/CORS
                // 注意：保持原始 URL 不變，因為 220.134.196.147 是必需的代理
                const encoded = encodeURIComponent(url);
                return `/api/proxy?url=${encoded}`;
            }
        } catch (_) {}
        return url;
    }

    async loadNativeHLS(url) {
        return new Promise((resolve, reject) => {
            let timeoutId;

            const cleanup = () => {
                this.video.removeEventListener('canplay', onCanPlay);
                this.video.removeEventListener('error', onError);
                this.video.removeEventListener('loadeddata', onLoadedData);
                if (timeoutId) clearTimeout(timeoutId);
            };

            const onCanPlay = () => {
                cleanup();
                this.startPlayback();
                resolve();
            };

            const onLoadedData = () => {
                cleanup();
                this.startPlayback();
                resolve();
            };

            const onError = (event) => {
                cleanup();
                const error = event.target?.error;
                let errorMessage = 'Native HLS playback failed';

                if (error) {
                    switch (error.code) {
                        case 1: errorMessage = 'Video loading aborted'; break;
                        case 2: errorMessage = 'Network error'; break;
                        case 3: errorMessage = 'Video decoding failed'; break;
                        case 4: errorMessage = 'Video format not supported'; break;
                        default: errorMessage = `Native HLS error (code: ${error.code})`;
                    }
                }

                reject(new Error(errorMessage));
            };

            // 設置超時
            timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error('Native HLS loading timeout'));
            }, 15000); // 15秒超時

            this.video.addEventListener('canplay', onCanPlay);
            this.video.addEventListener('loadeddata', onLoadedData);
            this.video.addEventListener('error', onError);

            // 在 HTTPS 環境下重寫 URL
            const sourceUrl = this.rewriteUrlForHttps(url);
            console.log('IPTV Player: Loading native HLS with URL:', sourceUrl);

            // 設置 source 元素
            this.video.innerHTML = '';
            const source = document.createElement('source');
            source.src = sourceUrl;
            source.type = 'application/x-mpegURL';
            this.video.appendChild(source);

            this.video.load();
        });
    }

    async loadWithHLSJS(url) {
        return new Promise((resolve, reject) => {
            // 清理現有的 HLS 實例
            if (this.hls) {
                this.hls.destroy();
                this.hls = null;
            }

            // 先保留 this 供回呼使用
            const self = this;
            // 創建新的 HLS 實例，優化設置以減少卡頓
            this.hls = new Hls({
                debug: false,
                enableWorker: true,
                lowLatencyMode: false, // 對於 IPTV 直播，關閉低延遲模式

                // 🚀 優化緩衝設置 - 大幅增加緩衝區
                backBufferLength: 180,           // 後緩衝區增加到 3 分鐘
                maxBufferLength: 90,             // 最大緩衝區增加到 1.5 分鐘
                maxMaxBufferLength: 1200,        // 最大最大緩衝區增加到 20 分鐘
                maxBufferSize: 200 * 1000 * 1000, // 緩衝區大小增加到 200MB
                maxBufferHole: 0.2,              // 減少緩衝區洞的容忍度
                highBufferWatchdogPeriod: 1,     // 更頻繁的緩衝區監控

                // 🎯 品質和適應性設置
                startLevel: -1,                  // 自動選擇起始品質
                capLevelToPlayerSize: false,     // 不限制品質到播放器大小
                autoStartLoad: true,             // 自動開始載入

                // 🌐 網路優化設置
                manifestLoadingTimeOut: 20000,   // 清單載入超時增加到 20 秒
                manifestLoadingMaxRetry: 5,      // 清單載入重試次數增加到 5 次
                manifestLoadingRetryDelay: 3000, // 清單載入重試延遲增加到 3 秒

                levelLoadingTimeOut: 20000,      // 級別載入超時增加到 20 秒
                levelLoadingMaxRetry: 6,         // 級別載入重試次數增加到 6 次
                levelLoadingRetryDelay: 3000,    // 級別載入重試延遲增加到 3 秒

                fragLoadingTimeOut: 40000,       // 片段載入超時增加到 40 秒
                fragLoadingMaxRetry: 8,          // 片段載入重試次數增加到 8 次
                fragLoadingRetryDelay: 2000,     // 片段載入重試延遲增加到 2 秒

                // 🔧 錯誤恢復和穩定性
                enableSoftwareAES: true,         // 啟用軟體 AES 解密
                startFragPrefetch: true,         // 啟用片段預取
                testBandwidth: true,             // 啟用頻寬測試

                // 📡 直播同步優化
                liveSyncDurationCount: 2,        // 減少直播同步持續時間以減少延遲
                liveMaxLatencyDurationCount: 6,  // 減少最大延遲持續時間

                // 🎛️ 自適應位元率優化
                abrEwmaFastLive: 2.0,           // 快速直播 EWMA
                abrEwmaSlowLive: 8.0,           // 慢速直播 EWMA
                abrEwmaDefaultEstimate: 1000000, // 預設頻寬估計提高到 1Mbps

                // 🌐 網路設置 - 透過 Functions 代理避免混合內容/CORS
                xhrSetup: function(xhr, url) {
                    xhr.withCredentials = false;
                },

                fetchSetup: function(context, initParams) {
                    const proxiedUrl = self.rewriteUrlForHttps(context.url);
                    const headers = new Headers(initParams?.headers || {});
                    // 盡量攜帶 Range 與 UA 以提升相容性
                    if (context.rangeStart) {
                        headers.set('Range', `bytes=${context.rangeStart}-${context.rangeEnd || ''}`);
                    }
                    headers.set('User-Agent', headers.get('User-Agent') || 'Mozilla/5.0');
                    return new Request(proxiedUrl, {
                        ...initParams,
                        headers,
                        mode: 'cors',
                        credentials: 'omit',
                        redirect: 'follow'
                    });
                },

                // 🎛️ 頻寬管理
                abrBandWidthFactor: 0.9,        // 頻寬因子
                abrBandWidthUpFactor: 0.6,      // 頻寬上升因子

                // 🔄 片段處理優化
                nudgeOffset: 0.05,              // 減少微調偏移
                nudgeMaxRetry: 8,               // 增加微調重試次數
                maxFragLookUpTolerance: 0.15,   // 減少片段查找容忍度

                // ⏱️ 超時設置
                fragLoadingMaxRetryTimeout: 120000,    // 片段載入最大重試超時 2 分鐘
                levelLoadingMaxRetryTimeout: 120000,   // 級別載入最大重試超時 2 分鐘
                manifestLoadingMaxRetryTimeout: 120000 // 清單載入最大重試超時 2 分鐘
            });

            // 事件處理
            this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                console.log('IPTV Player: HLS media attached');
            });

            this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                console.log('IPTV Player: HLS manifest parsed, levels:', data.levels.length);
                this.startPlayback();
                resolve();
            });

            this.hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('IPTV Player: HLS error:', data);

                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.log('IPTV Player: Network error, attempting recovery...');
                            // 🌐 增強網路錯誤恢復 - 增加重試次數和智能延遲
                            if (this.retryCount < 5) {
                                console.log(`Network error retry ${this.retryCount + 1}/5`);
                                const delay = Math.min(2000 * Math.pow(2, this.retryCount), 10000); // 指數退避，最大 10 秒
                                setTimeout(() => {
                                    this.hls.startLoad();
                                }, delay);
                                this.retryCount++;
                            } else {
                                reject(new Error('Network error - max retries exceeded'));
                            }
                            break;

                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.log('IPTV Player: Media error, attempting recovery...');
                            // 🎬 增強媒體錯誤恢復
                            if (this.retryCount < 3) {
                                console.log(`Media error retry ${this.retryCount + 1}/3`);
                                setTimeout(() => {
                                    this.hls.recoverMediaError();
                                }, 1000 * (this.retryCount + 1));
                                this.retryCount++;
                            } else {
                                // 最後嘗試：完全重新載入流
                                console.log('Media error: Attempting full stream reload...');
                                this.hls.destroy();
                                setTimeout(() => {
                                    this.loadStream(this.currentUrl).catch(() => {
                                        reject(new Error('Media error - all recovery attempts failed'));
                                    });
                                }, 3000);
                            }
                            break;

                        case Hls.ErrorTypes.MUX_ERROR:
                            console.log('IPTV Player: Mux error, attempting recovery...');
                            // 🔧 處理多工器錯誤
                            if (this.retryCount < 2) {
                                console.log(`Mux error retry ${this.retryCount + 1}/2`);
                                setTimeout(() => {
                                    this.hls.recoverMediaError();
                                }, 1500);
                                this.retryCount++;
                            } else {
                                reject(new Error('Mux error - recovery failed'));
                            }
                            break;

                        default:
                            console.error(`IPTV Player: Fatal error - ${data.type}: ${data.details}`);
                            reject(new Error(`Fatal HLS error: ${data.type} - ${data.details}`));
                            break;
                    }
                } else {
                    // 🔄 處理非致命錯誤
                    console.warn('IPTV Player: Non-fatal HLS error:', data.details);

                    // 對於緩衝區停滯錯誤，嘗試恢復
                    if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
                        console.log('Buffer stalled, attempting to recover...');
                        if (this.video.currentTime > 0) {
                            this.video.currentTime += 0.1; // 微調播放位置
                        }
                    }
                }
            });

            // 載入流
            const sourceUrl = this.rewriteUrlForHttps(url);
            this.hls.attachMedia(this.video);
            this.hls.loadSource(sourceUrl);
        });
    }

    async loadNativeStream(url) {
        return new Promise((resolve, reject) => {
            let timeoutId;

            const cleanup = () => {
                this.video.removeEventListener('canplay', onCanPlay);
                this.video.removeEventListener('error', onError);
                this.video.removeEventListener('loadeddata', onLoadedData);
                if (timeoutId) clearTimeout(timeoutId);
            };

            const onCanPlay = () => {
                cleanup();
                this.startPlayback();
                resolve();
            };

            const onLoadedData = () => {
                cleanup();
                this.startPlayback();
                resolve();
            };

            const onError = (event) => {
                cleanup();
                const error = event.target?.error;
                let errorMessage = 'Native playback failed';

                if (error) {
                    switch (error.code) {
                        case 1: errorMessage = 'Video loading aborted'; break;
                        case 2: errorMessage = 'Network error - check stream URL'; break;
                        case 3: errorMessage = 'Video decoding failed - unsupported format'; break;
                        case 4: errorMessage = 'Video format not supported by browser'; break;
                        default: errorMessage = `Native playback error (code: ${error.code})`;
                    }
                }

                reject(new Error(errorMessage));
            };

            // 設置超時
            timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error('Native stream loading timeout - stream may be unavailable'));
            }, 20000); // 20秒超時

            // 檢查是否為 API 端點，如果是則先嘗試獲取實際串流 URL
            if (this.isAPIEndpoint(url)) {
                console.log('IPTV Player: Detected API endpoint, attempting to resolve...');
                this.resolveStreamURL(url).then(resolvedUrl => {
                    if (resolvedUrl && resolvedUrl !== url) {
                        console.log('IPTV Player: Resolved to:', resolvedUrl);
                        url = resolvedUrl;
                    }
                    this.setupVideoSource(url, onCanPlay, onLoadedData, onError);
                }).catch(error => {
                    console.warn('IPTV Player: Failed to resolve, using original URL:', error);
                    this.setupVideoSource(url, onCanPlay, onLoadedData, onError);
                });
            } else {
                this.setupVideoSource(url, onCanPlay, onLoadedData, onError);
            }
        });
    }

    setupVideoSource(url, onCanPlay, onLoadedData, onError) {
        this.video.addEventListener('canplay', onCanPlay);
        this.video.addEventListener('loadeddata', onLoadedData);
        this.video.addEventListener('error', onError);

        // 清除現有內容並設置新源
        this.video.innerHTML = '';
        const sourceUrl = this.rewriteUrlForHttps(url);
        this.video.src = sourceUrl;
        this.video.load();
    }

    isAPIEndpoint(url) {
        // 檢查是否為 API 端點而非直接串流
        return url.includes('token=') || url.includes('sub?') ||
               url.includes('api/') || url.includes('stream?') ||
               url.includes('koyeb.app') || url.includes('herokuapp.com') ||
               (!url.includes('.m3u8') && !url.includes('.ts') && !url.includes('.mp4'));
    }

    async resolveStreamURL(url) {
        try {
            // 檢查是否為 koyeb.app 的 API 端點
            if (url.includes('koyeb.app') && url.includes('/sub?')) {
                console.log('IPTV Player: Detected koyeb.app API endpoint, using proxy...');
                // 使用代理來避免 CORS 問題
                const proxyUrl = url.replace('http://breezy-audrie-zspace-7524863c.koyeb.app/sub', '/api/stream');

                try {
                    const response = await fetch(proxyUrl, {
                        method: 'GET',
                        redirect: 'follow'
                    });

                    if (response.ok) {
                        // 如果代理成功，檢查是否返回了實際的串流 URL
                        const text = await response.text();

                        // 檢查是否為 m3u8 內容或 URL
                        if (text.includes('#EXTM3U') || text.includes('.m3u8')) {
                            console.log('IPTV Player: Got m3u8 content from proxy');
                            // 如果是 m3u8 播放清單內容，創建 blob URL
                            const blob = new Blob([text], { type: 'application/vnd.apple.mpegurl' });
                            return URL.createObjectURL(blob);
                        } else if (text.startsWith('http')) {
                            console.log('IPTV Player: Got redirect URL from proxy:', text.trim());
                            return text.trim();
                        }
                    }
                } catch (proxyError) {
                    console.warn('IPTV Player: Proxy failed:', proxyError);
                }
            }

            // 檢查是否為有 CORS/混合內容問題的串流 (220.134.196.147:任何埠)
            // 只在 HTTPS 環境下才使用代理
            if (url.includes('220.134.196.147') && window.location?.protocol === 'https:') {
                console.log('IPTV Player: Detected potentially CORS/mixed-content stream in HTTPS, rewriting to proxy...');
                try {
                    // 將 http://220.134.196.147:<port>/xxx 統一改寫為 /api/proxy?url=...
                    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
                    console.log('IPTV Player: Rewritten URL:', proxyUrl);

                    const response = await fetch(proxyUrl, {
                        method: 'HEAD',
                        redirect: 'follow'
                    });

                    if (response.ok || response.type === 'opaque') {
                        console.log('IPTV Player: Proxy reachable, using proxy URL');
                        return proxyUrl;
                    }
                } catch (proxyError) {
                    console.warn('IPTV Player: Proxy check failed for 220.134.196.147:', proxyError);
                }
            }

            // 對於其他 URL，嘗試直接解析
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'no-cors', // 避免 CORS 預檢請求
                timeout: 5000
            });

            // 檢查回應的 Content-Type
            const contentType = response.headers.get('content-type');

            if (contentType && (
                contentType.includes('application/vnd.apple.mpegurl') ||
                contentType.includes('application/x-mpegURL') ||
                contentType.includes('video/') ||
                contentType.includes('application/octet-stream')
            )) {
                return url;
            }

            // 如果是重定向，獲取最終 URL
            if (response.redirected) {
                return response.url;
            }

            return url;
        } catch (error) {
            console.warn('IPTV Player: Failed to resolve stream URL:', error);
            return url;
        }
    }

    async startPlayback() {
        try {
            console.log('🎬 IPTV Player: Starting automatic playback');

            // 🎵 設置視頻屬性以最大化自動播放成功率
            this.video.muted = true; // 先靜音以允許自動播放
            this.video.autoplay = true;
            this.video.preload = 'auto';
            this.video.playsInline = true; // 移動設備內聯播放

            // 🚀 強制嘗試播放
            await this.video.play();
            console.log('✅ IPTV Player: Automatic playback started successfully');

            // 🔊 播放成功後自動取消靜音，讓用戶聽到聲音
            setTimeout(() => {
                if (!this.video.paused) { // 確保仍在播放
                    this.video.muted = false;
                    this.video.volume = 0.8; // 設置合適的音量
                    console.log('🔊 IPTV Player: Audio unmuted, volume set to 80%');
                }
            }, 1500); // 1.5秒後取消靜音

        } catch (error) {
            console.warn('⚠️ IPTV Player: Autoplay prevented by browser policy:', error);
            // 即使自動播放失敗，也要準備好音頻設置
            this.video.muted = false;
            this.video.volume = 0.8;

            // 拋出錯誤讓上層處理（顯示播放按鈕）
            throw error;
        }
    }

    async stopCurrentStream() {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        this.video.pause();
        this.video.src = '';
        this.video.load();
    }

    // 強制視頻重新渲染
    forceVideoRerender() {
        console.log('IPTV Player: Forcing video rerender');

        // 方法1: 強制重新計算佈局
        const container = this.video.parentElement;
        if (container) {
            const display = container.style.display;
            container.style.display = 'none';
            container.offsetHeight; // 觸發重排
            container.style.display = display || 'block';
        }

        // 方法2: 強制視頻元素重新渲染
        const currentDisplay = this.video.style.display;
        this.video.style.display = 'none';
        this.video.offsetHeight; // 觸發重排
        this.video.style.display = currentDisplay || 'block';

        // 方法3: 觸發重繪
        this.video.style.transform = 'translateZ(0)';

        // 方法4: 強制重新設置尺寸
        const rect = this.video.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            this.video.style.width = '100%';
            this.video.style.height = '100%';
            this.video.style.minHeight = '400px';
        }

        console.log('Video element dimensions:', {
            width: rect.width,
            height: rect.height,
            x: rect.x,
            y: rect.y,
            visible: rect.width > 0 && rect.height > 0
        });
    }

    // 事件處理器
    onLoadStart() {
        console.log('IPTV Player: Load start');
    }

    onLoadedMetadata() {
        console.log('IPTV Player: Metadata loaded');
        console.log('Video dimensions:', this.video.videoWidth, 'x', this.video.videoHeight);
    }

    onCanPlay() {
        console.log('IPTV Player: Can play');
    }

    onPlaying() {
        console.log('IPTV Player: Playing');
        this.retryCount = 0; // 重置重試計數
    }

    onError(event) {
        console.error('IPTV Player: Video error:', event);

        // 只在特定錯誤情況下重試，避免無限重試
        const errorCode = event.target?.error?.code;
        const shouldRetry = errorCode === 3 || errorCode === 4; // MEDIA_ERR_DECODE 或 MEDIA_ERR_SRC_NOT_SUPPORTED

        if (shouldRetry && this.retryCount < this.maxRetries && this.currentUrl) {
            this.retryCount++;
            console.log(`IPTV Player: Retrying (${this.retryCount}/${this.maxRetries}) for error code ${errorCode}...`);
            setTimeout(() => {
                this.loadStream(this.currentUrl);
            }, 5000); // 增加重試間隔到5秒
        } else {
            console.log('IPTV Player: Not retrying - error code:', errorCode, 'retry count:', this.retryCount);
        }
    }

    onStalled() {
        console.log('IPTV Player: Stalled');
    }

    onWaiting() {
        console.log('IPTV Player: Waiting/Buffering');
    }

    // 公共方法
    play() {
        return this.video.play();
    }

    pause() {
        this.video.pause();
    }

    setVolume(volume) {
        this.video.volume = Math.max(0, Math.min(1, volume));
    }

    setMuted(muted) {
        this.video.muted = muted;
    }

    getCurrentTime() {
        return this.video.currentTime;
    }

    getDuration() {
        return this.video.duration;
    }

    isPlaying() {
        return !this.video.paused && !this.video.ended && this.video.readyState > 2;
    }
}

// 導出到全局作用域
window.IPTVPlayer = IPTVPlayer;
