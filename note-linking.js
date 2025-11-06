// Note linking and backlinks module for Munin
// Enables bidirectional note linking for knowledge management

/**
 * Extract note links from content
 * Supports formats: [[Note Title]], [Note Title](app://note/ID), app://note/ID
 * @param {string} content - Note content
 * @returns {Array} Array of link objects
 */
export function extractNoteLinks(content) {
    const links = [];

    // Pattern 1: [[Note Title]] (wiki-style links)
    const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;
    let match;
    while ((match = wikiLinkPattern.exec(content)) !== null) {
        links.push({
            type: 'wiki',
            title: match[1].trim(),
            fullMatch: match[0],
            index: match.index
        });
    }

    // Pattern 2: [Title](app://note/ID) (markdown links with app:// protocol)
    const appLinkPattern = /\[([^\]]+)\]\(app:\/\/note\/([^)]+)\)/g;
    while ((match = appLinkPattern.exec(content)) !== null) {
        links.push({
            type: 'app',
            title: match[1].trim(),
            id: match[2].trim(),
            fullMatch: match[0],
            index: match.index
        });
    }

    return links;
}

/**
 * Build backlinks map for all notes
 * @param {Array} notes - Array of all notes
 * @returns {Map} Map of note ID to backlinks
 */
export function buildBacklinksMap(notes) {
    const backlinks = new Map();
    const titleToIdMap = new Map();

    // Build title to ID map for wiki-style links
    notes.forEach(note => {
        titleToIdMap.set(note.title.toLowerCase(), note.id);
    });

    // Process each note
    notes.forEach(note => {
        const links = extractNoteLinks(note.content);

        links.forEach(link => {
            let targetId = null;

            if (link.type === 'app') {
                targetId = link.id;
            } else if (link.type === 'wiki') {
                targetId = titleToIdMap.get(link.title.toLowerCase());
            }

            if (targetId) {
                if (!backlinks.has(targetId)) {
                    backlinks.set(targetId, []);
                }

                backlinks.get(targetId).push({
                    sourceId: note.id,
                    sourceTitle: note.title,
                    linkText: link.title,
                    type: link.type
                });
            }
        });
    });

    return backlinks;
}

/**
 * Convert wiki-style links to markdown links
 * @param {string} content - Note content
 * @param {Array} notes - Array of all notes
 * @returns {string} Content with converted links
 */
export function convertWikiLinksToMarkdown(content, notes) {
    const titleToIdMap = new Map();
    notes.forEach(note => {
        titleToIdMap.set(note.title.toLowerCase(), note.id);
    });

    return content.replace(/\[\[([^\]]+)\]\]/g, (match, title) => {
        const noteId = titleToIdMap.get(title.trim().toLowerCase());
        if (noteId) {
            return `[${title.trim()}](app://note/${noteId})`;
        }
        return match; // Keep original if note not found
    });
}

/**
 * Render backlinks section for a note
 * @param {string} noteId - Current note ID
 * @param {Map} backlinksMap - Backlinks map
 * @param {Function} onLinkClick - Callback when backlink is clicked
 * @returns {HTMLElement} Backlinks container
 */
export function renderBacklinks(noteId, backlinksMap, onLinkClick) {
    const container = document.createElement('div');
    container.className = 'backlinks-container';

    const header = document.createElement('div');
    header.className = 'backlinks-header';

    const icon = document.createElement('i');
    icon.className = 'fas fa-link';

    const title = document.createElement('h4');
    title.textContent = 'Backlinks';

    header.appendChild(icon);
    header.appendChild(title);
    container.appendChild(header);

    const backlinks = backlinksMap.get(noteId) || [];

    if (backlinks.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'backlinks-empty';
        emptyState.textContent = 'No backlinks yet';
        container.appendChild(emptyState);
    } else {
        const list = document.createElement('ul');
        list.className = 'backlinks-list';

        backlinks.forEach(backlink => {
            const item = document.createElement('li');
            item.className = 'backlink-item';

            const linkEl = document.createElement('a');
            linkEl.href = '#';
            linkEl.className = 'backlink-title';
            linkEl.textContent = backlink.sourceTitle;
            linkEl.addEventListener('click', (e) => {
                e.preventDefault();
                onLinkClick(backlink.sourceId);
            });

            item.appendChild(linkEl);
            list.appendChild(item);
        });

        container.appendChild(list);
    }

    const count = document.createElement('div');
    count.className = 'backlinks-count';
    count.textContent = `${backlinks.length} backlink${backlinks.length !== 1 ? 's' : ''}`;
    container.appendChild(count);

    return container;
}

