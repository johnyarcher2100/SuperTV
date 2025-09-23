// Main application controller
class SuperTVApp {
    constructor() {
        console.log('SuperTVApp constructor called');
        this.channelManager = null;
        this.player = null;
        this.currentChannelId = null;
        this.isChannelPanelCollapsed = false;

        this.init();

        // 🔄 檢查是否需要恢復頻道列表狀態
        this.checkAndRestoreChannelList();
    }

    async init() {
        try {
            // Initialize components
            this.channelManager = new ChannelManager();
            this.player = new VideoPlayer(document.getElementById('video-player'));

            // Initialize professional IPTV player
            const videoElement = document.getElementById('video-player');
            this.iptvPlayer = new IPTVPlayer(videoElement);

            // Setup UI
            this.setupEventListeners();
            this.setupSourceSelection();
            this.loadSettings();

            console.log('SuperTV initialized successfully');
        } catch (error) {
            console.error('Failed to initialize SuperTV:', error);
        }
    }

    setupEventListeners() {
        // Player controls
        this.setupPlayerControls();

        // Settings
        this.setupSettingsModal();

        // Retry button
        document.getElementById('retry-btn').addEventListener('click', () => {
            if (this.currentChannelId) {
                this.selectChannel(this.currentChannelId);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Debug test buttons
        const testBtn = document.getElementById('test-play-btn');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                this.testPlayback();
            });
        }

        const forcePlayBtn = document.getElementById('force-play-btn');
        if (forcePlayBtn) {
            forcePlayBtn.addEventListener('click', () => {
                this.forcePlay();
            });
        }

        const checkVideoBtn = document.getElementById('check-video-btn');
        if (checkVideoBtn) {
            checkVideoBtn.addEventListener('click', () => {
                this.checkVideoStatus();
            });
        }

        const iptvTestBtn = document.getElementById('iptv-test-btn');
        if (iptvTestBtn) {
            iptvTestBtn.addEventListener('click', () => {
                this.testIPTVPlayer();
            });
        }

        const fixVideoBtn = document.getElementById('fix-video-btn');
        if (fixVideoBtn) {
            fixVideoBtn.addEventListener('click', () => {
                this.fixVideoDisplay();
            });
        }
    }

    setupSourceSelection() {
        console.log('Setting up source selection...');

        // Golden source button
        const goldenBtn = document.getElementById('load-golden-source');
        if (goldenBtn) {
            console.log('Golden source button found, adding event listener');
            goldenBtn.addEventListener('click', () => {
                console.log('Golden source button clicked');
                this.loadGoldenSource();
            });
        } else {
            console.error('Golden source button not found');
        }

        // 曉峰直播源 button
        const xiaofengBtn = document.getElementById('load-xiaofeng-source');
        if (xiaofengBtn) {
            xiaofengBtn.addEventListener('click', () => {
                console.log('曉峰直播源 button clicked');
                this.loadXiaofengSource();
            });
        } else {
            console.error('曉峰直播源 button not found');
        }

        // 秒開直播源 button
        const miaokaiBtn = document.getElementById('load-miaokai-source');
        if (miaokaiBtn) {
            miaokaiBtn.addEventListener('click', () => {
                console.log('秒開直播源 button clicked');
                this.loadMiaokaiSource();
            });
        } else {
            console.error('秒開直播源 button not found');
        }

        // Custom playlist button
        const customBtn = document.getElementById('load-custom-playlist');
        if (customBtn) {
            customBtn.addEventListener('click', () => {
                console.log('Custom playlist button clicked');
                this.showCustomSourceModal();
            });
        }

        // Direct URL button
        const urlBtn = document.getElementById('load-direct-url');
        if (urlBtn) {
            urlBtn.addEventListener('click', () => {
                console.log('Direct URL button clicked');
                this.showUrlSourceModal();
            });
        }

        // Custom source modal
        this.setupCustomSourceModal();

        // URL source modal
        this.setupUrlSourceModal();
    }

