/**
 * Centralized error handling for Munin
 * Provides consistent error reporting, logging, and user-facing messages.
 */

/**
 * Application-specific error class with error codes and user messages.
 */
export class MuninError extends Error {
    /**
     * @param {string} message - Developer-facing error message
     * @param {string} code - Error code for programmatic handling
     * @param {string} [userMessage] - User-facing message (defaults to message)
     * @param {Error} [cause] - Original error that caused this one
     */
    constructor(message, code, userMessage, cause) {
        super(message);
        this.name = 'MuninError';
        this.code = code;
        this.userMessage = userMessage || message;
        this.cause = cause;
        this.timestamp = new Date().toISOString();
    }
}

/** Error code constants */
export const ErrorCodes = Object.freeze({
    // Network / API
    NETWORK_ERROR: 'NETWORK_ERROR',
    API_RATE_LIMITED: 'API_RATE_LIMITED',
    API_INVALID_KEY: 'API_INVALID_KEY',
    API_RESPONSE_INVALID: 'API_RESPONSE_INVALID',

    // Gemini AI
    GEMINI_ALL_MODELS_FAILED: 'GEMINI_ALL_MODELS_FAILED',
    GEMINI_INVALID_RESPONSE: 'GEMINI_INVALID_RESPONSE',
    GEMINI_EMBEDDING_FAILED: 'GEMINI_EMBEDDING_FAILED',

    // Data
    DATA_LOAD_FAILED: 'DATA_LOAD_FAILED',
    DATA_SAVE_FAILED: 'DATA_SAVE_FAILED',
    DATA_PARSE_ERROR: 'DATA_PARSE_ERROR',
    DATA_VALIDATION_ERROR: 'DATA_VALIDATION_ERROR',

    // Notes
    NOTE_NOT_FOUND: 'NOTE_NOT_FOUND',
    NOTE_DELETED_DURING_ACTION: 'NOTE_DELETED_DURING_ACTION',

    // Auth
    AUTH_FAILED: 'AUTH_FAILED',
    AUTH_EXPIRED: 'AUTH_EXPIRED',

    // Import/Export
    IMPORT_INVALID_FORMAT: 'IMPORT_INVALID_FORMAT',
    EXPORT_FAILED: 'EXPORT_FAILED',

    // General
    UNKNOWN: 'UNKNOWN',
});

/**
 * Map HTTP status codes to user-friendly messages.
 * @param {number} status - HTTP status code
 * @param {string} context - What operation was being performed
 * @returns {string} User-friendly message
 */
export function httpStatusToMessage(status, context = 'request') {
    const messages = {
        400: `Bad request while ${context}. Please check your input.`,
        401: `Authentication required for ${context}. Please check your credentials.`,
        403: `Permission denied for ${context}. Please check your API token permissions.`,
        404: `Resource not found during ${context}.`,
        429: `Rate limit exceeded during ${context}. Please wait and try again.`,
        500: `Server error during ${context}. Please try again later.`,
        502: `Service temporarily unavailable for ${context}. Please try again.`,
        503: `Service unavailable for ${context}. Please try again later.`,
    };
    return messages[status] || `Unexpected error (${status}) during ${context}.`;
}

/**
 * Error log buffer for recent errors (keeps last 50).
 * Useful for debugging and error reporting.
 */
const errorLog = [];
const MAX_LOG_SIZE = 50;

/**
 * Log an error to the internal buffer and console.
 * @param {Error} error - The error to log
 * @param {string} [context] - Additional context about where the error occurred
 */
export function logError(error, context = '') {
    const entry = {
        timestamp: new Date().toISOString(),
        context,
        message: error.message,
        code: error.code || ErrorCodes.UNKNOWN,
        stack: error.stack,
    };

    errorLog.push(entry);
    if (errorLog.length > MAX_LOG_SIZE) {
        errorLog.shift();
    }

    if (context) {
        console.error(`[Munin] ${context}:`, error);
    } else {
        console.error('[Munin]', error);
    }
}

/**
 * Get recent error log entries.
 * @param {number} [count=10] - Number of recent entries to return
 * @returns {Array} Recent error log entries
 */
export function getRecentErrors(count = 10) {
    return errorLog.slice(-count);
}

/**
 * Wrap an async function with standardized error handling.
 * Catches errors, logs them, and optionally shows a notification.
 *
 * @param {Function} fn - Async function to wrap
 * @param {Object} [options] - Options
 * @param {string} [options.context] - Context for error logging
 * @param {Function} [options.onError] - Callback on error (receives MuninError)
 * @param {*} [options.fallback] - Value to return on error
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(fn, options = {}) {
    const { context = '', onError, fallback } = options;
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            const muninError =
                error instanceof MuninError
                    ? error
                    : new MuninError(error.message, ErrorCodes.UNKNOWN, error.message, error);

            logError(muninError, context);

            if (onError) {
                onError(muninError);
            }

            return fallback;
        }
    };
}

/**
 * Validate that a value is a non-empty string.
 * @param {*} value - Value to check
 * @param {string} fieldName - Name of field for error message
 * @throws {MuninError} If validation fails
 */
export function validateNonEmptyString(value, fieldName) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new MuninError(
            `${fieldName} must be a non-empty string`,
            ErrorCodes.DATA_VALIDATION_ERROR,
            `Please provide a valid ${fieldName}.`
        );
    }
}

/**
 * Validate a note object structure.
 * @param {Object} note - Note to validate
 * @throws {MuninError} If validation fails
 * @returns {boolean} true if valid
 */
export function validateNote(note) {
    if (!note || typeof note !== 'object') {
        throw new MuninError('Invalid note object', ErrorCodes.DATA_VALIDATION_ERROR, 'The note data is invalid.');
    }
    if (typeof note.id !== 'number' && typeof note.id !== 'string') {
        throw new MuninError('Note must have a valid id', ErrorCodes.DATA_VALIDATION_ERROR);
    }
    if (typeof note.title !== 'string') {
        throw new MuninError('Note must have a title', ErrorCodes.DATA_VALIDATION_ERROR);
    }
    if (typeof note.content !== 'string') {
        throw new MuninError('Note must have content', ErrorCodes.DATA_VALIDATION_ERROR);
    }
    if (note.tags && !Array.isArray(note.tags)) {
        throw new MuninError('Note tags must be an array', ErrorCodes.DATA_VALIDATION_ERROR);
    }
    return true;
}

/**
 * Validate imported notes data.
 * @param {Object} data - Parsed JSON data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateImportData(data) {
    const errors = [];

    if (!data || typeof data !== 'object') {
        errors.push('Import data must be a JSON object');
        return { valid: false, errors };
    }

    if (!Array.isArray(data.notes)) {
        errors.push('Import data must contain a "notes" array');
        return { valid: false, errors };
    }

    data.notes.forEach((note, index) => {
        if (!note.title) {
            errors.push(`Note at index ${index} is missing a title`);
        }
        if (typeof note.content !== 'string') {
            errors.push(`Note at index ${index} is missing content`);
        }
        if (note.tags && !Array.isArray(note.tags)) {
            errors.push(`Note at index ${index} has invalid tags (must be array)`);
        }
    });

    return { valid: errors.length === 0, errors };
}