/**
 * Make note links clickable in preview
 * @param {HTMLElement} previewElement - Preview container element
 * @param {Function} onLinkClick - Callback when link is clicked
 */
export function makeLinksClickable(previewElement, onLinkClick) {
    const links = previewElement.querySelectorAll('a[href^="app://note/"]');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            const noteId = href.replace('app://note/', '');
            onLinkClick(noteId);
        });

        // Add visual indicator
        link.classList.add('note-link');
    });
}

/**
 * Add link insertion helper to editor
 * @param {HTMLElement} editor - Editor element
 * @param {Array} notes - Array of all notes
 * @returns {Object} Autocomplete controller
 */
export function addLinkAutocomplete(editor, notes) {
    let autocompleteActive = false;
    let autocompleteContainer = null;
    let filteredNotes = [];
    let selectedIndex = 0;

    function showAutocomplete(query, cursorPos) {
        filteredNotes = notes.filter(note =>
            note.title.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10);

        if (filteredNotes.length === 0) {
            hideAutocomplete();
            return;
        }

        if (!autocompleteContainer) {
            autocompleteContainer = document.createElement('div');
            autocompleteContainer.className = 'link-autocomplete';
            document.body.appendChild(autocompleteContainer);
        }

        autocompleteContainer.innerHTML = '';
        selectedIndex = 0;

        filteredNotes.forEach((note, index) => {
            const item = document.createElement('div');
            item.className = 'link-autocomplete-item';
            if (index === selectedIndex) {
                item.classList.add('selected');
            }

            const icon = document.createElement('i');
            icon.className = 'fas fa-sticky-note';

            const title = document.createElement('span');
            title.textContent = note.title;

            item.appendChild(icon);
            item.appendChild(title);

            item.addEventListener('click', () => {
                insertLink(note);
            });

            autocompleteContainer.appendChild(item);
        });

        // Position autocomplete
        const rect = editor.getBoundingClientRect();
        autocompleteContainer.style.position = 'fixed';
        autocompleteContainer.style.top = `${rect.top}px`;
        autocompleteContainer.style.left = `${rect.left}px`;
        autocompleteContainer.style.display = 'block';

        autocompleteActive = true;
    }

    function hideAutocomplete() {
        if (autocompleteContainer) {
            autocompleteContainer.style.display = 'none';
        }
        autocompleteActive = false;
    }

    function insertLink(note) {
        const value = editor.value;
        const cursorPos = editor.selectionStart;

        // Find the start of the [ sequence
        let startPos = cursorPos - 1;
        while (startPos >= 0 && value[startPos] !== '[') {
            startPos--;
        }

        if (startPos >= 0) {
            const before = value.substring(0, startPos);
            const after = value.substring(cursorPos);
            const link = `[[${note.title}]]`;

            editor.value = before + link + after;
            editor.selectionStart = editor.selectionEnd = before.length + link.length;

            // Trigger input event to update preview
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        }

        hideAutocomplete();
    }

    function handleKeyDown(e) {
        if (!autocompleteActive) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, filteredNotes.length - 1);
                updateSelection();
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                updateSelection();
                break;
            case 'Enter':
            case 'Tab':
                e.preventDefault();
                if (filteredNotes[selectedIndex]) {
                    insertLink(filteredNotes[selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                hideAutocomplete();
                break;
        }
    }

    function updateSelection() {
        const items = autocompleteContainer.querySelectorAll('.link-autocomplete-item');
        items.forEach((item, index) => {
            if (index === selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    function handleInput(e) {
        const value = editor.value;
        const cursorPos = editor.selectionStart;

        // Check if user is typing [ for note link (single bracket trigger)
        if (cursorPos >= 1) {
            const beforeCursor = value.substring(0, cursorPos);
            // Match single [ at the start of a potential link
            // Don't trigger if it's already part of a markdown link [text](url)
            const linkStartMatch = beforeCursor.match(/\[([^\]\(]*?)$/);

            if (linkStartMatch && !beforeCursor.match(/\[[^\]]+\]\([^\)]*$/)) {
                const query = linkStartMatch[1];
                showAutocomplete(query, cursorPos);
            } else {
                hideAutocomplete();
            }
        } else {
            hideAutocomplete();
        }
    }

    // Add event listeners
    editor.addEventListener('input', handleInput);
    editor.addEventListener('keydown', handleKeyDown);

    // Click outside to close
    document.addEventListener('click', (e) => {
        if (autocompleteActive && !autocompleteContainer?.contains(e.target) && e.target !== editor) {
            hideAutocomplete();
        }
    });

    return {
        destroy: () => {
            editor.removeEventListener('input', handleInput);
            editor.removeEventListener('keydown', handleKeyDown);
            if (autocompleteContainer) {
                autocompleteContainer.remove();
            }
        }
    };
}

/**
 * Get graph data for note relationships
 * @param {Array} notes - Array of all notes
 * @returns {Object} Graph data with nodes and edges
 */
export function getNoteLinkGraph(notes) {
    const titleToIdMap = new Map();
    notes.forEach(note => {
        titleToIdMap.set(note.title.toLowerCase(), note.id);
    });

    const nodes = notes.map(note => ({
        id: note.id,
        title: note.title,
        folder: note.folder
    }));

    const edges = [];
    const edgeSet = new Set(); // Prevent duplicates

    notes.forEach(note => {
        const links = extractNoteLinks(note.content);

        links.forEach(link => {
            let targetId = null;

            if (link.type === 'app') {
                targetId = link.id;
            } else if (link.type === 'wiki') {
                targetId = titleToIdMap.get(link.title.toLowerCase());
            }

            if (targetId && targetId !== note.id) {
                const edgeKey = `${note.id}->${targetId}`;
                if (!edgeSet.has(edgeKey)) {
                    edges.push({
                        source: note.id,
                        target: targetId
                    });
                    edgeSet.add(edgeKey);
                }
            }
        });
    });

    return { nodes, edges };
}

// Add CSS for link features
export const noteLinkingCSS = `
/* Backlinks */
.backlinks-container {
    margin-top: 1.5rem;
    padding: 1rem;
    background: var(--bg-tertiary);
    border-radius: var(--radius);
    border: 1px solid var(--border);
}

.backlinks-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    color: var(--text-secondary);
}

.backlinks-header i {
    color: var(--primary);
}

.backlinks-header h4 {
    font-size: 0.95rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
}

.backlinks-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.backlink-item {
    padding: 0.5rem;
    border-radius: var(--radius);
    transition: var(--transition-fast);
}

.backlink-item:hover {
    background: var(--bg-quaternary);
}

.backlink-title {
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;
}

.backlink-title:hover {
    text-decoration: underline;
}

.backlinks-empty {
    text-align: center;
    padding: 1rem;
    color: var(--text-tertiary);
    font-size: 0.9rem;
    font-style: italic;
}

.backlinks-count {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border);
    font-size: 0.85rem;
    color: var(--text-tertiary);
    text-align: center;
}

/* Note links in preview */
.note-link {
    color: var(--primary) !important;
    text-decoration: underline !important;
    cursor: pointer !important;
    transition: var(--transition-fast);
}

.note-link:hover {
    color: var(--primary-light) !important;
}

/* Link autocomplete */
.link-autocomplete {
    position: fixed;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000;
    min-width: 250px;
}

.link-autocomplete-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    cursor: pointer;
    transition: var(--transition-fast);
}

.link-autocomplete-item:hover,
.link-autocomplete-item.selected {
    background: var(--bg-tertiary);
}

.link-autocomplete-item i {
    color: var(--primary);
}

.link-autocomplete-item span {
    color: var(--text-primary);
}
`;
