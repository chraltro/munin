// Advanced search module for Munin
// Provides fuzzy search, filters, and search operators

/**
 * Calculate Levenshtein distance for fuzzy matching
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Distance
 */
function levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    return matrix[len1][len2];
}

/**
 * Calculate similarity score (0-1) between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score
 */
function similarityScore(str1, str2) {
    const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    const maxLen = Math.max(str1.length, str2.length);
    return maxLen === 0 ? 1 : (1 - distance / maxLen);
}

/**
 * Parse search query into components
 * Supports: tag:tagname, folder:foldername, "exact phrase", -excluded
 * @param {string} query - Search query
 * @returns {Object} Parsed query components
 */
export function parseSearchQuery(query) {
    const components = {
        terms: [],
        exactPhrases: [],
        tags: [],
        folders: [],
        excludedTerms: [],
        dateRange: null
    };

    if (!query || query.trim() === '') {
        return components;
    }

    // Extract exact phrases (quoted text)
    const exactPhraseRegex = /"([^"]+)"/g;
    let match;
    while ((match = exactPhraseRegex.exec(query)) !== null) {
        components.exactPhrases.push(match[1].toLowerCase());
    }

    // Remove exact phrases from query
    let remainingQuery = query.replace(exactPhraseRegex, '');

    // Extract tags: tag:tagname or #tagname
    const tagRegex = /(?:tag:|#)(\S+)/g;
    while ((match = tagRegex.exec(remainingQuery)) !== null) {
        components.tags.push(match[1].toLowerCase());
    }
    remainingQuery = remainingQuery.replace(tagRegex, '');

    // Extract folders: folder:foldername
    const folderRegex = /folder:(\S+)/g;
    while ((match = folderRegex.exec(remainingQuery)) !== null) {
        components.folders.push(match[1].toLowerCase());
    }
    remainingQuery = remainingQuery.replace(folderRegex, '');

    // Extract date range: before:YYYY-MM-DD after:YYYY-MM-DD
    const beforeRegex = /before:(\S+)/;
    const afterRegex = /after:(\S+)/;
    const beforeMatch = beforeRegex.exec(remainingQuery);
    const afterMatch = afterRegex.exec(remainingQuery);

    if (beforeMatch || afterMatch) {
        components.dateRange = {
            before: beforeMatch ? new Date(beforeMatch[1]) : null,
            after: afterMatch ? new Date(afterMatch[1]) : null
        };
        remainingQuery = remainingQuery.replace(beforeRegex, '').replace(afterRegex, '');
    }

    // Extract excluded terms: -term
    const excludedRegex = /-(\S+)/g;
    while ((match = excludedRegex.exec(remainingQuery)) !== null) {
        components.excludedTerms.push(match[1].toLowerCase());
    }
    remainingQuery = remainingQuery.replace(excludedRegex, '');

    // Remaining terms
    const terms = remainingQuery.trim().split(/\s+/).filter(t => t.length > 0);
    components.terms = terms.map(t => t.toLowerCase());

    return components;
}

/**
 * Advanced search with fuzzy matching and filters
 * @param {Array} notes - Array of notes to search
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Array} Sorted array of search results with scores
 */
