/**
 * Logger utility for SuperTV
 * Controls console output based on environment
 */

// Check if we're in development mode
const isDev = import.meta.env.DEV;
const isDebugEnabled = import.meta.env.VITE_DEBUG === 'true' || isDev;

/**
 * Logger class with environment-aware logging
 */
class Logger {
    constructor(context = '') {
        this.context = context;
    }

    /**
     * Format log message with context
     */
    _format(message, ...args) {
        if (this.context) {
            return [`[${this.context}]`, message, ...args];
        }
        return [message, ...args];
    }

    /**
     * Debug logs - only in development or when VITE_DEBUG=true
     */
    debug(message, ...args) {
        if (isDebugEnabled) {
            console.log(...this._format(message, ...args));
        }
    }

    /**
     * Info logs - always shown
     */
    info(message, ...args) {
        console.info(...this._format(message, ...args));
    }

    /**
     * Warning logs - always shown
     */
    warn(message, ...args) {
        console.warn(...this._format(message, ...args));
    }

    /**
     * Error logs - always shown
     */
    error(message, ...args) {
        console.error(...this._format(message, ...args));
    }

    /**
     * Group logs - only in development
     */
    group(label) {
        if (isDebugEnabled) {
            console.group(label);
        }
    }

    groupEnd() {
        if (isDebugEnabled) {
            console.groupEnd();
        }
    }

    /**
     * Table logs - only in development
     */
    table(data) {
        if (isDebugEnabled) {
            console.table(data);
        }
    }

    /**
     * Time tracking - only in development
     */
    time(label) {
        if (isDebugEnabled) {
            console.time(label);
        }
    }

    timeEnd(label) {
        if (isDebugEnabled) {
            console.timeEnd(label);
        }
    }
}

/**
 * Create logger instance with context
 */
export function createLogger(context) {
    return new Logger(context);
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Export for backward compatibility
 */
export default {
    debug: logger.debug.bind(logger),
    info: logger.info.bind(logger),
    warn: logger.warn.bind(logger),
    error: logger.error.bind(logger),
    group: logger.group.bind(logger),
    groupEnd: logger.groupEnd.bind(logger),
    table: logger.table.bind(logger),
    time: logger.time.bind(logger),
    timeEnd: logger.timeEnd.bind(logger),
    createLogger
};

