import { describe, it, expect } from 'vitest';
import { parseSearchQuery, advancedSearch, highlightSearchTerms, getSearchSuggestions } from '../advanced-search.js';

function createNote(overrides = {}) {
    return {
        id: Date.now() + Math.random(),
        title: 'Test Note',
        content: 'Some test content for search.',
        folder: 'General',
        tags: ['test'],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        ...overrides,
    };
}

describe('parseSearchQuery', () => {
    it('should parse simple terms', () => {
        const result = parseSearchQuery('hello world');
        expect(result.terms).toEqual(['hello', 'world']);
    });

    it('should parse exact phrases', () => {
        const result = parseSearchQuery('"hello world"');
        expect(result.exactPhrases).toEqual(['hello world']);
        expect(result.terms).toHaveLength(0);
    });

    it('should parse tag operators', () => {
        const result = parseSearchQuery('tag:recipe');
        expect(result.tags).toEqual(['recipe']);
    });

    it('should parse hashtag syntax', () => {
        const result = parseSearchQuery('#recipe');
        expect(result.tags).toEqual(['recipe']);
    });

    it('should parse folder operators', () => {
        const result = parseSearchQuery('folder:Work');
        expect(result.folders).toEqual(['work']);
    });

    it('should parse excluded terms', () => {
        const result = parseSearchQuery('recipe -dessert');
        expect(result.excludedTerms).toEqual(['dessert']);
        expect(result.terms).toEqual(['recipe']);
    });

    it('should parse date range', () => {
        const result = parseSearchQuery('before:2024-12-31 after:2024-01-01');
        expect(result.dateRange).toBeTruthy();
        expect(result.dateRange.before).toBeInstanceOf(Date);
        expect(result.dateRange.after).toBeInstanceOf(Date);
    });

    it('should handle empty query', () => {
        const result = parseSearchQuery('');
        expect(result.terms).toHaveLength(0);
    });

    it('should handle null query', () => {
        const result = parseSearchQuery(null);
        expect(result.terms).toHaveLength(0);
    });

    it('should handle combined operators', () => {
        const result = parseSearchQuery('tag:recipe folder:Food "chocolate chip" -nuts baking');
        expect(result.tags).toEqual(['recipe']);
        expect(result.folders).toEqual(['food']);
        expect(result.exactPhrases).toEqual(['chocolate chip']);
        expect(result.excludedTerms).toEqual(['nuts']);
        expect(result.terms).toContain('baking');
    });
});

describe('advancedSearch', () => {
    const notes = [
        createNote({ title: 'JavaScript Guide', content: 'A guide to JS', folder: 'Dev', tags: ['js', 'programming'] }),
        createNote({ title: 'Chocolate Cake', content: 'A delicious cake recipe', folder: 'Recipes', tags: ['recipe', 'dessert'] }),
        createNote({ title: 'Meeting Notes', content: 'Q4 planning meeting', folder: 'Work', tags: ['work', 'meeting'] }),
    ];

    it('should find notes by term in title', () => {
        const results = advancedSearch(notes, 'JavaScript');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].note.title).toBe('JavaScript Guide');
    });

    it('should find notes by term in content', () => {
        const results = advancedSearch(notes, 'delicious');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].note.title).toBe('Chocolate Cake');
    });

    it('should filter by tag', () => {
        const results = advancedSearch(notes, 'tag:recipe');
        expect(results.length).toBe(1);
        expect(results[0].note.title).toBe('Chocolate Cake');
    });

    it('should exclude terms', () => {
        const results = advancedSearch(notes, 'cake -chocolate');
        // "cake" appears in title but "chocolate" also appears, so it should be excluded
        expect(results.every((r) => !r.note.title.includes('Chocolate'))).toBe(true);
    });

    it('should return all notes for empty query components', () => {
        const results = advancedSearch(notes, '');
        expect(results.length).toBe(notes.length);
    });
});

describe('highlightSearchTerms', () => {
    it('should wrap matches in mark tags', () => {
        const result = highlightSearchTerms('Hello world', 'hello');
        expect(result).toContain('<mark class="search-highlight">Hello</mark>');
    });

    it('should handle multiple terms', () => {
        const result = highlightSearchTerms('Hello world foo', 'hello foo');
        expect(result).toContain('<mark class="search-highlight">Hello</mark>');
        expect(result).toContain('<mark class="search-highlight">foo</mark>');
    });
});

describe('getSearchSuggestions', () => {
    const notes = [
        createNote({ title: 'JavaScript Guide', tags: ['js'] }),
        createNote({ title: 'Python Basics', tags: ['python'], folder: 'Dev' }),
    ];

    it('should suggest matching titles', () => {
        const suggestions = getSearchSuggestions(notes, 'java');
        expect(suggestions).toContain('JavaScript Guide');
    });

    it('should suggest matching tags', () => {
        const suggestions = getSearchSuggestions(notes, 'py');
        expect(suggestions.some((s) => s.includes('python'))).toBe(true);
    });

    it('should return empty for empty input', () => {
        expect(getSearchSuggestions(notes, '')).toHaveLength(0);
        expect(getSearchSuggestions(notes, null)).toHaveLength(0);
    });

    it('should respect limit', () => {
        const suggestions = getSearchSuggestions(notes, 'a', 1);
        expect(suggestions.length).toBeLessThanOrEqual(1);
    });
});
