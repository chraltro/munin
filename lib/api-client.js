/**
 * API client module for Munin
 * Centralizes all HTTP communication with GitHub and Gemini APIs.
 * Provides retry logic, rate limiting, and consistent error handling.
 */

import { MuninError, ErrorCodes, httpStatusToMessage, logError } from './errors.js';

/**
 * Rate limiter to prevent API abuse.
 * Enforces minimum interval between calls per endpoint group.
 */
class RateLimiter {
    constructor(minIntervalMs = 500) {
        this.minInterval = minIntervalMs;
        this.lastCallTime = 0;
    }

    /**
     * Wait if needed to respect rate limit.
     * @returns {Promise<void>}
     */
    async throttle() {
        const now = Date.now();
        const elapsed = now - this.lastCallTime;
        if (elapsed < this.minInterval) {
            await new Promise((resolve) => setTimeout(resolve, this.minInterval - elapsed));
        }
        this.lastCallTime = Date.now();
    }
}

const geminiLimiter = new RateLimiter(500);

/**
 * Fetch with retry logic and exponential backoff.
 * @param {string} url - URL to fetch
 * @param {RequestInit} options - Fetch options
 * @param {Object} [retryConfig] - Retry configuration
 * @param {number} [retryConfig.maxRetries=2] - Maximum number of retries
 * @param {number} [retryConfig.baseDelay=1000] - Base delay in ms
 * @param {number[]} [retryConfig.retryStatuses=[429,500,502,503]] - Status codes to retry on
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options, retryConfig = {}) {
    const { maxRetries = 2, baseDelay = 1000, retryStatuses = [429, 500, 502, 503] } = retryConfig;

    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            if (response.ok) {
                return response;
            }

            if (retryStatuses.includes(response.status) && attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt);
                console.warn(`[API] Retrying after ${delay}ms (status ${response.status}, attempt ${attempt + 1})`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
            }

            // Non-retryable error
            return response;
        } catch (networkError) {
            lastError = networkError;
            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt);
                console.warn(`[API] Network error, retrying after ${delay}ms (attempt ${attempt + 1})`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    throw new MuninError(
        `Network request failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
        ErrorCodes.NETWORK_ERROR,
        'Unable to connect. Please check your internet connection.',
        lastError
    );
}

// ─── GitHub API ──────────────────────────────────────────────────

/**
 * Create GitHub API headers.
 * @param {string} token - GitHub personal access token
 * @returns {HeadersInit}
 */
function githubHeaders(token) {
    return {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
    };
}

/**
 * Handle GitHub API error responses.
 * @param {Response} response - Fetch response
 * @param {string} context - What operation was being performed
 * @throws {MuninError}
 */
async function handleGitHubError(response, context) {
    let errorBody;
    try {
        errorBody = await response.json();
    } catch (_e) {
        errorBody = { message: response.statusText };
    }

    if (response.status === 403) {
        throw new MuninError(
            `GitHub 403: ${errorBody.message}`,
            ErrorCodes.GITHUB_SCOPE_MISSING,
            'GitHub token needs "gist" permission. Go to GitHub Settings > Developer settings > Personal access tokens and ensure "gist" scope is enabled.'
        );
    }

    if (response.status === 401) {
        throw new MuninError(
            `GitHub 401: ${errorBody.message}`,
            ErrorCodes.GITHUB_AUTH_FAILED,
            'GitHub authentication failed. Please check your token in Settings.'
        );
    }

    throw new MuninError(
        `GitHub API error (${response.status}): ${errorBody.message || response.statusText}`,
        ErrorCodes.NETWORK_ERROR,
        httpStatusToMessage(response.status, context)
    );
}

/**
 * List all gists for the authenticated user.
 * @param {string} token - GitHub token
 * @returns {Promise<Array>} List of gists
 */
export async function listGists(token) {
    const response = await fetchWithRetry('https://api.github.com/gists', {
        headers: githubHeaders(token),
    });

    if (!response.ok) {
        await handleGitHubError(response, 'loading gists');
    }

    return response.json();
}

/**
 * Get a specific gist by ID.
 * @param {string} token - GitHub token
 * @param {string} gistId - Gist ID
 * @returns {Promise<Object>} Gist data
 */
