/**
 * Supabase Client Module
 * Handles initialization, Google OAuth, session management, and Gemini key CRUD.
 */

import { SUPABASE_URL, SUPABASE_KEY } from './supabase-config.js';

let supabase = null;

/**
 * Initialize the Supabase client (lazy, singleton).
 */
export async function initSupabase() {
    if (supabase) return supabase;

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    // Expose for migration scripts run from the browser console
    window.__supabase = supabase;
    console.log('✓ Supabase initialized');
    return supabase;
}

/**
 * Get the raw Supabase client (must call initSupabase first).
 */
export function getClient() {
    return supabase;
}

// ── Auth ────────────────────────────────────────────────────

/**
 * Sign in with Google via Supabase OAuth redirect.
 */
export async function signInWithGoogle() {
    const sb = await initSupabase();
    const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + window.location.pathname
        }
    });
    if (error) throw new Error('Google sign-in failed: ' + error.message);
    // Browser will redirect — no return value needed.
}

/**
 * Get the current session (resolves the OAuth redirect as well).
 * @returns {Promise<{session: object|null, user: object|null}>}
 */
export async function getSession() {
    const sb = await initSupabase();
    const { data: { session }, error } = await sb.auth.getSession();
    if (error) console.error('getSession error:', error);
    return {
        session,
        user: session?.user ?? null
    };
}

/**
 * Sign out.
 */
export async function signOut() {
    const sb = await initSupabase();
    const { error } = await sb.auth.signOut();
    if (error) console.error('signOut error:', error);
}

/**
 * Listen for auth state changes (login / logout / token refresh).
 * @param {function} callback - receives (event, session)
 * @returns {object} subscription (call .unsubscribe() to remove)
 */
export function onAuthStateChange(callback) {
    if (!supabase) throw new Error('Call initSupabase() first');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
}

// ── Gemini Key (user_settings) ──────────────────────────────

/**
 * Retrieve the user's Gemini key from user_settings.
 * @returns {Promise<string|null>}
 */
export async function retrieveGeminiKey() {
    const sb = await initSupabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;

    const { data, error } = await sb
        .from('user_settings')
        .select('gemini_key')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error) { console.error('retrieveGeminiKey:', error); return null; }
    return data?.gemini_key ?? null;
}

/**
 * Save (upsert) the user's Gemini key.
 * @param {string} geminiKey
 */
export async function saveGeminiKey(geminiKey) {
    const sb = await initSupabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('Not signed in');

    const { error } = await sb
        .from('user_settings')
        .upsert({
            user_id: user.id,
            gemini_key: geminiKey,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

    if (error) throw new Error('Failed to save Gemini key: ' + error.message);
}