export function advancedSearch(notes, query, options = {}) {
    const {
        fuzzyThreshold = 0.6,  // Minimum similarity for fuzzy match
        maxResults = 100,
        sortBy = 'relevance'  // 'relevance' or 'date'
    } = options;

    const queryComponents = parseSearchQuery(query);

    // If no search criteria, return all notes
    if (queryComponents.terms.length === 0 &&
        queryComponents.exactPhrases.length === 0 &&
        queryComponents.tags.length === 0 &&
        queryComponents.folders.length === 0) {
        return notes.map(note => ({ note, score: 0 }));
    }

    const results = [];

    notes.forEach(note => {
        let score = 0;
        let matches = true;

        const noteText = `${note.title} ${note.content}`.toLowerCase();
        const noteTitle = note.title.toLowerCase();
        const noteFolder = (note.folder || '').toLowerCase();
        const noteTags = (note.tags || []).map(t => t.toLowerCase());

        // Check excluded terms (early exit if found)
        for (const excludedTerm of queryComponents.excludedTerms) {
            if (noteText.includes(excludedTerm)) {
                matches = false;
                break;
            }
        }

        if (!matches) return;

        // Check exact phrases (required match)
        for (const phrase of queryComponents.exactPhrases) {
            if (noteText.includes(phrase)) {
                score += 10; // High score for exact phrase match
            } else {
                matches = false;
                break;
            }
        }

        if (!matches) return;

        // Check tags (required match)
        for (const tag of queryComponents.tags) {
            if (noteTags.includes(tag)) {
                score += 8; // High score for tag match
            } else {
                // Try fuzzy match on tags
                const fuzzyTagMatch = noteTags.some(noteTag =>
                    similarityScore(noteTag, tag) >= fuzzyThreshold
                );
                if (fuzzyTagMatch) {
                    score += 6;
                } else {
                    matches = false;
                    break;
                }
            }
        }

        if (!matches) return;

        // Check folders (required match)
        for (const folder of queryComponents.folders) {
            if (noteFolder.includes(folder)) {
                score += 8;
            } else {
                matches = false;
                break;
            }
        }

        if (!matches) return;

        // Check date range
        if (queryComponents.dateRange) {
            const noteDate = new Date(note.modified);
            if (queryComponents.dateRange.before && noteDate > queryComponents.dateRange.before) {
                matches = false;
            }
            if (queryComponents.dateRange.after && noteDate < queryComponents.dateRange.after) {
                matches = false;
            }
        }

        if (!matches) return;

        // Check search terms with fuzzy matching
        for (const term of queryComponents.terms) {
            // Exact match in title (highest priority)
            if (noteTitle.includes(term)) {
                score += 5;
            }
            // Exact match in content
            else if (noteText.includes(term)) {
                score += 3;
            }
            // Fuzzy match in title
            else {
                const titleWords = noteTitle.split(/\s+/);
                let fuzzyMatched = false;

                for (const word of titleWords) {
                    const similarity = similarityScore(word, term);
                    if (similarity >= fuzzyThreshold) {
                        score += similarity * 4; // Score based on similarity
                        fuzzyMatched = true;
                        break;
                    }
                }

                // Fuzzy match in content words
                if (!fuzzyMatched) {
                    const contentWords = note.content.toLowerCase().split(/\s+/);
                    for (const word of contentWords) {
                        const similarity = similarityScore(word, term);
                        if (similarity >= fuzzyThreshold) {
                            score += similarity * 2;
                            fuzzyMatched = true;
                            break;
                        }
                    }
                }

                // No match found for this term
                if (!fuzzyMatched && queryComponents.terms.length === 1) {
                    matches = false;
                }
            }
        }

        if (matches && score > 0) {
            results.push({ note, score });
        }
    });

    // Sort results
    if (sortBy === 'relevance') {
        results.sort((a, b) => b.score - a.score);
    } else if (sortBy === 'date') {
        results.sort((a, b) => new Date(b.note.modified) - new Date(a.note.modified));
    }

    return results.slice(0, maxResults);
}

/**
 * Get search suggestions based on partial query
 * @param {Array} notes - Array of notes
 * @param {string} partial - Partial search query
 * @param {number} limit - Maximum suggestions
 * @returns {Array} Search suggestions
 */
export function getSearchSuggestions(notes, partial, limit = 5) {
    if (!partial || partial.trim().length === 0) {
        return [];
    }

    const suggestions = new Set();
    const partialLower = partial.toLowerCase();

    // Suggest note titles
    notes.forEach(note => {
        if (note.title.toLowerCase().includes(partialLower)) {
            suggestions.add(note.title);
        }
    });

    // Suggest tags
    const allTags = new Set();
    notes.forEach(note => {
        if (note.tags) {
            note.tags.forEach(tag => {
                if (tag.toLowerCase().includes(partialLower)) {
                    suggestions.add(`tag:${tag}`);
                    allTags.add(tag);
                }
            });
        }
    });

    // Suggest folders
    const allFolders = new Set();
    notes.forEach(note => {
        if (note.folder && note.folder.toLowerCase().includes(partialLower)) {
            allFolders.add(note.folder);
            suggestions.add(`folder:${note.folder}`);
        }
    });

    return Array.from(suggestions).slice(0, limit);
}