    setupCustomSourceModal() {
        const modal = document.getElementById('custom-source-modal');
        const closeBtn = document.getElementById('close-custom-source');
        const cancelBtn = document.getElementById('cancel-custom');
        const loadBtn = document.getElementById('load-playlist');

        closeBtn.addEventListener('click', () => this.hideCustomSourceModal());
        cancelBtn.addEventListener('click', () => this.hideCustomSourceModal());

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hideCustomSourceModal();
        });

        loadBtn.addEventListener('click', () => this.loadCustomPlaylist());

        // File input handler
        document.getElementById('playlist-file').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.loadPlaylistFile(e.target.files[0]);
            }
        });
    }

    setupUrlSourceModal() {
        const modal = document.getElementById('url-source-modal');
        const closeBtn = document.getElementById('close-url-source');
        const cancelBtn = document.getElementById('cancel-url');
        const playBtn = document.getElementById('play-url');

        closeBtn.addEventListener('click', () => this.hideUrlSourceModal());
        cancelBtn.addEventListener('click', () => this.hideUrlSourceModal());

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hideUrlSourceModal();
        });

        playBtn.addEventListener('click', () => this.playDirectUrl());
    }

    setupPlayerControls() {
        const playPauseBtn = document.getElementById('play-pause-btn');
        const muteBtn = document.getElementById('mute-btn');
        const volumeSlider = document.getElementById('volume-slider');
        const qualitySelector = document.getElementById('quality-selector');
        const fullscreenBtn = document.getElementById('fullscreen-btn');

        // Play/Pause
        playPauseBtn.addEventListener('click', () => {
            if (this.player.isPlaying) {
                this.player.pause();
                this.updatePlayPauseButton(false);
            } else {
                this.player.play().then(() => {
                    this.updatePlayPauseButton(true);
                }).catch(console.error);
            }
        });

        // Mute
        muteBtn.addEventListener('click', () => {
            const isMuted = this.player.mute();
            muteBtn.textContent = isMuted ? '🔇' : '🔊';
        });

        // Volume
        volumeSlider.addEventListener('input', (e) => {
            this.player.setVolume(e.target.value);
        });

        // Quality
        qualitySelector.addEventListener('change', (e) => {
            this.player.setQuality(parseInt(e.target.value));
        });

        // Fullscreen
        fullscreenBtn.addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Initialize volume
        volumeSlider.value = this.player.getVolume();
    }

    setupSettingsModal() {
        const settingsBtn = document.getElementById('settings-btn');
        const settingsModal = document.getElementById('settings-modal');
        const closeSettings = document.getElementById('close-settings');

        settingsBtn.addEventListener('click', () => {
            this.showSettingsModal();
        });

        closeSettings.addEventListener('click', () => {
            this.hideSettingsModal();
        });

        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                this.hideSettingsModal();
            }
        });

        // Settings controls
        document.getElementById('player-engine').addEventListener('change', (e) => {
            this.player.updateSettings({ engine: e.target.value });
        });

        document.getElementById('hardware-decode').addEventListener('change', (e) => {
            this.player.updateSettings({ hardwareDecode: e.target.checked });
        });

        document.getElementById('auto-play').addEventListener('change', (e) => {
            this.player.updateSettings({ autoPlay: e.target.checked });
        });

        document.getElementById('buffer-size').addEventListener('change', (e) => {
            this.player.updateSettings({ bufferSize: e.target.value });
        });
    }

    async loadGoldenSource() {
        try {
            // Show loading
            this.showLoading('載入黃金直播源...');

            let playlistText;

            try {
                // Try to fetch from proxy first
                const response = await fetch('/api/playlist');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                playlistText = await response.text();
            } catch (proxyError) {
                console.log('Proxy failed, using embedded data:', proxyError);
                // Fallback to embedded data
                playlistText = this.getEmbeddedGoldenSource();
            }

            this.processPlaylistText(playlistText);
        } catch (error) {
            console.error('Failed to load golden source:', error);
            this.hideLoading();
            this.showError(`載入黃金直播源失敗: ${error.message}`);
        }
    }

    getEmbeddedGoldenSource() {
        return `台視HD,http://220.134.196.147:9110/http/61.219.99.20:8081/hls/86/80/Ttv4max.m3u8
中視HD,http://220.134.196.147:8510/http/61.219.99.20:8081/hls/88/80/Ctv4max.m3u8
華視HD,http://220.134.196.147:8539/http/61.219.99.20:8081/hls/89/80/Cts4max.m3u8
民視HD,http://220.134.196.147:9574/http/61.219.99.20:8081/hls/85/80/Ftv4max.m3u8
公視,http://220.134.196.147:8554/http/61.219.99.20:8081/hls/87/80/Pts4max.m3u8
人間衛視,http://220.134.196.147:8515/http/61.219.99.20:8081/hls/69/811/ch36.m3u8
大愛電視,http://220.134.196.147:8549/http/61.219.99.20:8081/hls/73/815/ch52.m3u8
好消息GOOD TV,http://220.134.196.147:8523/http/61.219.99.20:8081/hls/74/816/ch53.m3u8
Trace Sport Stars,http://220.134.196.147:8569/http/61.219.99.20:8092/upload/212/TraceS_TS-1111_1.m3u8
DISCOVERY,http://220.134.196.147:8516/http/61.219.99.20:8081/hls/71/813/ch44.m3u8
旅遊生活,http://220.134.196.147:8557/http/61.219.99.20:8081/hls/70/812/ch38.m3u8
動物星球,http://220.134.196.147:8540/http/61.219.99.20:8081/hls/70/812/ch37.m3u8
亞洲旅遊,http://220.134.196.147:8579/http/61.219.99.20:8081/hls/76/818/ch61.m3u8
MOMO親子台,http://220.134.196.147:8517/http/61.219.99.20:8081/hls/90/80/momo4max.m3u8
東森幼幼HD,http://220.134.196.147:9588/http/61.219.99.20:8081/hls/63/805/ch09.m3u8
龍華卡通台,http://220.134.196.147:8568/http/61.219.99.20:8068/hls/14/80/cstv14.m3u8
緯來綜合HD,http://220.134.196.147:8533/http/61.219.99.20:8081/hls/68/810/ch32.m3u8
八大第一HD,http://220.134.196.147:8505/http/61.219.99.20:8081/hls/66/808/ch22.m3u8
八大綜合HD,http://220.134.196.147:8518/http/61.219.99.20:8081/hls/66/808/ch21.m3u8
三立台灣HD,http://220.134.196.147:8513/http/61.219.99.20:8081/hls/65/807/ch20.m3u8
三立都會HD,http://220.134.196.147:8503/http/61.219.99.20:8081/hls/65/807/ch19.m3u8
韓國娛樂台,http://220.134.196.147:8506/http/61.219.99.20:8092/upload/116/KMTV_TS-1111_1.m3u8
東森綜合HD,http://220.134.196.147:9553/http/61.219.99.20:8081/hls/63/805/ch12.m3u8
超視HD,http://220.134.196.147:8508/http/61.219.99.20:8081/hls/64/806/ch14.m3u8
中天綜合HD,http://220.134.196.147:8502/http/61.219.99.20:8081/hls/67/809/ch25.m3u8
中天娛樂HD,http://220.134.196.147:8509/http/61.219.99.20:8081/hls/67/809/ch26.m3u8
東風衛視,http://220.134.196.147:8537/http/61.219.99.20:8081/hls/68/810/ch31.m3u8
MUCH TV,http://220.134.196.147:8530/http/61.219.99.20:8081/hls/72/814/ch45.m3u8
東森戲劇HD,http://220.134.196.147:8536/http/61.219.99.20:8081/hls/64/806/ch13.m3u8
八大戲劇HD,http://220.134.196.147:8552/http/61.219.99.20:8081/hls/66/808/ch23.m3u8
TVBS歡樂HD,http://220.134.196.147:8522/http/61.219.99.20:8081/hls/65/807/ch17.m3u8
緯來戲劇,http://220.134.196.147:8504/http/61.219.99.20:8081/hls/69/811/ch33.m3u8
龍華戲劇台,http://220.134.196.147:8555/http/61.219.99.20:8068/hls/13/80/cstv13.m3u8
龍華日韓劇,http://220.134.196.147:8531/http/61.219.99.20:8068/hls/12/80/cstv12.m3u8
龍華偶像劇,http://220.134.196.147:8562/http/61.219.99.20:8068/hls/11/80/cstv11.m3u8
緯來日本HD,http://220.134.196.147:8565/http/61.219.99.20:8081/hls/69/811/ch34.m3u8
Taiwan Plus,http://220.134.196.147:8524/http/61.219.99.20:8081/hls/87/80/PtsTaiwanPlus4max.m3u8
年代新聞,http://220.134.196.147:8538/http/61.219.99.20:8081/hls/67/809/ch27.m3u8
東森新聞HD,http://220.134.196.147:8527/http/61.219.99.20:8081/hls/63/805/ch10.m3u8
中天新聞,http://220.134.196.147:8567/http/61.219.99.20:8081/hls/78/80/ch63max.m3u8
民視新聞,http://220.134.196.147:8519/http/61.219.99.20:8081/hls/85/80/FtvNews4max.m3u8
三立新聞HD,http://220.134.196.147:8541/http/61.219.99.20:8081/hls/65/807/ch18.m3u8
TVBS新聞HD,http://220.134.196.147:8542/http/61.219.99.20:8081/hls/75/817/ch59.m3u8
TVBS HD,http://220.134.196.147:8570/http/61.219.99.20:8081/hls/75/817/ch58.m3u8
非凡新聞HD,http://220.134.196.147:8571/http/61.219.99.20:8081/hls/75/817/ch57.m3u8
非凡商業HD,http://220.134.196.147:8511/http/61.219.99.20:8081/hls/74/816/ch56.m3u8
東森財經HD,http://220.134.196.147:8525/http/61.219.99.20:8081/hls/63/805/ch11.m3u8
寰宇新聞,http://220.134.196.147:8548/http/61.219.99.20:8081/hls/76/818/ch62.m3u8
壹新聞,http://220.134.196.147:8501/http/61.219.99.20:8081/hls/66/808/ch24.m3u8
Bloomberg News,http://220.134.196.147:8514/http/61.219.99.20:8078/hls/43/80/bloomber.m3u8
NHK HD,http://220.134.196.147:8534/http/61.219.99.20:8081/hls/62/804/ch06.m3u8
鏡電視新聞台,http://220.134.196.147:8561/http/61.219.99.20:8092/upload/114/MNEWS_TS-1111_1.m3u8
好萊塢電影HD,http://220.134.196.147:8543/http/61.219.99.20:8081/hls/74/816/ch55.m3u8
緯來電影HD,http://220.134.196.147:8574/http/61.219.99.20:8081/hls/69/811/ch35.m3u8
龍華電影台,http://220.134.196.147:8545/http/61.219.99.20:8068/hls/10/80/cstv10.m3u8
HBO,http://220.134.196.147:9520/http/61.219.99.20:8081/hls/71/813/ch41.m3u8
AXN,http://220.134.196.147:8526/http/61.219.99.20:8081/hls/71/813/ch43.m3u8
CINEMAX HD,http://220.134.196.147:8535/http/61.219.99.20:8081/hls/71/813/ch42.m3u8
AMC 電影台,http://220.134.196.147:8521/http/61.219.99.20:8092/upload/115/AMC_TS-1111_1.m3u8
寵物頻道,http://220.134.196.147:8532/http/59.120.8.187:8078/hls/40/80/pettv.m3u8
緯來育樂HD,http://220.134.196.147:8547/http/59.120.8.187:8081/hls/68/810/ch30.m3u8
緯來體育HD,http://220.134.196.147:8553/http/59.120.8.187:8081/hls/67/809/ch28.m3u8
博斯運動一,http://220.134.196.147:8564/http/61.219.99.20:8068/hls/15/80/cstv15.m3u8
momo綜合台,http://220.134.196.147:8575/http/59.120.8.187:8081/hls/76/818/momo_max.m3u8
DAZN 1,http://220.134.196.147:9120/http/59.120.8.187:8078/hls/25/80/esport.m3u8
DAZN 2,http://220.134.196.147:9119/http/59.120.8.187:8078/hls/26/80/esport2.m3u8
廈門衛視,http://220.134.196.147:8573/http/59.120.8.187:8078/hls/42/80/xmtv.m3u8
CCTV4-中央衛視,http://220.134.196.147:8559/http/59.120.8.187:8078/hls/42/80/cctv4.m3u8
海峽衛視,http://220.134.196.147:8550/http/59.120.8.187:8078/hls/42/80/fjttv.m3u8
浙江衛視,http://220.134.196.147:8512/http/59.120.8.187:8078/hls/41/80/zhejiang.m3u8
東方衛視,http://220.134.196.147:8558/http/59.120.8.187:8078/hls/41/80/east.m3u8
湖南衛視,http://220.134.196.147:8563/http/59.120.8.187:8078/hls/41/80/huana.m3u8
鳯凰衛視資訊,http://220.134.196.147:8577/http/59.120.8.187:8078/hls/20/80/phoenixif.m3u8
鳯凰衛視中文,http://220.134.196.147:8578/http/59.120.8.187:8078/hls/21/80/phoenixch.m3u8`;
    }

    async loadXiaofengSource() {
        try {
            // Show loading
            this.showLoading('載入曉峰直播源...');

            let playlistText;

            try {
                // Try to fetch from proxy first
                const response = await fetch('/api/xiaofeng');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                playlistText = await response.text();
            } catch (proxyError) {
                console.log('Proxy failed, trying direct connection:', proxyError);
                // Fallback to direct connection
                const response = await fetch('http://晓峰.azip.dpdns.org:5008/?type=m3u');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                playlistText = await response.text();
            }

            // Process the playlist with custom source name
            this.processPlaylistText(playlistText, '曉峰直播源');
        } catch (error) {
            console.error('Failed to load 曉峰直播源:', error);
            this.hideLoading();
            this.showError(`載入曉峰直播源失敗: ${error.message}`);
        }
    }

    async loadMiaokaiSource() {
        try {
            // Show loading
            this.showLoading('載入秒開直播源...');

            let playlistText;

            try {
                // Try to fetch from proxy first
                const response = await fetch('/api/miaokai');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                playlistText = await response.text();
            } catch (proxyError) {
                console.log('Proxy failed, trying direct connection:', proxyError);
                // Fallback to direct connection
                const response = await fetch('https://files.catbox.moe/zyat7k.m3u');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                playlistText = await response.text();
            }

            // Process the playlist with custom source name
            this.processPlaylistText(playlistText, '秒開直播源');
        } catch (error) {
            console.error('Failed to load 秒開直播源:', error);
            this.hideLoading();
            this.showError(`載入秒開直播源失敗: ${error.message}`);
        }
    }

    processPlaylistText(playlistText, sourceName = '黃金直播源') {
        console.log('Processing playlist text:', playlistText.substring(0, 200) + '...');

        // Initialize channel manager with the data
        this.channelManager = new ChannelManager();
        this.channelManager.loadFromText(playlistText);

        // Hide welcome overlay and show channel panel
        this.hideWelcomeOverlay();
        this.showChannelPanel();

        // Setup channel event listeners
        this.setupChannelEventListeners();

        // Render UI
        this.renderChannelList();
        this.renderCategoryButtons();

        this.hideLoading();

        // Update UI with success message
        this.updatePlayerInfo(sourceName, `已載入 ${this.channelManager.channels.length} 個頻道`);

        console.log(`${sourceName} loaded successfully: ${this.channelManager.channels.length} channels`);

        // 💾 保存頻道列表狀態，以便用戶返回時能看到
        this.saveChannelListState();
    }

    setupChannelEventListeners() {
        // Channel selection
        document.getElementById('channel-list').addEventListener('click', (e) => {
            const channelItem = e.target.closest('.channel-item');
            if (channelItem) {
                const channelId = parseInt(channelItem.dataset.channelId);
                this.selectChannel(channelId);
            }
        });

        // Category filtering
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.filterByCategory(category);
            });
        });

        // Search
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.searchChannels(e.target.value);
        });

        // Panel toggle
        document.getElementById('toggle-panel').addEventListener('click', () => {
            this.toggleChannelPanel();
        });
    }

    async selectChannel(channelId) {
        const channel = this.channelManager.getChannelById(channelId);
        console.log('Selecting channel:', channelId, channel);

        if (!channel) {
            console.error('Channel not found:', channelId);
            return;
        }

        console.log('Opening channel in new player page:', channel);

        // 跳轉到新的播放頁面
        this.openPlayerPage(channel);
    }

    openPlayerPage(channel) {
        // 將頻道數據編碼為 URL 參數
        const channelData = encodeURIComponent(JSON.stringify({
            id: channel.id,
            name: channel.name,
            url: channel.url,
            category: channel.category
        }));

        // 跳轉到播放頁面
        const playerUrl = `player.html?channel=${channelData}`;
        window.open(playerUrl, '_blank');
    }

    updateChannelSelection(channelId) {
        // Remove active class from all channels
        document.querySelectorAll('.channel-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to selected channel
        const selectedItem = document.querySelector(`[data-channel-id="${channelId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }
    }

    filterByCategory(category) {
        // Update category buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');

        // Filter channels
        this.channelManager.filterByCategory(category);
        this.renderChannelList();
    }

    searchChannels(searchTerm) {
        this.channelManager.searchChannels(searchTerm);
        this.renderChannelList();
    }

    showCustomSourceModal() {
        document.getElementById('custom-source-modal').classList.remove('hidden');
    }

    hideCustomSourceModal() {
        document.getElementById('custom-source-modal').classList.add('hidden');
        document.getElementById('playlist-file').value = '';
        document.getElementById('playlist-url').value = '';
    }

    showUrlSourceModal() {
        document.getElementById('url-source-modal').classList.remove('hidden');
    }

    hideUrlSourceModal() {
        document.getElementById('url-source-modal').classList.add('hidden');
        document.getElementById('stream-url').value = '';
        document.getElementById('stream-name').value = '';
    }

    async loadCustomPlaylist() {
        const fileInput = document.getElementById('playlist-file');
        const urlInput = document.getElementById('playlist-url');

        if (fileInput.files[0]) {
            await this.loadPlaylistFile(fileInput.files[0]);
        } else if (urlInput.value.trim()) {
            await this.loadPlaylistUrl(urlInput.value.trim());
        } else {
            this.showError('請選擇檔案或輸入網址');
            return;
        }

        this.hideCustomSourceModal();
    }

    async loadPlaylistFile(file) {
        try {
            this.showLoading('載入播放清單...');
            const text = await file.text();
            await this.parseAndLoadPlaylist(text, file.name);
        } catch (error) {
            console.error('Failed to load playlist file:', error);
            this.showError('載入播放清單檔案失敗');
        }
    }

    async loadPlaylistUrl(url) {
        try {
            this.showLoading('載入播放清單...');
            const response = await fetch(url);
            const text = await response.text();
            await this.parseAndLoadPlaylist(text, 'Custom Playlist');
        } catch (error) {
            console.error('Failed to load playlist URL:', error);
            this.showError('載入播放清單網址失敗');
        }
    }

    async parseAndLoadPlaylist(text, sourceName) {
        try {
            // Initialize channel manager with custom data
            this.channelManager = new ChannelManager();
            this.channelManager.loadFromText(text);

            // Update UI
            this.hideWelcomeOverlay();
            this.showChannelPanel();
            this.setupChannelEventListeners();

            // Update panel title
            document.getElementById('panel-title').textContent = sourceName;

            this.renderChannelList();
            this.renderCategoryButtons();

            this.hideLoading();
            console.log('Custom playlist loaded successfully');
        } catch (error) {
            console.error('Failed to parse playlist:', error);
            this.showError('播放清單格式錯誤');
            this.hideLoading();
        }
    }

    async playDirectUrl() {
        const urlInput = document.getElementById('stream-url');
        const nameInput = document.getElementById('stream-name');

        const url = urlInput.value.trim();
        if (!url) {
            this.showError('請輸入串流網址');
            return;
        }

        const name = nameInput.value.trim() || '直播頻道';

        try {
            // Create a single channel
            const channel = {
                id: 1,
                name: name,
                url: url,
                category: 'custom',
                isLive: true
            };

            // Hide welcome and modals
            this.hideWelcomeOverlay();
            this.hideUrlSourceModal();

            // Load the channel directly
            await this.player.loadChannel(channel);
            this.currentChannelId = 1;

            console.log(`Direct URL loaded: ${name}`);
        } catch (error) {
            console.error('Failed to play direct URL:', error);
            this.showError('無法播放此網址');
        }
    }

    hideWelcomeOverlay() {
        const overlay = document.getElementById('welcome-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            console.log('Welcome overlay hidden - showing channel selection');
        }
    }

    showChannelPanel() {
        const panel = document.getElementById('channel-panel');
        if (panel) {
            panel.classList.remove('hidden');
        }
    }

    showLoading(message = '載入中...') {
        const loading = document.getElementById('loading-indicator');
        if (loading) {
            loading.querySelector('span').textContent = message;
            loading.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loading = document.getElementById('loading-indicator');
        if (loading) {
            loading.classList.add('hidden');
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');

        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    }

    updatePlayerInfo(channelName, status) {
        const channelElement = document.getElementById('current-channel');
        const statusElement = document.getElementById('player-status');

        if (channelElement) channelElement.textContent = channelName;
        if (statusElement) statusElement.textContent = status;
    }

    async testPlayback() {
        console.log('Testing playback...');

        // Test with a simple channel
        const testChannel = {
            id: 999,
            name: '測試頻道 - 台視HD',
            url: 'http://220.134.196.147:9110/http/61.219.99.20:8081/hls/86/80/Ttv4max.m3u8',
            category: 'test',
            isLive: true
        };

        try {
            await this.player.loadChannel(testChannel);
            console.log('Test playback successful');
        } catch (error) {
            console.error('Test playback failed:', error);
            alert(`測試播放失敗: ${error.message}`);
        }
    }

    forcePlay() {
        const video = document.getElementById('video-player');
        console.log('Force playing video...');

        video.muted = false;
        video.play().then(() => {
            console.log('Force play successful');
            // 強制刷新視頻
            this.player.forceVideoRefresh();
        }).catch(error => {
            console.error('Force play failed:', error);
            alert(`強制播放失敗: ${error.message}`);
        });
    }

    checkVideoStatus() {
        const video = document.getElementById('video-player');
        console.log('=== Video Status Check ===');
        console.log('Video src:', video.src);
        console.log('Video current src:', video.currentSrc);
        console.log('Video ready state:', video.readyState);
        console.log('Video network state:', video.networkState);
        console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
        console.log('Video duration:', video.duration);
        console.log('Video current time:', video.currentTime);
        console.log('Video paused:', video.paused);
        console.log('Video muted:', video.muted);
        console.log('Video volume:', video.volume);
        console.log('Video tracks:', video.videoTracks?.length || 0);
        console.log('Audio tracks:', video.audioTracks?.length || 0);

        // 編解碼器支援檢測
        console.log('=== Codec Support Check ===');
        const codecs = [
            'video/mp4; codecs="avc1.42E01E"', // H.264 Baseline
            'video/mp4; codecs="avc1.4D401E"', // H.264 Main
            'video/mp4; codecs="avc1.64001E"', // H.264 High
            'video/mp4; codecs="hev1.1.6.L93.B0"', // H.265/HEVC
            'application/x-mpegURL', // HLS
            'application/vnd.apple.mpegurl' // HLS Apple
        ];

        codecs.forEach(codec => {
            const support = video.canPlayType(codec);
            console.log(`${codec}: ${support}`);
        });

        console.log('HLS.js supported:', typeof Hls !== 'undefined' && Hls.isSupported());
        console.log('User Agent:', navigator.userAgent);
        console.log('=========================');

        const codecInfo = codecs.map(codec => `${codec}: ${video.canPlayType(codec)}`).join('\n');
        alert(`視頻狀態:\n尺寸: ${video.videoWidth}x${video.videoHeight}\n就緒狀態: ${video.readyState}\n播放中: ${!video.paused}\n\n編解碼器支援:\n${codecInfo}`);
    }

    async testIPTVPlayer() {
        console.log('Testing professional IPTV player...');

        // 首先檢查視頻元素狀態
        this.checkVideoElementVisibility();

        const video = document.getElementById('video-player');
        const iptvPlayer = new IPTVPlayer(video);

        // 測試 URL - 台視HD
        const testUrl = 'http://220.134.196.147:9110/http/61.219.99.20:8081/hls/86/80/Ttv4max.m3u8';

        try {
            await iptvPlayer.loadStream(testUrl);
            console.log('IPTV Player test successful');
            alert('IPTV 播放器測試成功！');
        } catch (error) {
            console.error('IPTV Player test failed:', error);
            alert(`IPTV 播放器測試失敗: ${error.message}`);
        }
    }

    checkVideoElementVisibility() {
        const video = document.getElementById('video-player');
        const container = document.querySelector('.video-container');
        const overlay = document.getElementById('welcome-overlay');

        console.log('=== Video Element Visibility Check ===');
        console.log('Video element:', video);
        console.log('Video container:', container);
        console.log('Welcome overlay:', overlay);

        if (video) {
            const rect = video.getBoundingClientRect();
            const style = getComputedStyle(video);
            console.log('Video position:', rect);
            console.log('Video display:', style.display);
            console.log('Video visibility:', style.visibility);
            console.log('Video opacity:', style.opacity);
            console.log('Video z-index:', style.zIndex);
        }

        if (container) {
            const rect = container.getBoundingClientRect();
            const style = getComputedStyle(container);
            console.log('Container position:', rect);
            console.log('Container display:', style.display);
            console.log('Container z-index:', style.zIndex);
        }

        if (overlay) {
            const style = getComputedStyle(overlay);
            console.log('Overlay display:', style.display);
            console.log('Overlay z-index:', style.zIndex);
            console.log('Overlay has hidden class:', overlay.classList.contains('hidden'));
        }

        console.log('=====================================');
    }

    // 🔄 檢查並恢復頻道列表狀態
    checkAndRestoreChannelList() {
        // 檢查 localStorage 中是否有已載入的頻道數據
        const savedChannels = localStorage.getItem('supertv_channels');
        const savedChannelListState = localStorage.getItem('supertv_channel_list_visible');

        if (savedChannels && savedChannelListState === 'true') {
            console.log('Restoring channel list from previous session');

            try {
                const channelsData = JSON.parse(savedChannels);

                // 重新創建 ChannelManager
                this.channelManager = new ChannelManager();
                this.channelManager.channels = channelsData;

                // 隱藏歡迎覆蓋層並顯示頻道面板
                this.hideWelcomeOverlay();
                this.showChannelPanel();

                // 設置事件監聽器
                this.setupChannelEventListeners();

                // 渲染 UI
                this.renderChannelList();
                this.renderCategoryButtons();

                console.log(`Restored ${channelsData.length} channels from previous session`);

            } catch (error) {
                console.error('Failed to restore channel list:', error);
                // 清除損壞的數據
                localStorage.removeItem('supertv_channels');
                localStorage.removeItem('supertv_channel_list_visible');
            }
        }
    }

    // 💾 保存頻道列表狀態
    saveChannelListState() {
        if (this.channelManager && this.channelManager.channels) {
            localStorage.setItem('supertv_channels', JSON.stringify(this.channelManager.channels));
            localStorage.setItem('supertv_channel_list_visible', 'true');
            console.log('Channel list state saved');
        }
    }

    // 🗑️ 清除頻道列表狀態
    clearChannelListState() {
        localStorage.removeItem('supertv_channels');
        localStorage.removeItem('supertv_channel_list_visible');
        console.log('Channel list state cleared');
    }

    debugContainerSizes() {
        const elements = {
            'main-content': document.querySelector('.main-content'),
            'video-container': document.querySelector('.video-container'),
            'video-player': document.getElementById('video-player'),
            'welcome-overlay': document.getElementById('welcome-overlay')
        };

        console.log('=== Container Size Debug ===');

        Object.entries(elements).forEach(([name, element]) => {
            if (element) {
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                console.log(`${name}:`, {
                    width: rect.width,
                    height: rect.height,
                    display: style.display,
                    visibility: style.visibility,
                    opacity: style.opacity,
                    zIndex: style.zIndex,
                    position: style.position
                });
            } else {
                console.log(`${name}: NOT FOUND`);
            }
        });

        console.log('============================');
    }

    fixVideoDisplay() {
        console.log('Attempting to fix video display...');

        // 強制隱藏 welcome overlay
        const overlay = document.getElementById('welcome-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.classList.add('hidden');
            console.log('Welcome overlay forcibly hidden');
        }

        // 確保視頻容器可見
        const container = document.querySelector('.video-container');
        if (container) {
            container.style.display = 'block';
            container.style.visibility = 'visible';
            container.style.opacity = '1';
            container.style.zIndex = '1';
            console.log('Video container made visible');
        }

        // 確保視頻元素可見
        const video = document.getElementById('video-player');
        if (video) {
            video.style.display = 'block';
            video.style.visibility = 'visible';
            video.style.opacity = '1';
            video.style.zIndex = '1';
            console.log('Video element made visible');
        }

        // 移除任何可能的遮擋元素
        const loadingIndicator = document.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
            console.log('Loading indicator hidden');
        }

        const errorMessage = document.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.style.display = 'none';
            console.log('Error message hidden');
        }

        // 檢查修復後的狀態
        this.checkVideoElementVisibility();

        alert('視頻顯示修復完成！如果仍然看不到視頻，請嘗試載入頻道。');
    }

    renderChannelList() {
        if (!this.channelManager) return;

        const channelList = document.getElementById('channel-list');
        const channels = this.channelManager.getChannels();

        channelList.innerHTML = '';

        channels.forEach(channel => {
            const channelItem = document.createElement('div');
            channelItem.className = 'channel-item';
            channelItem.dataset.channelId = channel.id;

            channelItem.innerHTML = `
                <div class="channel-name">${channel.name}</div>
            `;

            channelList.appendChild(channelItem);
        });

        // Update channel count
        const countElement = document.getElementById('channel-count');
        if (countElement) {
            countElement.textContent = `${channels.length} 個頻道`;
        }
    }

    renderCategoryButtons() {
        const categories = this.channelManager.getCategories();
        const categoryNames = {
            all: '全部',
            news: '新聞',
            entertainment: '綜藝',
            drama: '戲劇',
            movie: '電影',
            sports: '體育',
            kids: '兒童',
            international: '國際'
        };

        document.querySelectorAll('.category-btn').forEach(btn => {
            const category = btn.dataset.category;
            const count = categories[category] || 0;
            btn.textContent = `${categoryNames[category]} (${count})`;
        });
    }

    toggleChannelPanel() {
        const panel = document.querySelector('.channel-panel');
        const toggleBtn = document.getElementById('toggle-panel');
        
        this.isChannelPanelCollapsed = !this.isChannelPanelCollapsed;
        
        if (this.isChannelPanelCollapsed) {
            panel.style.width = '60px';
            panel.style.overflow = 'hidden';
            toggleBtn.textContent = '展開';
        } else {
            panel.style.width = '350px';
            panel.style.overflow = 'visible';
            toggleBtn.textContent = '收合';
        }
    }

    updatePlayPauseButton(isPlaying) {
        const playIcon = document.querySelector('.play-icon');
        const pauseIcon = document.querySelector('.pause-icon');
        
        if (isPlaying) {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        } else {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        }
    }

    toggleFullscreen() {
        const videoContainer = document.querySelector('.video-container');
        
        if (!document.fullscreenElement) {
            videoContainer.requestFullscreen().catch(console.error);
        } else {
            document.exitFullscreen().catch(console.error);
        }
    }

    showSettingsModal() {
        const modal = document.getElementById('settings-modal');
        modal.classList.remove('hidden');
        
        // Load current settings
        const settings = this.player.settings;
        document.getElementById('player-engine').value = settings.engine;
        document.getElementById('hardware-decode').checked = settings.hardwareDecode;
        document.getElementById('auto-play').checked = settings.autoPlay;
        document.getElementById('buffer-size').value = settings.bufferSize;
    }

    hideSettingsModal() {
        const modal = document.getElementById('settings-modal');
        modal.classList.add('hidden');
    }

    handleKeyboardShortcuts(e) {
        // Prevent shortcuts when typing in input fields
        if (e.target.tagName === 'INPUT') return;

        switch (e.key) {
            case ' ':
                e.preventDefault();
                document.getElementById('play-pause-btn').click();
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                this.toggleFullscreen();
                break;
            case 'm':
            case 'M':
                e.preventDefault();
                document.getElementById('mute-btn').click();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.adjustVolume(10);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.adjustVolume(-10);
                break;
            case 'd':
            case 'D':
                e.preventDefault();
                this.toggleDebugButtons();
                break;
            case 'Escape':
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                }
                break;
        }
    }

    toggleDebugButtons() {
        const debugButtons = document.getElementById('debug-buttons');
        if (debugButtons) {
            const isVisible = debugButtons.style.display !== 'none';
            debugButtons.style.display = isVisible ? 'none' : 'flex';
            console.log('Debug buttons:', isVisible ? 'hidden' : 'shown');
        }
    }

    adjustVolume(delta) {
        const volumeSlider = document.getElementById('volume-slider');
        const currentVolume = parseInt(volumeSlider.value);
        const newVolume = Math.max(0, Math.min(100, currentVolume + delta));
        
        volumeSlider.value = newVolume;
        this.player.setVolume(newVolume);
    }

    loadSettings() {
        // Load any app-specific settings
        const saved = localStorage.getItem('supertv-app-settings');
        if (saved) {
            const settings = JSON.parse(saved);
            // Apply any app settings here
        }
    }

    saveSettings() {
        // Save app-specific settings
        const settings = {
            lastChannelId: this.currentChannelId,
            panelCollapsed: this.isChannelPanelCollapsed
        };
        localStorage.setItem('supertv-app-settings', JSON.stringify(settings));
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.superTV = new SuperTVApp();
});

// Save settings before page unload
window.addEventListener('beforeunload', () => {
    if (window.superTV) {
        window.superTV.saveSettings();
    }
});
