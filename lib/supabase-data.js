/**
 * Supabase Data Module for Munin
 * Notes CRUD, folders CRUD, and semantic search via pgvector RPC.
 */

import { getClient } from './supabase-client.js';

// ── Helpers ─────────────────────────────────────────────────

function sb() {
    const client = getClient();
    if (!client) throw new Error('Supabase not initialized');
    return client;
}

async function uid() {
    const { data: { user } } = await sb().auth.getUser();
    if (!user) throw new Error('Not signed in');
    return user.id;
}

// ── Notes ───────────────────────────────────────────────────

/**
 * Load all notes for the current user.
 * @returns {Promise<Array>} notes in app-compatible shape
 */
export async function loadNotes() {
    const userId = await uid();
    const { data, error } = await sb()
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('modified_at', { ascending: false });

    if (error) throw new Error('Failed to load notes: ' + error.message);

    return (data || []).map(row => ({
        id:        row.id,
        title:     row.title,
        content:   row.content,
        folder:    row.folder,
        tags:      row.tags || [],
        servings:  row.servings,
        embedding: row.embedding,
        created:   row.created_at,
        modified:  row.modified_at
    }));
}

/**
 * Upsert (insert or update) a single note.
 * @param {object} note - app-shaped note object
 */
export async function saveNote(note) {
    const userId = await uid();
    const row = {
        id:          note.id,
        user_id:     userId,
        title:       note.title,
        content:     note.content,
        folder:      note.folder,
        tags:        note.tags || [],
        servings:    note.servings ?? null,
        embedding:   note.embedding ?? null,
        created_at:  note.created || new Date().toISOString(),
        modified_at: note.modified || new Date().toISOString()
    };

    const { error } = await sb()
        .from('notes')
        .upsert(row, { onConflict: 'id' });

    if (error) throw new Error('Failed to save note: ' + error.message);
}

/**
 * Delete a single note by id.
 * @param {number} noteId
 */
export async function deleteNote(noteId) {
    const { error } = await sb()
        .from('notes')
        .delete()
        .eq('id', noteId);

    if (error) throw new Error('Failed to delete note: ' + error.message);
}

// ── Folders ─────────────────────────────────────────────────

/**
 * Load folder names for the current user, in sort order.
 * @returns {Promise<string[]>}
 */
export async function loadFolders() {
    const userId = await uid();
    const { data, error } = await sb()
        .from('folders')
        .select('name, sort_order')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true });

    if (error) throw new Error('Failed to load folders: ' + error.message);
    return (data || []).map(r => r.name);
}

/**
 * Replace all folders for the current user (delete + re-insert).
 * @param {string[]} folderNames
 */
export async function saveFolders(folderNames) {
    const userId = await uid();

    // Delete existing
    const { error: delErr } = await sb()
        .from('folders')
        .delete()
        .eq('user_id', userId);
    if (delErr) throw new Error('Failed to clear folders: ' + delErr.message);

    if (folderNames.length === 0) return;

    const rows = folderNames.map((name, i) => ({
        user_id: userId,
        name,
        sort_order: i
    }));

    const { error: insErr } = await sb()
        .from('folders')
        .insert(rows);
    if (insErr) throw new Error('Failed to save folders: ' + insErr.message);
}

// ── Semantic Search (pgvector RPC) ──────────────────────────

/**
 * Server-side semantic search using the match_notes RPC.
 * @param {number[]} queryEmbedding - 768-dim vector
 * @param {number} [threshold=0.3]
 * @param {number} [maxResults=5]
 * @returns {Promise<Array>} matching notes with similarity score
 */
export async function semanticSearch(queryEmbedding, threshold = 0.3, maxResults = 5) {
    const { data, error } = await sb()
        .rpc('match_notes', {
            query_embedding: queryEmbedding,
            match_threshold: threshold,
            match_count: maxResults
        });

    if (error) throw new Error('Semantic search failed: ' + error.message);

    return (data || []).map(row => ({
        id:         row.id,
        title:      row.title,
        content:    row.content,
        folder:     row.folder,
        tags:       row.tags || [],
        servings:   row.servings,
        similarity: row.similarity
    }));
}