export async function getGist(token, gistId) {
    const response = await fetchWithRetry(`https://api.github.com/gists/${gistId}`, {
        headers: githubHeaders(token),
    });

    if (!response.ok) {
        await handleGitHubError(response, 'loading gist data');
    }

    return response.json();
}

/**
 * Create a new gist.
 * @param {string} token - GitHub token
 * @param {Object} files - Files to include in the gist
 * @param {string} [description] - Gist description
 * @returns {Promise<Object>} Created gist data
 */
export async function createGist(token, files, description = 'Munin Notes Data') {
    const response = await fetchWithRetry('https://api.github.com/gists', {
        method: 'POST',
        headers: githubHeaders(token),
        body: JSON.stringify({ files, description, public: false }),
    });

    if (!response.ok) {
        await handleGitHubError(response, 'creating gist');
    }

    return response.json();
}

/**
 * Update an existing gist.
 * @param {string} token - GitHub token
 * @param {string} gistId - Gist ID
 * @param {Object} files - Files to update
 * @returns {Promise<Object>} Updated gist data
 */
export async function updateGist(token, gistId, files) {
    const response = await fetchWithRetry(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: githubHeaders(token),
        body: JSON.stringify({ files }),
    });

    if (!response.ok) {
        await handleGitHubError(response, 'saving notes');
    }

    return response.json();
}

// ─── Gemini AI API ───────────────────────────────────────────────

/**
 * Call the Gemini text generation API with model fallback.
 * Tries multiple models in order, falling back on failure.
 *
 * @param {string} apiKey - Gemini API key
 * @param {string} prompt - Text prompt
 * @param {Object} [generationConfig] - Generation configuration
 * @param {string[]} [models] - Models to try in order
 * @returns {Promise<Object>} API response
 */
export async function callGeminiText(apiKey, prompt, generationConfig = {}, models = ['gemini-2.5-flash', 'gemini-1.5-flash']) {
    await geminiLimiter.throttle();

    let lastError = null;

    for (const model of models) {
        try {
            const response = await fetchWithRetry(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig,
                    }),
                },
                { maxRetries: 1 }
            );

            if (response.ok) {
                return await response.json();
            }

            const errorData = await response.json().catch(() => ({
                error: { message: `HTTP ${response.status}: ${response.statusText}` },
            }));
            const errorMessage = errorData.error?.message || 'Unknown API error';
            console.warn(`[Gemini] Model ${model} failed: ${errorMessage}`);
            lastError = `[${model}]: ${errorMessage}`;
        } catch (networkError) {
            console.warn(`[Gemini] Network error with model ${model}:`, networkError.message);
            lastError = `[${model}]: ${networkError.message}`;
        }
    }

    throw new MuninError(
        `All Gemini models failed. Last error: ${lastError}`,
        ErrorCodes.GEMINI_ALL_MODELS_FAILED,
        'AI request failed. Please try again or check your API key.'
    );
}

/**
 * Call the Gemini embedding API.
 * @param {string} apiKey - Gemini API key
 * @param {string} text - Text to embed
 * @param {string} [model] - Embedding model name
 * @returns {Promise<number[]|null>} Embedding vector or null on failure
 */
export async function callGeminiEmbedding(apiKey, text, model = 'text-embedding-004') {
    try {
        await geminiLimiter.throttle();

        const response = await fetchWithRetry(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: `models/${model}`,
                    content: { parts: [{ text }] },
                }),
            },
            { maxRetries: 1 }
        );

        if (!response.ok) {
            const errorData = await response.json();
            logError(
                new MuninError(
                    `Embedding API error: ${errorData.error?.message}`,
                    ErrorCodes.GEMINI_EMBEDDING_FAILED
                ),
                'callGeminiEmbedding'
            );
            return null;
        }

        const data = await response.json();
        return data.embedding.values;
    } catch (error) {
        logError(error, 'callGeminiEmbedding');
        return null;
    }
}

/**
 * Validate a Gemini API key by listing available models.
 * @param {string} apiKey - API key to validate
 * @returns {Promise<boolean>} true if valid
 */
export async function validateGeminiKey(apiKey) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    return response.ok;
}
