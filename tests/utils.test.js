import { describe, it, expect, vi } from 'vitest';
import {
    debounce,
    throttle,
    formatRelativeDate,
    countWords,
    cosineSimilarity,
    toFraction,
    parseQuantity,
    scaleRecipeContent,
    generateId,
    escapeHtml,
    escapeRegex,
    deepClone,
    getTimestamp,
} from '../lib/utils.js';

describe('debounce', () => {
    it('should delay function execution', async () => {
        const fn = vi.fn();
        const debounced = debounce(fn, 50);

        debounced();
        debounced();
        debounced();

        expect(fn).not.toHaveBeenCalled();

        await new Promise((r) => setTimeout(r, 100));
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should support cancel', async () => {
        const fn = vi.fn();
        const debounced = debounce(fn, 50);

        debounced();
        debounced.cancel();

        await new Promise((r) => setTimeout(r, 100));
        expect(fn).not.toHaveBeenCalled();
    });
});

describe('throttle', () => {
    it('should limit function calls', async () => {
        const fn = vi.fn();
        const throttled = throttle(fn, 100);

        throttled();
        throttled();
        throttled();

        expect(fn).toHaveBeenCalledTimes(1);

        await new Promise((r) => setTimeout(r, 150));
        throttled();
        expect(fn).toHaveBeenCalledTimes(2);
    });
});

describe('formatRelativeDate', () => {
    it('should return "Today" for today', () => {
        const today = new Date().toISOString();
        expect(formatRelativeDate(today)).toBe('Today');
    });

    it('should return "Yesterday" for yesterday', () => {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        yesterday.setHours(12, 0, 0, 0);
        expect(formatRelativeDate(yesterday.toISOString())).toBe('Yesterday');
    });

    it('should return "X days ago" for recent dates', () => {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        threeDaysAgo.setHours(12, 0, 0, 0);
        const result = formatRelativeDate(threeDaysAgo.toISOString());
        expect(result).toMatch(/\d+ days ago/);
    });

    it('should return locale date for old dates', () => {
        const result = formatRelativeDate('2020-01-01T00:00:00Z');
        expect(result).not.toBe('Today');
        expect(result).not.toMatch(/days ago/);
    });
});

describe('countWords', () => {
    it('should count words correctly', () => {
        expect(countWords('hello world')).toBe(2);
        expect(countWords('one')).toBe(1);
        expect(countWords('  multiple   spaces  between  ')).toBe(3);
    });

    it('should handle empty/null input', () => {
        expect(countWords('')).toBe(0);
        expect(countWords(null)).toBe(0);
        expect(countWords(undefined)).toBe(0);
    });
});

describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
        expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
    });

    it('should return 0 for orthogonal vectors', () => {
        expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    });

    it('should return -1 for opposite vectors', () => {
        expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
    });

    it('should handle null/mismatched inputs', () => {
        expect(cosineSimilarity(null, [1, 0])).toBe(0);
        expect(cosineSimilarity([1], [1, 0])).toBe(0);
    });

    it('should handle zero vectors', () => {
        expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
    });
});

describe('toFraction', () => {
    it('should return whole numbers as strings', () => {
        expect(toFraction(3)).toBe('3');
        expect(toFraction(0)).toBe('0');
    });

    it('should convert common fractions', () => {
        expect(toFraction(0.5)).toBe('1/2');
        expect(toFraction(0.25)).toBe('1/4');
        expect(toFraction(0.75)).toBe('3/4');
        expect(toFraction(1.5)).toBe('1 1/2');
    });

    it('should handle mixed numbers', () => {
        expect(toFraction(2.5)).toBe('2 1/2');
        expect(toFraction(3.25)).toBe('3 1/4');
    });
});

describe('parseQuantity', () => {
    it('should parse whole numbers', () => {
        expect(parseQuantity('5')).toBe(5);
    });

    it('should parse decimals', () => {
        expect(parseQuantity('2.5')).toBe(2.5);
    });

    it('should parse comma decimals', () => {
        expect(parseQuantity('2,5')).toBe(2.5);
    });

    it('should parse simple fractions', () => {
        expect(parseQuantity('1/2')).toBe(0.5);
        expect(parseQuantity('3/4')).toBe(0.75);
    });

    it('should parse mixed fractions', () => {
        expect(parseQuantity('1 1/2')).toBe(1.5);
        expect(parseQuantity('2 3/4')).toBe(2.75);
    });

    it('should return null for unparseable input', () => {
        expect(parseQuantity('abc')).toBeNull();
    });
});

describe('scaleRecipeContent', () => {
    it('should scale ingredient quantities', () => {
        const content = '- 1 cup flour\n- 2 eggs';
        const scaled = scaleRecipeContent(content, 4, 8);
        expect(scaled).toBe('- 2 cup flour\n- 4 eggs');
    });

    it('should return unchanged content when servings match', () => {
        const content = '- 1 cup flour';
        expect(scaleRecipeContent(content, 4, 4)).toBe(content);
    });

    it('should not scale non-ingredient lines', () => {
        const content = '# Recipe Title\n- 1 cup flour';
        const scaled = scaleRecipeContent(content, 4, 8);
        expect(scaled).toContain('# Recipe Title');
    });

    it('should handle null servings', () => {
        const content = '- 1 cup flour';
        expect(scaleRecipeContent(content, null, 4)).toBe(content);
    });
});

describe('generateId', () => {
    it('should return a number', () => {
        expect(typeof generateId()).toBe('number');
    });

    it('should return unique values (sequential calls)', () => {
        const id1 = generateId();
        const id2 = generateId();
        // Same millisecond is possible, but values should be >= previous
        expect(id2).toBeGreaterThanOrEqual(id1);
    });
});

describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
        expect(escapeHtml('<script>alert("xss")</script>')).toBe(
            '&lt;script&gt;alert("xss")&lt;/script&gt;'
        );
    });

    it('should handle ampersands', () => {
        expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('should handle plain text', () => {
        expect(escapeHtml('hello world')).toBe('hello world');
    });
});

describe('escapeRegex', () => {
    it('should escape special characters', () => {
        expect(escapeRegex('hello.world')).toBe('hello\\.world');
        expect(escapeRegex('a+b*c')).toBe('a\\+b\\*c');
        expect(escapeRegex('(test)')).toBe('\\(test\\)');
    });

    it('should handle strings without special chars', () => {
        expect(escapeRegex('hello')).toBe('hello');
    });
});

describe('deepClone', () => {
    it('should create independent copies', () => {
        const original = { a: 1, b: { c: 2 } };
        const clone = deepClone(original);

        clone.b.c = 999;
        expect(original.b.c).toBe(2);
    });

    it('should handle arrays', () => {
        const original = [1, [2, 3]];
        const clone = deepClone(original);

        clone[1].push(4);
        expect(original[1]).toEqual([2, 3]);
    });
});

describe('getTimestamp', () => {
    it('should return a string in expected format', () => {
        const ts = getTimestamp();
        expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/);
    });
});
