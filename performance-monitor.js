/**
 * 性能監控類
 * 追蹤關鍵性能指標，幫助優化決策
 */

import { createLogger } from './logger.js';

const logger = createLogger('PerformanceMonitor');

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            pageLoad: null,
            firstPaint: null,
            firstContentfulPaint: null,
            domContentLoaded: null,
            loadComplete: null,
            timeToInteractive: null,
            channelSwitches: [],
            hlsLoadTimes: [],
            renderTimes: [],
            memoryUsage: []
        };

        this.marks = new Map();
        this.measures = new Map();
        
        // 自動收集頁面載入指標
        this.collectPageLoadMetrics();
        
        // 定期收集記憶體使用情況（每 30 秒）
        if (performance.memory) {
            this.memoryInterval = setInterval(() => {
                this.recordMemoryUsage();
            }, 30000);
        }

        logger.info('Performance monitor initialized');
    }

    /**
     * 收集頁面載入指標
     */
    collectPageLoadMetrics() {
        if (document.readyState === 'complete') {
            this.processPageLoadMetrics();
        } else {
            window.addEventListener('load', () => {
                // 等待一小段時間確保所有指標都可用
                setTimeout(() => {
                    this.processPageLoadMetrics();
                }, 100);
            });
        }
    }

    /**
     * 處理頁面載入指標
     */
    processPageLoadMetrics() {
        try {
            const perfData = performance.getEntriesByType('navigation')[0];
            
            if (perfData) {
                this.metrics.pageLoad = {
                    dns: perfData.domainLookupEnd - perfData.domainLookupStart,
                    tcp: perfData.connectEnd - perfData.connectStart,
                    request: perfData.responseStart - perfData.requestStart,
                    response: perfData.responseEnd - perfData.responseStart,
                    domProcessing: perfData.domComplete - perfData.domInteractive,
                    loadComplete: perfData.loadEventEnd - perfData.fetchStart,
                    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart
                };

                this.metrics.loadComplete = perfData.loadEventEnd - perfData.fetchStart;
                this.metrics.domContentLoaded = perfData.domContentLoadedEventEnd - perfData.fetchStart;
            }

            // 收集 Paint Timing
            const paintEntries = performance.getEntriesByType('paint');
            paintEntries.forEach(entry => {
                if (entry.name === 'first-paint') {
                    this.metrics.firstPaint = entry.startTime;
                } else if (entry.name === 'first-contentful-paint') {
                    this.metrics.firstContentfulPaint = entry.startTime;
                }
            });

            logger.info('Page load metrics collected', this.metrics.pageLoad);
        } catch (error) {
            logger.error('Failed to collect page load metrics:', error);
        }
    }

    /**
     * 記錄記憶體使用情況
     */
    recordMemoryUsage() {
        if (!performance.memory) return;

        const memory = {
            timestamp: Date.now(),
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
            usedMB: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
            totalMB: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)
        };

        this.metrics.memoryUsage.push(memory);

        // 只保留最近 20 個記錄
        if (this.metrics.memoryUsage.length > 20) {
            this.metrics.memoryUsage.shift();
        }

        logger.debug(`Memory usage: ${memory.usedMB} MB / ${memory.totalMB} MB`);
    }

    /**
     * 開始計時
     * @param {string} name - 計時名稱
     */
    startMark(name) {
        const markName = `mark_${name}_start`;
        performance.mark(markName);
        this.marks.set(name, markName);
        logger.debug(`Started timing: ${name}`);
    }

    /**
     * 結束計時並記錄
     * @param {string} name - 計時名稱
     * @returns {number} 經過的時間（毫秒）
     */
    endMark(name) {
        const startMarkName = this.marks.get(name);
        if (!startMarkName) {
            logger.warn(`No start mark found for: ${name}`);
            return null;
        }

        const endMarkName = `mark_${name}_end`;
        const measureName = `measure_${name}`;

        try {
            performance.mark(endMarkName);
            performance.measure(measureName, startMarkName, endMarkName);

            const measure = performance.getEntriesByName(measureName)[0];
            const duration = measure.duration;

            this.measures.set(name, duration);
            logger.debug(`Completed timing: ${name} = ${duration.toFixed(2)}ms`);

            // 清理標記
            performance.clearMarks(startMarkName);
            performance.clearMarks(endMarkName);
            performance.clearMeasures(measureName);

            return duration;
        } catch (error) {
            logger.error(`Failed to measure ${name}:`, error);
            return null;
        }
    }

    /**
     * 記錄頻道切換時間
     * @param {number} duration - 切換耗時（毫秒）
     * @param {string} channelName - 頻道名稱
     */
    recordChannelSwitch(duration, channelName) {
        this.metrics.channelSwitches.push({
            timestamp: Date.now(),
            duration,
            channelName
        });

        // 只保留最近 50 次切換記錄
        if (this.metrics.channelSwitches.length > 50) {
            this.metrics.channelSwitches.shift();
        }

        logger.info(`Channel switch to ${channelName}: ${duration.toFixed(2)}ms`);
    }

    /**
     * 記錄 HLS.js 載入時間
     * @param {number} duration - 載入耗時（毫秒）
     */
    recordHlsLoad(duration) {
        this.metrics.hlsLoadTimes.push({
            timestamp: Date.now(),
            duration
        });

        // 只保留最近 20 次記錄
        if (this.metrics.hlsLoadTimes.length > 20) {
            this.metrics.hlsLoadTimes.shift();
        }

        logger.info(`HLS.js loaded in ${duration.toFixed(2)}ms`);
    }

    /**
     * 記錄渲染時間
     * @param {string} component - 組件名稱
     * @param {number} duration - 渲染耗時（毫秒）
     */
    recordRender(component, duration) {
        this.metrics.renderTimes.push({
            timestamp: Date.now(),
            component,
            duration
        });

        // 只保留最近 100 次記錄
        if (this.metrics.renderTimes.length > 100) {
            this.metrics.renderTimes.shift();
        }

        logger.debug(`${component} rendered in ${duration.toFixed(2)}ms`);
    }

    /**
     * 獲取平均頻道切換時間
     * @returns {number} 平均時間（毫秒）
     */
    getAverageChannelSwitchTime() {
        if (this.metrics.channelSwitches.length === 0) return 0;

        const total = this.metrics.channelSwitches.reduce((sum, record) => sum + record.duration, 0);
        return total / this.metrics.channelSwitches.length;
    }

    /**
     * 獲取平均 HLS 載入時間
     * @returns {number} 平均時間（毫秒）
     */
    getAverageHlsLoadTime() {
        if (this.metrics.hlsLoadTimes.length === 0) return 0;

        const total = this.metrics.hlsLoadTimes.reduce((sum, record) => sum + record.duration, 0);
        return total / this.metrics.hlsLoadTimes.length;
    }

    /**
     * 獲取當前記憶體使用情況
     * @returns {Object} 記憶體使用資訊
     */
    getCurrentMemoryUsage() {
        if (!performance.memory) {
            return { supported: false };
        }

        return {
            supported: true,
            usedMB: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
            totalMB: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2),
            limitMB: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2),
            usagePercent: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(2)
        };
    }

    /**
     * 生成性能報告
     * @returns {Object} 性能報告
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            pageLoad: this.metrics.pageLoad,
            paint: {
                firstPaint: this.metrics.firstPaint,
                firstContentfulPaint: this.metrics.firstContentfulPaint
            },
            timing: {
                domContentLoaded: this.metrics.domContentLoaded,
                loadComplete: this.metrics.loadComplete
            },
            channelSwitches: {
                count: this.metrics.channelSwitches.length,
                average: this.getAverageChannelSwitchTime().toFixed(2),
                recent: this.metrics.channelSwitches.slice(-10)
            },
            hlsLoad: {
                count: this.metrics.hlsLoadTimes.length,
                average: this.getAverageHlsLoadTime().toFixed(2),
                recent: this.metrics.hlsLoadTimes.slice(-5)
            },
            memory: this.getCurrentMemoryUsage(),
            memoryHistory: this.metrics.memoryUsage.slice(-10)
        };

        return report;
    }

    /**
     * 打印性能報告到控制台
     */
    printReport() {
        const report = this.generateReport();
        
        console.group('📊 Performance Report');
        console.log('⏱️  Page Load:', report.pageLoad);
        console.log('🎨 Paint Timing:', report.paint);
        console.log('📺 Channel Switches:', report.channelSwitches);
        console.log('📦 HLS.js Load:', report.hlsLoad);
        console.log('💾 Memory Usage:', report.memory);
        console.groupEnd();

        return report;
    }

    /**
     * 清理資源
     */
    destroy() {
        if (this.memoryInterval) {
            clearInterval(this.memoryInterval);
        }
        logger.info('Performance monitor destroyed');
    }
}

// 創建全局實例
const performanceMonitor = new PerformanceMonitor();

// 暴露到 window 以便調試
if (typeof window !== 'undefined') {
    window.performanceMonitor = performanceMonitor;
}

export default performanceMonitor;

