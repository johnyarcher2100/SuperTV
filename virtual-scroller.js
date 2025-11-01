// 📝 導入 Logger 工具
import { createLogger } from './logger.js';
import performanceMonitor from './performance-monitor.js';

// 創建 VirtualScroller 專用的 logger
const logger = createLogger('VirtualScroller');

/**
 * 🚀 虛擬滾動器 - 只渲染可見區域的項目
 * 
 * 特點：
 * - 支持網格佈局（多列）
 * - 自動計算可見項目
 * - 動態渲染和回收 DOM 節點
 * - 平滑滾動體驗
 * - 響應式設計（自動適應列數變化）
 */
class VirtualScroller {
    constructor(options) {
        // 必需參數
        this.container = options.container; // 滾動容器
        this.renderItem = options.renderItem; // 渲染單個項目的函數
        
        // 可選參數
        this.itemHeight = options.itemHeight || 120; // 每個項目的高度（px）
        this.columns = options.columns || 4; // 列數
        this.gap = options.gap || 20; // 項目間距（px）
        this.overscan = options.overscan || 2; // 預渲染的行數（上下各多渲染幾行）
        
        // 內部狀態
        this.items = []; // 所有項目數據
        this.visibleItems = []; // 當前可見的項目
        this.scrollTop = 0; // 當前滾動位置
        this.containerHeight = 0; // 容器高度
        this.totalHeight = 0; // 總內容高度
        
        // DOM 元素
        this.viewport = null; // 視口容器
        this.content = null; // 內容容器
        
        // 性能優化
        this.rafId = null; // requestAnimationFrame ID
        this.resizeObserver = null; // ResizeObserver
        
        this.init();
    }

    init() {
        logger.debug('Initializing VirtualScroller');
        
        // 創建虛擬滾動結構
        this.createStructure();
        
        // 綁定事件
        this.bindEvents();
        
        // 初始渲染
        this.update();
        
        logger.info('VirtualScroller initialized', {
            itemHeight: this.itemHeight,
            columns: this.columns,
            gap: this.gap
        });
    }

    createStructure() {
        // 清空容器
        this.container.innerHTML = '';
        
        // 創建視口（用於滾動）
        this.viewport = document.createElement('div');
        this.viewport.className = 'virtual-scroller-viewport';
        this.viewport.style.cssText = `
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;
            position: relative;
        `;
        
        // 創建內容容器（用於撐開高度）
        this.content = document.createElement('div');
        this.content.className = 'virtual-scroller-content';
        this.content.style.cssText = `
            position: relative;
            width: 100%;
        `;
        
        this.viewport.appendChild(this.content);
        this.container.appendChild(this.viewport);
        
        // 獲取容器高度
        this.updateContainerHeight();
    }

    bindEvents() {
        // 滾動事件（使用 RAF 優化）
        this.viewport.addEventListener('scroll', () => {
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
            }
            this.rafId = requestAnimationFrame(() => {
                this.onScroll();
            });
        });
        
        // 監聽容器大小變化
        this.resizeObserver = new ResizeObserver(() => {
            this.updateContainerHeight();
            this.update();
        });
        this.resizeObserver.observe(this.container);
        
