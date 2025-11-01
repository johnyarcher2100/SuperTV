// 📝 導入 Logger 工具
import { createLogger } from './logger.js';

// 創建 Player 專用的 logger
const logger = createLogger('VideoPlayer');
// Import HLS.js from npm package
import Hls from 'hls.js';

// Video Player with multiple engine support
class VideoPlayer {
    constructor(videoElement) {
        this.video = videoElement;
        this.hls = null;
        this.currentEngine = 'auto';
        this.currentChannel = null;
        this.isPlaying = false;
        this.settings = {
            engine: 'auto',
            hardwareDecode: true,
            autoPlay: false,
            bufferSize: 'medium'
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSettings();
    }

    setupEventListeners() {
        // Video element events
        this.video.addEventListener('loadstart', () => this.onLoadStart());
        this.video.addEventListener('loadeddata', () => this.onLoadedData());
        this.video.addEventListener('canplay', () => this.onCanPlay());
        this.video.addEventListener('playing', () => this.onPlaying());
        this.video.addEventListener('pause', () => this.onPause());
        this.video.addEventListener('error', (e) => this.onError(e));
        this.video.addEventListener('waiting', () => this.onWaiting());
        this.video.addEventListener('stalled', () => this.onStalled());
    }

    async loadChannel(channel) {
        if (!channel || !channel.url) {
            throw new Error('Invalid channel data');
        }

        this.currentChannel = channel;
        this.showLoading();
        this.hideError();

        try {
            // Stop current playback
            await this.stop();

            // 強制重新渲染視頻元素
            this.forceVideoRerender();

            // Determine best engine for this stream
            const engine = this.selectEngine(channel.url);
            logger.debug(`Loading channel ${channel.name} with engine: ${engine}`);

            // Load with selected engine
            switch (engine) {
                case 'hls':
                    await this.loadWithHLS(channel.url);
                    break;
                case 'native':
                    await this.loadWithNative(channel.url);
                    break;
                default:
                    await this.loadWithAuto(channel.url);
            }

            this.currentEngine = engine;
            this.updatePlayerInfo(channel.name, 'Ready');

            // 載入後再次強制重新渲染
            setTimeout(() => {
                this.forceVideoRerender();
            }, 100);

        } catch (error) {
            logger.error('Failed to load channel:', error);
            this.showError(`載入頻道失敗: ${error.message}`);
            this.updatePlayerInfo(channel.name, 'Error');
        } finally {
            this.hideLoading();
        }
    }

    selectEngine(url) {
        if (this.settings.engine !== 'auto') {
            return this.settings.engine;
        }

        // Auto-select based on URL and browser capabilities
        if (url.includes('.m3u8')) {
            // 檢查瀏覽器對 HLS 的原生支援
            const canPlayHLS = this.video.canPlayType('application/vnd.apple.mpegurl') ||
                              this.video.canPlayType('application/x-mpegURL');

            // Safari 和 iOS 優先使用原生 HLS 支援
            if (canPlayHLS && (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome'))) {
                logger.debug('Using native HLS support for Safari');
                return 'native';
            }
            // 其他瀏覽器使用 HLS.js
            else if (Hls.isSupported()) {
                logger.debug('Using HLS.js for non-Safari browsers');
                return 'hls';
            }
            // 備用原生支援
            else if (canPlayHLS) {
                logger.debug('Fallback to native HLS support');
                return 'native';
            }
        }

        return 'native';
    }

    async loadWithHLS(url) {
        if (!Hls.isSupported()) {
            throw new Error('HLS.js not supported in this browser');
        }

        // Clean up existing HLS instance
        if (this.hls) {
            this.hls.destroy();
        }

        this.hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: this.getBufferSize(),
            maxBufferLength: this.getBufferSize() * 2,
            maxMaxBufferLength: this.getBufferSize() * 4,
            startLevel: -1, // Auto quality
            capLevelToPlayerSize: true,
            debug: false,
            // 強制使用軟體解碼以確保相容性
            enableSoftwareAES: true,
            // 改善視頻渲染
            renderTextTracksNatively: false,
            // 網路設定
            manifestLoadingTimeOut: 10000,
            manifestLoadingMaxRetry: 4,
            levelLoadingTimeOut: 10000,
            levelLoadingMaxRetry: 4,
            fragLoadingTimeOut: 20000,
            fragLoadingMaxRetry: 6
        });

        return new Promise((resolve, reject) => {
            this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                logger.debug('HLS: Media attached');
            });

            this.hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
                logger.debug('HLS: Level loaded', data.level, data.details);
            });

            this.hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
                logger.debug('HLS: Fragment loaded', data.frag.level, data.frag.sn);
            });

            this.hls.on(Hls.Events.BUFFER_APPENDED, (event, data) => {
                logger.debug('HLS: Buffer appended', data.type);
            });

            this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                logger.debug('HLS: Manifest parsed, levels:', data.levels.length);
                this.updateQualitySelector(data.levels);

                // 檢查視頻軌道
                setTimeout(() => {
                    logger.debug('Video tracks:', this.video.videoTracks?.length || 0);
                    logger.debug('Audio tracks:', this.video.audioTracks?.length || 0);
                    logger.debug('Video dimensions:', this.video.videoWidth, 'x', this.video.videoHeight);
                    logger.debug('Video ready state:', this.video.readyState);
                }, 1000);

                // Try to start playback
                this.video.play().then(() => {
                    logger.debug('HLS: Playback started successfully');
                    // 取消靜音以確保音頻播放
                    this.video.muted = false;
                }).catch(error => {
                    logger.debug('HLS: Autoplay prevented, user interaction required:', error);
                });

                resolve();
            });

            this.hls.on(Hls.Events.ERROR, (event, data) => {
                logger.error('HLS Error:', data);
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            reject(new Error('Network error'));
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            reject(new Error('Media error'));
                            break;
                        default:
                            reject(new Error('Fatal HLS error'));
                            break;
                    }
                }
            });

            this.hls.attachMedia(this.video);
            this.hls.loadSource(url);
        });
    }

    async loadWithNative(url) {
        return new Promise((resolve, reject) => {
            const onCanPlay = () => {
                this.video.removeEventListener('canplay', onCanPlay);
                this.video.removeEventListener('error', onError);

                // 檢查視頻軌道
                setTimeout(() => {
                    logger.debug('Native - Video tracks:', this.video.videoTracks?.length || 0);
                    logger.debug('Native - Audio tracks:', this.video.audioTracks?.length || 0);
                    logger.debug('Native - Video dimensions:', this.video.videoWidth, 'x', this.video.videoHeight);
                    logger.debug('Native - Video ready state:', this.video.readyState);
                }, 1000);

                // Try to start playback
                this.video.play().then(() => {
                    logger.debug('Native: Playback started successfully');
                    // 取消靜音以確保音頻播放
                    this.video.muted = false;
                }).catch(error => {
                    logger.debug('Native: Autoplay prevented, user interaction required:', error);
                });

                resolve();
            };

            const onError = () => {
                this.video.removeEventListener('canplay', onCanPlay);
                this.video.removeEventListener('error', onError);
                reject(new Error('Native player failed to load stream'));
            };

            this.video.addEventListener('canplay', onCanPlay);
            this.video.addEventListener('error', onError);

            // 為 HLS 流設置正確的 MIME 類型
            if (url.includes('.m3u8')) {
                // 創建 source 元素並設置 MIME 類型
                this.video.innerHTML = ''; // 清除現有 source
                const source = document.createElement('source');
                source.src = url;
                source.type = 'application/x-mpegURL';
                this.video.appendChild(source);

                // 也嘗試 Apple 的 MIME 類型
                const source2 = document.createElement('source');
                source2.src = url;
                source2.type = 'application/vnd.apple.mpegurl';
                this.video.appendChild(source2);
            } else {
                this.video.src = url;
            }

            this.video.load();
        });
    }

    async loadWithAuto(url) {
        // Try engines in order of preference
        const engines = ['hls', 'native'];

        for (const engine of engines) {
            try {
                switch (engine) {
                    case 'hls':
                        if (url.includes('.m3u8') && Hls.isSupported()) {
                            await this.loadWithHLS(url);
                            return;
                        }
                        break;
                    case 'native':
                        await this.loadWithNative(url);
                        return;
                }
            } catch (error) {
                logger.warn(`Engine ${engine} failed:`, error);
                continue;
            }
        }

        throw new Error('All playback engines failed');
    }

    async play() {
        try {
            await this.video.play();
            this.isPlaying = true;
        } catch (error) {
            logger.error('Play failed:', error);
            throw error;
        }
    }

    pause() {
        this.video.pause();
        this.isPlaying = false;
    }

    async stop() {
        this.pause();

        // Clean up engines
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        this.video.src = '';
        this.video.load();
        this.currentChannel = null;
    }

    // 強制視頻重新渲染
    forceVideoRerender() {
        logger.debug('Player: Forcing video rerender');

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

        logger.debug('Video element dimensions:', rect);
    }

    setVolume(volume) {
        this.video.volume = Math.max(0, Math.min(1, volume / 100));
    }

    getVolume() {
        return this.video.volume * 100;
    }

    mute() {
        this.video.muted = !this.video.muted;
        return this.video.muted;
    }

    setQuality(level) {
        if (this.hls && this.currentEngine === 'hls') {
            this.hls.currentLevel = level;
        }
    }

    getBufferSize() {
        const sizes = { small: 1, medium: 3, large: 5 };
        return sizes[this.settings.bufferSize] || 3;
    }

    updateQualitySelector(levels) {
        const selector = document.getElementById('quality-selector');
        if (!selector) return;

        // Clear existing options except auto
        selector.innerHTML = '<option value="-1">自動品質</option>';
        
        levels.forEach((level, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${level.height}p (${Math.round(level.bitrate / 1000)}k)`;
            selector.appendChild(option);
        });
    }

    updatePlayerInfo(channelName, status) {
        const channelElement = document.getElementById('current-channel');
        const statusElement = document.getElementById('player-status');
        
        if (channelElement) channelElement.textContent = channelName;
        if (statusElement) statusElement.textContent = status;
    }

    showLoading() {
        const loading = document.getElementById('loading-indicator');
        if (loading) loading.classList.remove('hidden');
    }

    hideLoading() {
        const loading = document.getElementById('loading-indicator');
        if (loading) loading.classList.add('hidden');
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');
        
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    }

    hideError() {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) errorDiv.classList.add('hidden');
    }

    // Event handlers
    onLoadStart() {
        this.updatePlayerInfo(this.currentChannel?.name || '', 'Loading...');
    }

    onLoadedData() {
        this.updatePlayerInfo(this.currentChannel?.name || '', 'Loaded');
    }

    onCanPlay() {
        this.updatePlayerInfo(this.currentChannel?.name || '', 'Ready');
        if (this.settings.autoPlay) {
            this.play().catch(err => logger.error('Auto-play failed:', err));
        }
    }

    onPlaying() {
        this.isPlaying = true;
        this.updatePlayerInfo(this.currentChannel?.name || '', 'Playing');

        // 強制刷新視頻渲染
        this.forceVideoRefresh();
    }

    forceVideoRefresh() {
        // 嘗試強制重新渲染視頻
        const currentTime = this.video.currentTime;
        this.video.style.display = 'none';
        this.video.offsetHeight; // 觸發重排
        this.video.style.display = 'block';

        // 檢查視頻尺寸
        setTimeout(() => {
            logger.debug('Video refresh - dimensions:', this.video.videoWidth, 'x', this.video.videoHeight);
            logger.debug('Video refresh - current time:', this.video.currentTime);

            if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
                logger.warn('Video has no dimensions, trying to fix...');
                // 嘗試重新載入
                this.video.load();
            }
        }, 500);
    }

    onPause() {
        this.isPlaying = false;
        this.updatePlayerInfo(this.currentChannel?.name || '', 'Paused');
    }

    onError(event) {
        // 只在有頻道載入時才顯示錯誤
        // 避免在初始化時因為沒有源而觸發錯誤提示
        if (this.currentChannel) {
            logger.error('Video error:', event);
            this.showError('播放發生錯誤，請重試');
            this.updatePlayerInfo(this.currentChannel?.name || '', 'Error');
        } else {
            logger.debug('Video error ignored (no channel loaded)');
        }
    }

    onWaiting() {
        this.updatePlayerInfo(this.currentChannel?.name || '', 'Buffering...');
    }

    onStalled() {
        this.updatePlayerInfo(this.currentChannel?.name || '', 'Stalled');
    }

    // Settings management
    loadSettings() {
        const saved = localStorage.getItem('supertv-settings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }

    saveSettings() {
        localStorage.setItem('supertv-settings', JSON.stringify(this.settings));
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
    }
}

// Export for use in other files
export { VideoPlayer };
// Also export to window for backward compatibility
window.VideoPlayer = VideoPlayer;
