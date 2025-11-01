/**
 * PWA 安裝提示管理器
 * 處理 PWA 安裝提示和更新通知
 */

import { createLogger } from './logger.js';

const logger = createLogger('PWA');

class PWAInstallManager {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.updateAvailable = false;
        
        this.init();
    }

    init() {
        // 檢查是否已安裝
        this.checkInstallStatus();
        
        // 監聽安裝提示事件
        this.setupInstallPrompt();
        
        // 監聽 Service Worker 更新
        this.setupUpdateListener();
        
        // 監聽安裝成功事件
        this.setupInstallListener();
    }

    /**
     * 檢查 PWA 安裝狀態
     */
    checkInstallStatus() {
        // 檢查是否在獨立模式下運行（已安裝）
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isIOSStandalone = window.navigator.standalone === true;
        
        this.isInstalled = isStandalone || isIOSStandalone;
        
        if (this.isInstalled) {
            logger.info('✅ PWA 已安裝並在獨立模式下運行');
            this.hideInstallPrompt();
        } else {
            logger.info('📱 PWA 未安裝，可以提示用戶安裝');
        }
    }

    /**
     * 設置安裝提示
     */
    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            logger.info('💡 收到安裝提示事件');
            
            // 阻止默認的安裝提示
            e.preventDefault();
            
            // 保存事件，稍後使用
            this.deferredPrompt = e;
            
            // 顯示自定義安裝按鈕
            this.showInstallPrompt();
        });
    }

    /**
     * 設置更新監聽器
     */
    setupUpdateListener() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                logger.info('🔄 Service Worker 已更新');
                this.showUpdateNotification();
            });
        }
    }

    /**
     * 設置安裝成功監聽器
     */
    setupInstallListener() {
        window.addEventListener('appinstalled', () => {
            logger.info('✅ PWA 安裝成功！');
            this.isInstalled = true;
            this.deferredPrompt = null;
            this.hideInstallPrompt();
            this.showSuccessNotification();
        });
    }

    /**
     * 顯示安裝提示
     */
    showInstallPrompt() {
        // 檢查是否已經有安裝提示元素
        let installBanner = document.getElementById('pwa-install-banner');
        
        if (!installBanner) {
            installBanner = this.createInstallBanner();
            document.body.appendChild(installBanner);
        }
        
        // 延遲顯示，避免干擾用戶
        setTimeout(() => {
            installBanner.classList.add('show');
        }, 3000);
    }

    /**
     * 創建安裝橫幅
     */
    createInstallBanner() {
        const banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.className = 'pwa-install-banner';
        banner.innerHTML = `
            <div class="pwa-banner-content">
                <div class="pwa-banner-icon">📱</div>
                <div class="pwa-banner-text">
                    <strong>安裝 SuperTV</strong>
                    <p>安裝到主屏幕，享受更好的體驗</p>
                </div>
                <div class="pwa-banner-actions">
                    <button id="pwa-install-btn" class="pwa-btn-install">安裝</button>
                    <button id="pwa-dismiss-btn" class="pwa-btn-dismiss">×</button>
                </div>
            </div>
        `;
        
        // 添加樣式
        this.injectStyles();
        
        // 綁定事件
        banner.querySelector('#pwa-install-btn').addEventListener('click', () => {
            this.promptInstall();
        });
        
        banner.querySelector('#pwa-dismiss-btn').addEventListener('click', () => {
            this.hideInstallPrompt();
        });
        
        return banner;
    }

    /**
     * 提示用戶安裝
     */
    async promptInstall() {
        if (!this.deferredPrompt) {
            logger.warn('⚠️ 沒有可用的安裝提示');
            return;
        }
        
        // 顯示安裝提示
        this.deferredPrompt.prompt();
        
        // 等待用戶響應
        const { outcome } = await this.deferredPrompt.userChoice;
        
        logger.info(`👤 用戶選擇: ${outcome}`);
        
        if (outcome === 'accepted') {
            logger.info('✅ 用戶接受安裝');
        } else {
            logger.info('❌ 用戶拒絕安裝');
        }
        
        // 清除保存的提示
        this.deferredPrompt = null;
        this.hideInstallPrompt();
    }

    /**
     * 隱藏安裝提示
     */
    hideInstallPrompt() {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.remove();
            }, 300);
        }
    }

    /**
     * 顯示更新通知
     */
    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'pwa-update-notification';
        notification.innerHTML = `
            <div class="pwa-notification-content">
                <span>🎉 新版本可用！</span>
                <button id="pwa-reload-btn" class="pwa-btn-reload">重新載入</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        notification.querySelector('#pwa-reload-btn').addEventListener('click', () => {
            window.location.reload();
        });
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
    }

    /**
     * 顯示安裝成功通知
     */
    showSuccessNotification() {
        const notification = document.createElement('div');
        notification.className = 'pwa-success-notification';
        notification.innerHTML = `
            <div class="pwa-notification-content">
                ✅ SuperTV 已成功安裝！
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * 注入 PWA 樣式
     */
    injectStyles() {
        if (document.getElementById('pwa-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'pwa-styles';
        style.textContent = `
            .pwa-install-banner {
                position: fixed;
                bottom: -100px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                color: white;
                padding: 16px 20px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                max-width: 90%;
                width: 400px;
                transition: bottom 0.3s ease;
            }
            
            .pwa-install-banner.show {
                bottom: 20px;
            }
            
            .pwa-banner-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .pwa-banner-icon {
                font-size: 32px;
            }
            
            .pwa-banner-text {
                flex: 1;
            }
            
            .pwa-banner-text strong {
                display: block;
                font-size: 16px;
                margin-bottom: 4px;
            }
            
            .pwa-banner-text p {
                margin: 0;
                font-size: 13px;
                opacity: 0.9;
            }
            
            .pwa-banner-actions {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            
            .pwa-btn-install {
                background: white;
                color: #1e3c72;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s;
            }
            
            .pwa-btn-install:hover {
                transform: scale(1.05);
            }
            
            .pwa-btn-dismiss {
                background: transparent;
                color: white;
                border: none;
                font-size: 24px;
                cursor: pointer;
                padding: 0 8px;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            
            .pwa-btn-dismiss:hover {
                opacity: 1;
            }
            
            .pwa-update-notification,
            .pwa-success-notification {
                position: fixed;
                top: -100px;
                left: 50%;
                transform: translateX(-50%);
                background: #4CAF50;
                color: white;
                padding: 16px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                z-index: 10001;
                transition: top 0.3s ease;
            }
            
            .pwa-update-notification.show,
            .pwa-success-notification.show {
                top: 20px;
            }
            
            .pwa-notification-content {
                display: flex;
                align-items: center;
                gap: 16px;
            }
            
            .pwa-btn-reload {
                background: white;
                color: #4CAF50;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                font-weight: 600;
                cursor: pointer;
            }
            
            @media (max-width: 480px) {
                .pwa-install-banner {
                    width: calc(100% - 32px);
                }
                
                .pwa-banner-content {
                    flex-wrap: wrap;
                }
                
                .pwa-banner-actions {
                    width: 100%;
                    justify-content: flex-end;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// 自動初始化
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        window.pwaManager = new PWAInstallManager();
    });
}

export default PWAInstallManager;

