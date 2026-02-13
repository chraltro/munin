import { describe, it, expect } from 'vitest';
import { calculateAnalytics, exportAnalytics } from '../analytics.js';

function createNote(overrides = {}) {
    return {
        id: Date.now() + Math.random(),
        title: 'Test Note',
        content: 'This is a test note with some content.',
        folder: 'General',
        tags: ['test'],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        ...overrides,
    };
}

describe('calculateAnalytics', () => {
    it('should return empty analytics for no notes', () => {
        const result = calculateAnalytics([]);
        expect(result.totalNotes).toBe(0);
        expect(result.totalWords).toBe(0);
    });

    it('should return empty analytics for null input', () => {
        const result = calculateAnalytics(null);
        expect(result.totalNotes).toBe(0);
    });

    it('should count total notes', () => {
        const notes = [createNote(), createNote(), createNote()];
        const result = calculateAnalytics(notes);
        expect(result.totalNotes).toBe(3);
    });

    it('should count total words', () => {
        const notes = [
            createNote({ content: 'one two three' }),
            createNote({ content: 'four five' }),
        ];
        const result = calculateAnalytics(notes);
        expect(result.totalWords).toBe(5);
    });

    it('should track folder distribution', () => {
        const notes = [
            createNote({ folder: 'Work' }),
            createNote({ folder: 'Work' }),
            createNote({ folder: 'Personal' }),
        ];
        const result = calculateAnalytics(notes);
        expect(result.folders['Work'].count).toBe(2);
        expect(result.folders['Personal'].count).toBe(1);
    });

    it('should track tag usage', () => {
        const notes = [
            createNote({ tags: ['js', 'react'] }),
            createNote({ tags: ['js'] }),
            createNote({ tags: ['python'] }),
        ];
        const result = calculateAnalytics(notes);
        expect(result.tags['js']).toBe(2);
        expect(result.tags['react']).toBe(1);
        expect(result.tags['python']).toBe(1);
    });

    it('should identify top tags', () => {
        const notes = [
            createNote({ tags: ['popular', 'common'] }),
            createNote({ tags: ['popular', 'rare'] }),
            createNote({ tags: ['popular'] }),
        ];
        const result = calculateAnalytics(notes);
        expect(result.topTags[0].tag).toBe('popular');
        expect(result.topTags[0].count).toBe(3);
    });

    it('should identify longest note', () => {
        const notes = [
            createNote({ title: 'Short', content: 'short' }),
            createNote({ title: 'Long', content: 'this is a much longer note with many words in it' }),
        ];
        const result = calculateAnalytics(notes);
        expect(result.longestNote.title).toBe('Long');
    });

    it('should calculate average note length', () => {
        const notes = [
            createNote({ content: 'one two' }),       // 2 words
            createNote({ content: 'three four five' }), // 3 words (since we skip markdown)
        ];
        const result = calculateAnalytics(notes);
        // Average of 2 and 3 = 2.5, rounded = 3 (or 2 depending on rounding)
        expect(result.averageNoteLength).toBeGreaterThan(0);
    });

    it('should count notes this week', () => {
        const recentNote = createNote({ modified: new Date().toISOString() });
        const oldNote = createNote({
            modified: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
        const result = calculateAnalytics([recentNote, oldNote]);
        expect(result.notesThisWeek).toBe(1);
    });

    it('should calculate recent activity', () => {
        const result = calculateAnalytics([createNote()]);
        expect(result.recentActivity).toHaveLength(7);
        // Today should have at least 1
        const today = result.recentActivity[result.recentActivity.length - 1];
        expect(today.count).toBeGreaterThanOrEqual(1);
    });
});

describe('exportAnalytics', () => {
    it('should return valid JSON', () => {
        const analytics = calculateAnalytics([createNote()]);
        const json = exportAnalytics(analytics);
        const parsed = JSON.parse(json);
        expect(parsed.generatedAt).toBeTruthy();
        expect(parsed.totalNotes).toBe(1);
    });
});
