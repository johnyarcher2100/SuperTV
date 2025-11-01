/**
 * DOM Utility Functions for SuperTV
 * Provides safe DOM element access with error handling
 */

import { createLogger } from './logger.js';

const logger = createLogger('DOMUtils');

/**
 * Safely get element by ID
 * @param {string} id - Element ID
 * @param {boolean} required - Whether the element is required (throws if not found)
 * @returns {HTMLElement|null} - The element or null
 */
export function getElementById(id, required = false) {
    const element = document.getElementById(id);
    
    if (!element && required) {
        const error = new Error(`Required element not found: #${id}`);
        logger.error(error.message);
        throw error;
    }
    
    if (!element) {
        logger.warn(`Element not found: #${id}`);
    }
    
    return element;
}

/**
 * Safely query selector
 * @param {string} selector - CSS selector
 * @param {boolean} required - Whether the element is required
 * @returns {HTMLElement|null} - The element or null
 */
export function querySelector(selector, required = false) {
    const element = document.querySelector(selector);
    
    if (!element && required) {
        const error = new Error(`Required element not found: ${selector}`);
        logger.error(error.message);
        throw error;
    }
    
    if (!element) {
        logger.warn(`Element not found: ${selector}`);
    }
    
    return element;
}

/**
 * Safely query selector all
 * @param {string} selector - CSS selector
 * @returns {NodeList} - NodeList (empty if none found)
 */
export function querySelectorAll(selector) {
    return document.querySelectorAll(selector);
}

/**
 * Safely add event listener to element
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object} options - Event listener options
 * @returns {boolean} - Whether the listener was added
 */
export function addEventListener(elementOrId, event, handler, options = {}) {
    try {
        const element = typeof elementOrId === 'string' 
            ? getElementById(elementOrId) 
            : elementOrId;
        
        if (!element) {
            logger.warn(`Cannot add event listener: element not found`);
            return false;
        }
        
        element.addEventListener(event, handler, options);
        return true;
    } catch (error) {
        logger.error(`Failed to add event listener:`, error);
        return false;
    }
}

/**
 * Safely set element text content
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {string} text - Text content
 * @returns {boolean} - Whether the text was set
 */
export function setTextContent(elementOrId, text) {
    try {
        const element = typeof elementOrId === 'string' 
            ? getElementById(elementOrId) 
            : elementOrId;
        
        if (!element) {
            return false;
        }
        
        element.textContent = text;
        return true;
    } catch (error) {
        logger.error(`Failed to set text content:`, error);
        return false;
    }
}

/**
 * Safely add class to element
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {string} className - Class name
 * @returns {boolean} - Whether the class was added
 */
export function addClass(elementOrId, className) {
    try {
        const element = typeof elementOrId === 'string' 
            ? getElementById(elementOrId) 
            : elementOrId;
        
        if (!element) {
            return false;
        }
        
        element.classList.add(className);
        return true;
    } catch (error) {
        logger.error(`Failed to add class:`, error);
        return false;
    }
}

/**
 * Safely remove class from element
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {string} className - Class name
 * @returns {boolean} - Whether the class was removed
 */
export function removeClass(elementOrId, className) {
    try {
        const element = typeof elementOrId === 'string' 
            ? getElementById(elementOrId) 
            : elementOrId;
        
        if (!element) {
            return false;
        }
        
        element.classList.remove(className);
        return true;
    } catch (error) {
        logger.error(`Failed to remove class:`, error);
        return false;
    }
}

/**
 * Safely toggle class on element
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {string} className - Class name
 * @returns {boolean} - Whether the class was toggled
 */
export function toggleClass(elementOrId, className) {
    try {
        const element = typeof elementOrId === 'string' 
            ? getElementById(elementOrId) 
            : elementOrId;
        
        if (!element) {
            return false;
        }
        
        element.classList.toggle(className);
        return true;
    } catch (error) {
        logger.error(`Failed to toggle class:`, error);
        return false;
    }
}

/**
 * Safely show element (remove 'hidden' class)
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @returns {boolean} - Whether the element was shown
 */
export function show(elementOrId) {
    return removeClass(elementOrId, 'hidden');
}

/**
 * Safely hide element (add 'hidden' class)
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @returns {boolean} - Whether the element was hidden
 */
export function hide(elementOrId) {
    return addClass(elementOrId, 'hidden');
}

/**
 * Safely set element value
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {any} value - Value to set
 * @returns {boolean} - Whether the value was set
 */
export function setValue(elementOrId, value) {
    try {
        const element = typeof elementOrId === 'string' 
            ? getElementById(elementOrId) 
            : elementOrId;
        
        if (!element) {
            return false;
        }
        
        element.value = value;
        return true;
    } catch (error) {
        logger.error(`Failed to set value:`, error);
        return false;
    }
}

/**
 * Safely get element value
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {any} defaultValue - Default value if element not found
 * @returns {any} - Element value or default value
 */
export function getValue(elementOrId, defaultValue = '') {
    try {
        const element = typeof elementOrId === 'string' 
            ? getElementById(elementOrId) 
            : elementOrId;
        
        if (!element) {
            return defaultValue;
        }
        
        return element.value;
    } catch (error) {
        logger.error(`Failed to get value:`, error);
        return defaultValue;
    }
}

/**
 * Wait for DOM to be ready
 * @returns {Promise<void>}
 */
export function waitForDOM() {
    return new Promise((resolve) => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', resolve);
        } else {
            resolve();
        }
    });
}

/**
 * Safely execute function with error handling
 * @param {Function} fn - Function to execute
 * @param {string} context - Context for error logging
 * @returns {any} - Function result or null on error
 */
export async function safeExecute(fn, context = 'Unknown') {
    try {
        return await fn();
    } catch (error) {
        logger.error(`Error in ${context}:`, error);
        return null;
    }
}

export default {
    getElementById,
    querySelector,
    querySelectorAll,
    addEventListener,
    setTextContent,
    addClass,
    removeClass,
    toggleClass,
    show,
    hide,
    setValue,
    getValue,
    waitForDOM,
    safeExecute
};