/**
 * Highlight search terms in text
 * @param {string} text - Text to highlight
 * @param {string} query - Search query
 * @returns {string} HTML with highlighted terms
 */
export function highlightSearchTerms(text, query) {
    const queryComponents = parseSearchQuery(query);
    let highlighted = text;

    const allTerms = [
        ...queryComponents.terms,
        ...queryComponents.exactPhrases
    ];

    allTerms.forEach(term => {
        const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
        highlighted = highlighted.replace(regex, '<mark class="search-highlight">$1</mark>');
    });

    return highlighted;
}

/**
 * Escape special regex characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Render search help modal
 * @returns {string} HTML for search help
 */
export function getSearchHelpHTML() {
    return `
        <div class="search-help">
            <h3>Advanced Search</h3>

            <div class="search-help-section">
                <h4>Basic Search</h4>
                <p>Simply type words to search in note titles and content.</p>
                <code>javascript function</code>
            </div>

            <div class="search-help-section">
                <h4>Exact Phrases</h4>
                <p>Use quotes for exact phrase matching.</p>
                <code>"hello world"</code>
            </div>

            <div class="search-help-section">
                <h4>Tag Search</h4>
                <p>Find notes with specific tags.</p>
                <code>tag:recipe</code> or <code>#recipe</code>
            </div>

            <div class="search-help-section">
                <h4>Folder Search</h4>
                <p>Limit search to specific folders.</p>
                <code>folder:Recipes</code>
            </div>

            <div class="search-help-section">
                <h4>Exclude Terms</h4>
                <p>Exclude notes containing specific words.</p>
                <code>recipe -dessert</code>
            </div>

            <div class="search-help-section">
                <h4>Date Filters</h4>
                <p>Filter by date range.</p>
                <code>after:2024-01-01 before:2024-12-31</code>
            </div>

            <div class="search-help-section">
                <h4>Combine Operators</h4>
                <p>Use multiple operators together.</p>
                <code>tag:recipe folder:Desserts "chocolate chip" -nuts</code>
            </div>
        </div>
    `;
}

// Add CSS for advanced search features
export const advancedSearchCSS = `
.search-highlight {
    background: var(--primary);
    color: white;
    padding: 0.1rem 0.2rem;
    border-radius: 2px;
    font-weight: 600;
}

.search-help {
    padding: 1.5rem;
}

.search-help h3 {
    color: var(--primary);
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
}

.search-help-section {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
}

.search-help-section:last-child {
    border-bottom: none;
}

.search-help-section h4 {
    color: var(--text-primary);
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
}

.search-help-section p {
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
    font-size: 0.95rem;
}

.search-help-section code {
    display: block;
    background: var(--bg-tertiary);
    color: var(--primary);
    padding: 0.5rem;
    border-radius: var(--radius);
    font-family: 'Fira Code', monospace;
    font-size: 0.9rem;
}

.search-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
    max-height: 300px;
    overflow-y: auto;
    z-index: 100;
    margin-top: 0.25rem;
}

.search-suggestion-item {
    padding: 0.75rem 1rem;
    cursor: pointer;
    transition: var(--transition-fast);
    color: var(--text-primary);
}

.search-suggestion-item:hover {
    background: var(--bg-tertiary);
}

.search-help-trigger {
    position: absolute;
    right: 3rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-tertiary);
    cursor: pointer;
    padding: 0.5rem;
    transition: var(--transition-fast);
}

.search-help-trigger:hover {
    color: var(--primary);
}
`;
