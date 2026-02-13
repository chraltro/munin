/**
 * Shared utility functions for Munin.
 * Pure functions with no side effects - easy to test and reuse.
 */

/**
 * Create a debounced version of a function.
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function with .cancel() method
 */
export function debounce(func, delay) {
    let timeout;
    const debounced = function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
    debounced.cancel = () => clearTimeout(timeout);
    return debounced;
}

/**
 * Create a throttled version of a function.
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum interval in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle = false;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * Format a date string into a human-readable relative format.
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date (e.g., "Today", "Yesterday", "3 days ago")
 */
export function formatRelativeDate(dateString) {
    const noteDate = new Date(dateString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOf7DaysAgo = new Date(startOfToday);
    startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 6);

    if (noteDate >= startOfToday) {
        return 'Today';
    } else if (noteDate >= startOfYesterday) {
        return 'Yesterday';
    } else if (noteDate >= startOf7DaysAgo) {
        const diffTime = startOfToday.getTime() - noteDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return `${diffDays} days ago`;
    } else {
        return noteDate.toLocaleDateString();
    }
}

/**
 * Count words in a text string.
 * @param {string} text - Text to count
 * @returns {number} Word count
 */
export function countWords(text) {
    if (!text) return 0;
    return text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length;
}

/**
 * Compute cosine similarity between two vectors.
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} Similarity score (-1 to 1), 0 if vectors are invalid
 */
export function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Convert a decimal number to a cooking-friendly fraction string.
 * @param {number} decimal - Number to convert
 * @returns {string} Fraction string (e.g., "1 1/2", "3/4")
 */
export function toFraction(decimal) {
    if (decimal === Math.round(decimal)) {
        return decimal.toString();
    }

    const tolerance = 0.001;
    const whole = Math.floor(decimal);
    const fracDecimal = decimal - whole;

    if (fracDecimal < tolerance) {
        return whole.toString();
    }

    const commonFractions = [
        [1, 8],
        [1, 4],
        [1, 3],
        [3, 8],
        [1, 2],
        [5, 8],
        [2, 3],
        [3, 4],
        [7, 8],
    ];

    for (const [num, den] of commonFractions) {
        if (Math.abs(fracDecimal - num / den) < tolerance) {
            return (whole > 0 ? whole + ' ' : '') + `${num}/${den}`;
        }
    }

    return parseFloat(decimal.toFixed(1)).toString().replace('.', ',');
}

/**
 * Parse a quantity string (supporting fractions) into a number.
 * @param {string} quantityStr - Quantity string (e.g., "1 1/2", "3/4", "2.5")
 * @returns {number|null} Parsed number or null if unparseable
 */
export function parseQuantity(quantityStr) {
    const str = quantityStr.trim();
    const normalized = str.replace(',', '.');

    if (normalized.includes(' ')) {
        const parts = normalized.split(' ');
        if (parts.length === 2 && parts[1].includes('/')) {
            const whole = parseInt(parts[0], 10);
            const fracParts = parts[1].split('/');
            const num = parseInt(fracParts[0], 10);
            const den = parseInt(fracParts[1], 10);
            if (!isNaN(whole) && !isNaN(num) && den) {
                return whole + num / den;
            }
        }
    } else if (normalized.includes('/')) {
        const parts = normalized.split('/');
        if (parts.length === 2) {
            const num = parseInt(parts[0], 10);
            const den = parseInt(parts[1], 10);
            if (!isNaN(num) && den) {
                return num / den;
            }
        }
    }

    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : parsed;
}

/**
 * Scale recipe ingredient content.
 * @param {string} content - Recipe markdown content
 * @param {number} baseServings - Original servings
 * @param {number} newServings - Target servings
 * @returns {string} Scaled content
 */
export function scaleRecipeContent(content, baseServings, newServings) {
    if (!baseServings || !newServings || baseServings === newServings) {
        return content;
    }
    const scaleFactor = newServings / baseServings;

    return content
        .split('\n')
        .map((line) => {
            const lineMatch = line.match(/^(\s*[-*+]\s*|\s*\d+\.\s+)(.*)/);
            if (!lineMatch) return line;

            const prefix = lineMatch[1];
            const restOfLine = lineMatch[2];

            const quantityMatch = restOfLine.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d*[,.]?\d+)/);

            if (quantityMatch) {
                const quantityStr = quantityMatch[0];
                const originalAmount = parseQuantity(quantityStr);

                if (originalAmount !== null) {
                    const unitAndIngredient = restOfLine.substring(quantityStr.length);
                    const newAmount = originalAmount * scaleFactor;
                    const formattedAmount = toFraction(newAmount);
                    return `${prefix}${formattedAmount}${unitAndIngredient}`;
                }
            }

            return line;
        })
        .join('\n');
}

/**
 * Generate a unique ID based on timestamp.
 * @returns {number}
 */
export function generateId() {
    return Date.now();
}

/**
 * Sanitize a string for use in HTML attributes (prevent XSS).
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Escape special regex characters in a string.
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Deep clone an object (using structured clone where available).
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone(obj) {
    if (typeof structuredClone === 'function') {
        return structuredClone(obj);
    }
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Get an ISO timestamp string suitable for filenames.
 * @returns {string} e.g., "2024-01-15T10-30-00"
 */
export function getTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}
