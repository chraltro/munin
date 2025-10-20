/**
 * Munin Authentication Module
 * Handles Google Sign-In via Firebase and stores encrypted keys in Firestore
 * Uses the same Firebase backend as Glosa and Ansuz
 */

import { initFirebase, signInWithGoogle, getCurrentUser, retrieveKeys as fbRetrieveKeys, saveKeys as fbSaveKeys } from './lib/firebase-auth.js';

export async function initAuth() {
    try {
        await initFirebase();
        return true;
    } catch (error) {
        console.error('Failed to initialize Firebase:', error);
        return false;
    }
}

export async function handleGoogleSignIn() {
    try {
        const user = await signInWithGoogle();
        return user;
    } catch (error) {
        throw new Error('Google sign-in failed: ' + error.message);
    }
}

export async function retrieveKeys() {
    try {
        const keys = await fbRetrieveKeys();
        return keys;
    } catch (error) {
        console.error('Failed to retrieve keys:', error);
        return null;
    }
}

export async function saveKeys(geminiKey, githubToken) {
    try {
        await fbSaveKeys({
            geminiKey,
            githubToken: githubToken || null
        });
        return true;
    } catch (error) {
        console.error('Failed to save keys:', error);
        throw error;
    }
}

export function getCurrentAuth() {
    return {
        googleUser: getCurrentUser()
    };
}