        // 監聽窗口大小變化（響應式列數）
        window.addEventListener('resize', () => {
            this.updateColumns();
            this.update();
        });
    }

    updateContainerHeight() {
        this.containerHeight = this.viewport.clientHeight;
        logger.debug('Container height updated:', this.containerHeight);
    }

    updateColumns() {
        // 根據窗口寬度自動調整列數（與 CSS 媒體查詢保持一致）
        const width = window.innerWidth;
        
        if (width >= 1400) {
            this.columns = 5;
        } else if (width >= 1200) {
            this.columns = 4;
        } else if (width >= 769) {
            this.columns = 3;
        } else {
            this.columns = 2;
        }
        
        logger.debug('Columns updated:', this.columns);
    }

    onScroll() {
        this.scrollTop = this.viewport.scrollTop;
        this.update();
    }

    setItems(items) {
        logger.debug('Setting items:', items.length);
        this.items = items;
        this.calculateTotalHeight();
        this.update();
    }

    calculateTotalHeight() {
        // 計算總行數
        const totalRows = Math.ceil(this.items.length / this.columns);
        
        // 計算總高度（行數 * 項目高度 + 間距）
        this.totalHeight = totalRows * (this.itemHeight + this.gap) - this.gap;
        
        // 設置內容容器高度（撐開滾動條）
        this.content.style.height = `${this.totalHeight}px`;
        
        logger.debug('Total height calculated:', {
            totalRows,
            totalHeight: this.totalHeight,
            itemCount: this.items.length
        });
    }

    update() {
        if (this.items.length === 0) {
            this.content.innerHTML = '';
            return;
        }
        
        // 計算可見範圍
        const { startIndex, endIndex } = this.getVisibleRange();
        
        // 獲取可見項目
        this.visibleItems = this.items.slice(startIndex, endIndex);
        
        // 渲染可見項目
        this.render(startIndex);
        
        logger.debug('Updated visible items:', {
            startIndex,
            endIndex,
            visibleCount: this.visibleItems.length
        });
    }

    getVisibleRange() {
        // 計算當前可見的第一行和最後一行
        const rowHeight = this.itemHeight + this.gap;
        const firstVisibleRow = Math.floor(this.scrollTop / rowHeight);
        const lastVisibleRow = Math.ceil((this.scrollTop + this.containerHeight) / rowHeight);
        
        // 添加 overscan（預渲染上下幾行）
        const startRow = Math.max(0, firstVisibleRow - this.overscan);
        const endRow = Math.min(
            Math.ceil(this.items.length / this.columns),
            lastVisibleRow + this.overscan
        );
        
        // 轉換為項目索引
        const startIndex = startRow * this.columns;
        const endIndex = Math.min(this.items.length, endRow * this.columns);
        
        return { startIndex, endIndex };
    }

    render(startIndex) {
        // 📊 開始計時渲染
        const renderStart = performance.now();

        // 清空內容
        this.content.innerHTML = '';

        // 創建網格容器
        const grid = document.createElement('div');
        grid.className = 'virtual-scroller-grid';
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${this.columns}, 1fr);
            gap: ${this.gap}px;
            padding: 10px;
            position: absolute;
            top: ${Math.floor(startIndex / this.columns) * (this.itemHeight + this.gap)}px;
            left: 50%;
            transform: translateX(-50%);
            width: 85%;
        `;

        // 渲染每個可見項目
        this.visibleItems.forEach((item, index) => {
            const itemElement = this.renderItem(item, startIndex + index);

            // 設置固定高度
            itemElement.style.height = `${this.itemHeight}px`;

            grid.appendChild(itemElement);
        });

        this.content.appendChild(grid);

        // 📊 記錄渲染時間
        const renderDuration = performance.now() - renderStart;
        performanceMonitor.recordRender('VirtualScroller', renderDuration);
    }

    scrollToIndex(index) {
        const row = Math.floor(index / this.columns);
        const scrollTop = row * (this.itemHeight + this.gap);
        
        this.viewport.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
        });
        
        logger.debug('Scrolled to index:', index);
    }

    scrollToTop() {
        this.viewport.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    destroy() {
        logger.debug('Destroying VirtualScroller');
        
        // 取消 RAF
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        // 停止觀察
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        // 清空容器
        this.container.innerHTML = '';
        
        logger.info('VirtualScroller destroyed');
    }

    // 更新單個項目（用於狀態變化）
    updateItem(index, newData) {
        if (index >= 0 && index < this.items.length) {
            this.items[index] = newData;
            this.update();
        }
    }

    // 獲取當前可見項目數量
    getVisibleCount() {
        return this.visibleItems.length;
    }

    // 獲取總項目數量
    getTotalCount() {
        return this.items.length;
    }
}

export default VirtualScroller;

