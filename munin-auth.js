/**
 * Munin Authentication Module
 * Delegates to Supabase for Google OAuth and Gemini key storage.
 * Keeps the same export signatures so script.js imports don't break.
 */

import {
    initSupabase,
    signInWithGoogle as sbSignIn,
    getSession,
    signOut as sbSignOut,
    retrieveGeminiKey,
    saveGeminiKey
} from './lib/supabase-client.js';

export async function initAuth() {
    try {
        await initSupabase();
        return true;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        return false;
    }
}

/**
 * Redirect-based Google OAuth. The browser navigates away;
 * on return getSession() picks up the session from the URL hash.
 */
export async function handleGoogleSignIn() {
    await sbSignIn();
    // Browser redirects — this line is not reached.
}

/**
 * Retrieve stored keys from Supabase user_settings.
 * @returns {Promise<{geminiKey: string|null}>}
 */
export async function retrieveKeys() {
    try {
        const geminiKey = await retrieveGeminiKey();
        return { geminiKey };
    } catch (error) {
        console.error('Failed to retrieve keys:', error);
        return null;
    }
}

/**
 * Save Gemini key to Supabase user_settings.
 */
export async function saveKeys(geminiKey) {
    try {
        await saveGeminiKey(geminiKey);
        return true;
    } catch (error) {
        console.error('Failed to save keys:', error);
        throw error;
    }
}

/**
 * Get current auth state from Supabase session.
 */
export async function getCurrentAuth() {
    const { session, user } = await getSession();
    return {
        googleUser: user ? { userId: user.id, email: user.email, name: user.user_metadata?.full_name } : null,
        session
    };
}

export async function handleSignOut() {
    await sbSignOut();
}

// Re-export getSession for direct use in script.js
export { getSession };
