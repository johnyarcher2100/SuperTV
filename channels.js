// 📝 導入 Logger 工具
import { createLogger } from './logger.js';

// 創建 ChannelManager 專用的 logger
const logger = createLogger('ChannelManager');

// 🎨 頻道圖標映射表
// 注意：移除了所有無效的 placeholder URL
// 現在使用 CSS 生成的文字圖標作為默認顯示
// 如果未來有真實圖標，可以在這裡添加
const CHANNEL_LOGOS = {
    // 預留給未來的真實圖標
    // 例如：'台視': 'https://example.com/ttv-logo.png'
};

// 根據頻道名稱獲取圖標
function getChannelLogo(channelName) {
    // 嘗試精確匹配
    if (CHANNEL_LOGOS[channelName]) {
        return CHANNEL_LOGOS[channelName];
    }

    // 嘗試部分匹配
    for (const [key, logo] of Object.entries(CHANNEL_LOGOS)) {
        if (channelName.includes(key)) {
            return logo;
        }
    }

    // 返回 null，使用 CSS 文字圖標
    // 這樣可以避免無效的網路請求
    return null;
}

// 根據頻道名稱生成文字圖標
function getChannelTextIcon(channelName) {
    // 移除 HD 等後綴
    const cleanName = channelName.replace(/HD|4K|台|頻道/g, '').trim();

    // 取前兩個字符
    return cleanName.substring(0, 2) || channelName.substring(0, 2);
}

// Channel data and management
class ChannelManager {
    constructor() {
        this.channels = [];
        this.filteredChannels = [];
        this.currentCategory = 'all';
        this.searchTerm = '';
        this.init();
    }

    init() {
        // Don't auto-load data, wait for user selection
    }

    loadFromText(playlistText) {
        this.parseChannelData(playlistText);
        // categorizeChannels is not needed as categorization is done during parsing
    }

    parseChannelData(playlistText = null) {
        // Use provided text or default golden source data
        const rawChannelData = playlistText || `台視HD,http://220.134.196.147:9110/http/61.219.99.20:8081/hls/86/80/Ttv4max.m3u8
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

        // Parse the channel data
        this.channels = this.parsePlaylistFormat(rawChannelData);
        this.filteredChannels = [...this.channels];
    }

    parsePlaylistFormat(data) {
        const lines = data.trim().split('\n');
        const channels = [];
        let currentChannel = null;
        let channelId = 1;

        logger.debug(`Parsing playlist with ${lines.length} lines`);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip empty lines and comments
            if (!line || line.startsWith('#') && !line.startsWith('#EXTINF:')) {
                continue;
            }

            if (line.startsWith('#EXTINF:')) {
                // M3U format
                const nameMatch = line.match(/,(.+)$/);
                if (nameMatch) {
                    const channelName = nameMatch[1].trim();
                    currentChannel = {
                        id: channelId++,
                        name: channelName,
                        url: null,
                        category: null,
                        isHD: channelName.includes('HD'),
                        isLive: true,
                        logo: getChannelLogo(channelName),
                        textIcon: getChannelTextIcon(channelName)
                    };
                }
            } else if (line.startsWith('http') && currentChannel) {
                // URL line following EXTINF
                currentChannel.url = line;
                currentChannel.category = this.categorizeChannel(currentChannel.name);
                channels.push(currentChannel);
                currentChannel = null;
            } else if (line.includes(',') && line.includes('http')) {
                // Simple CSV format: name,url
                const commaIndex = line.indexOf(',');
                const name = line.substring(0, commaIndex).trim();
                const url = line.substring(commaIndex + 1).trim();

                if (name && url && url.startsWith('http')) {
                    channels.push({
                        id: channelId++,
                        name: name,
                        url: url,
                        category: this.categorizeChannel(name),
                        isHD: name.includes('HD'),
                        isLive: true,
                        logo: getChannelLogo(name),
                        textIcon: getChannelTextIcon(name)
                    });
                }
            } else if (line.startsWith('http') && !currentChannel) {
                // Direct URL without name
                const channelName = `頻道 ${channelId - 1}`;
                channels.push({
                    id: channelId++,
                    name: channelName,
                    url: line,
                    category: 'entertainment',
                    isHD: false,
                    isLive: true,
                    logo: getChannelLogo(channelName),
                    textIcon: getChannelTextIcon(channelName)
                });
            }
        }

        logger.debug(`Parsed ${channels.length} channels successfully`);
        return channels;
    }

    categorizeChannel(name) {
        const newsKeywords = ['新聞', '財經', 'News', 'Bloomberg', 'NHK'];
        const entertainmentKeywords = ['綜合', '娛樂', '歡樂', 'MUCH', '韓國娛樂'];
        const dramaKeywords = ['戲劇', '偶像劇', '日韓劇', '日本'];
        const movieKeywords = ['電影', 'HBO', 'AXN', 'CINEMAX', 'AMC', '好萊塢'];
        const sportsKeywords = ['體育', '運動', '育樂', 'DAZN', 'Sport', 'Trace'];
        const kidsKeywords = ['親子', '幼幼', '卡通', 'MOMO'];
        const internationalKeywords = ['衛視', 'CCTV', '廈門', '浙江', '東方', '湖南', '鳯凰', 'Taiwan Plus'];

        if (newsKeywords.some(keyword => name.includes(keyword))) return 'news';
        if (entertainmentKeywords.some(keyword => name.includes(keyword))) return 'entertainment';
        if (dramaKeywords.some(keyword => name.includes(keyword))) return 'drama';
        if (movieKeywords.some(keyword => name.includes(keyword))) return 'movie';
        if (sportsKeywords.some(keyword => name.includes(keyword))) return 'sports';
        if (kidsKeywords.some(keyword => name.includes(keyword))) return 'kids';
        if (internationalKeywords.some(keyword => name.includes(keyword))) return 'international';

        // Default category for main Taiwan channels
        const mainChannels = ['台視', '中視', '華視', '民視', '公視'];
        if (mainChannels.some(channel => name.includes(channel))) return 'entertainment';

        return 'entertainment'; // Default category
    }

    getChannels() {
        return this.filteredChannels;
    }

    getChannelById(id) {
        return this.channels.find(channel => channel.id === id);
    }

    getChannelsByCategory(category) {
        if (category === 'all') {
            return this.channels;
        }
        return this.channels.filter(channel => channel.category === category);
    }

    searchChannels(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.applyFilters();
    }

    filterByCategory(category) {
        this.currentCategory = category;
        this.applyFilters();
    }

    applyFilters() {
        let filtered = this.channels;

        // Apply category filter
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(channel => channel.category === this.currentCategory);
        }

        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(channel => 
                channel.name.toLowerCase().includes(this.searchTerm)
            );
        }

        this.filteredChannels = filtered;
    }

    getCategoryCount(category) {
        if (category === 'all') {
            return this.channels.length;
        }
        return this.channels.filter(channel => channel.category === category).length;
    }

    getCategories() {
        return {
            all: this.getCategoryCount('all'),
            news: this.getCategoryCount('news'),
            entertainment: this.getCategoryCount('entertainment'),
            drama: this.getCategoryCount('drama'),
            movie: this.getCategoryCount('movie'),
            sports: this.getCategoryCount('sports'),
            kids: this.getCategoryCount('kids'),
            international: this.getCategoryCount('international')
        };
    }
}

// Export for use in other files
export { ChannelManager };
// Also export to window for backward compatibility
window.ChannelManager = ChannelManager;
