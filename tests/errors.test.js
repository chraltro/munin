import { describe, it, expect, vi } from 'vitest';
import {
    MuninError,
    ErrorCodes,
    httpStatusToMessage,
    logError,
    getRecentErrors,
    withErrorHandling,
    validateNonEmptyString,
    validateNote,
    validateImportData,
} from '../lib/errors.js';

describe('MuninError', () => {
    it('should create error with all fields', () => {
        const cause = new Error('root cause');
        const err = new MuninError('Developer message', ErrorCodes.NETWORK_ERROR, 'User message', cause);

        expect(err.message).toBe('Developer message');
        expect(err.code).toBe(ErrorCodes.NETWORK_ERROR);
        expect(err.userMessage).toBe('User message');
        expect(err.cause).toBe(cause);
        expect(err.timestamp).toBeTruthy();
        expect(err.name).toBe('MuninError');
    });

    it('should default userMessage to message', () => {
        const err = new MuninError('Same message', ErrorCodes.UNKNOWN);
        expect(err.userMessage).toBe('Same message');
    });
});

describe('httpStatusToMessage', () => {
    it('should return user-friendly messages for known status codes', () => {
        expect(httpStatusToMessage(401, 'saving')).toContain('Authentication');
        expect(httpStatusToMessage(403, 'saving')).toContain('Permission');
        expect(httpStatusToMessage(429, 'search')).toContain('Rate limit');
        expect(httpStatusToMessage(500, 'loading')).toContain('Server error');
    });

    it('should handle unknown status codes', () => {
        expect(httpStatusToMessage(418, 'testing')).toContain('418');
    });
});

describe('logError and getRecentErrors', () => {
    it('should log and retrieve errors', () => {
        const err = new MuninError('test error', ErrorCodes.UNKNOWN);
        // Suppress console.error in test
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        logError(err, 'test context');

        const recent = getRecentErrors(1);
        expect(recent.length).toBeGreaterThanOrEqual(1);
        expect(recent[recent.length - 1].context).toBe('test context');
        expect(recent[recent.length - 1].message).toBe('test error');

        consoleSpy.mockRestore();
    });
});

describe('withErrorHandling', () => {
    it('should pass through successful results', async () => {
        const fn = async () => 42;
        const wrapped = withErrorHandling(fn);
        expect(await wrapped()).toBe(42);
    });

    it('should catch errors and call onError', async () => {
        const onError = vi.fn();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const fn = async () => {
            throw new Error('boom');
        };
        const wrapped = withErrorHandling(fn, { context: 'test', onError, fallback: null });

        const result = await wrapped();
        expect(result).toBeNull();
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError.mock.calls[0][0]).toBeInstanceOf(MuninError);

        consoleSpy.mockRestore();
    });

    it('should return fallback value on error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const fn = async () => {
            throw new Error('fail');
        };
        const wrapped = withErrorHandling(fn, { fallback: 'default' });

        expect(await wrapped()).toBe('default');
        consoleSpy.mockRestore();
    });
});

describe('validateNonEmptyString', () => {
    it('should pass for valid strings', () => {
        expect(() => validateNonEmptyString('hello', 'name')).not.toThrow();
    });

    it('should throw for empty strings', () => {
        expect(() => validateNonEmptyString('', 'name')).toThrow(MuninError);
        expect(() => validateNonEmptyString('   ', 'name')).toThrow(MuninError);
    });

    it('should throw for non-strings', () => {
        expect(() => validateNonEmptyString(null, 'name')).toThrow(MuninError);
        expect(() => validateNonEmptyString(42, 'name')).toThrow(MuninError);
    });
});

describe('validateNote', () => {
    it('should accept valid notes', () => {
        const note = {
            id: 1,
            title: 'Test',
            content: 'Hello',
            tags: ['tag1'],
        };
        expect(validateNote(note)).toBe(true);
    });

    it('should reject null/undefined', () => {
        expect(() => validateNote(null)).toThrow(MuninError);
        expect(() => validateNote(undefined)).toThrow(MuninError);
    });

    it('should reject notes without id', () => {
        expect(() => validateNote({ title: 'x', content: 'y' })).toThrow();
    });

    it('should reject notes without title', () => {
        expect(() => validateNote({ id: 1, content: 'y' })).toThrow();
    });

    it('should reject notes with non-array tags', () => {
        expect(() => validateNote({ id: 1, title: 'x', content: 'y', tags: 'not-array' })).toThrow();
    });
});

describe('validateImportData', () => {
    it('should accept valid import data', () => {
        const data = {
            notes: [
                { title: 'Note 1', content: 'Content 1', tags: [] },
                { title: 'Note 2', content: 'Content 2' },
            ],
        };
        const result = validateImportData(data);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should reject data without notes array', () => {
        const result = validateImportData({ foo: 'bar' });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should report notes missing title', () => {
        const data = { notes: [{ content: 'no title' }] };
        const result = validateImportData(data);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('title'))).toBe(true);
    });

    it('should report notes with invalid tags', () => {
        const data = {
            notes: [{ title: 'x', content: 'y', tags: 'not-array' }],
        };
        const result = validateImportData(data);
        expect(result.valid).toBe(false);
    });

    it('should reject null input', () => {
        const result = validateImportData(null);
        expect(result.valid).toBe(false);
    });
});
