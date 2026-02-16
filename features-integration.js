// Features integration for Munin
// Integrates export, import, keyboard shortcuts, analytics, and command palette

import {
    exportAsJSON,
    exportAsMarkdown,
    exportAsHTML,
    exportAsCSV,
    downloadFile,
    getTimestamp,
    importFromJSON
} from './export-utils.js';

import {
    KeyboardShortcutManager,
    initializeShortcuts,
    CommandPalette,
    commandPaletteCSS
} from './keyboard-shortcuts.js';

import {
    calculateAnalytics,
    renderAnalyticsDashboard,
    exportAnalytics
} from './analytics.js';

/**
 * Initialize all new features
 * @param {Object} state - Application state
 * @param {Object} elements - DOM elements
 * @param {Object} functions - Application functions
 */
export function initializeFeatures(state, elements, functions) {
    // Inject command palette CSS
    injectCSS(commandPaletteCSS);

    // Initialize keyboard shortcuts
    const shortcutCallbacks = {
        newNote: () => functions.createNewNote(),
        saveNote: () => functions.saveCurrentNote(),
        focusSearch: () => elements.searchInput?.focus(),
        showCommandPalette: () => commandPalette.show(),
        showShortcuts: () => showKeyboardShortcutsModal(),
        closeEditor: () => functions.closeEditor(),
        toggleEditMode: () => functions.toggleEditMode(),
        openSettings: () => elements.settingsBtn?.click(),
        exportNotes: () => showExportModal(),
        importNotes: () => showImportModal(),
        showAnalytics: () => showAnalyticsModal(state.notes)
    };

    const shortcutManager = initializeShortcuts(shortcutCallbacks);

    // Initialize command palette
    const commands = createCommands(state, functions);
    const commandPalette = new CommandPalette(commands);

    // Setup event listeners for new UI elements
    setupEventListeners(state, elements, functions, commandPalette);

    // Return API for external use
    return {
        shortcutManager,
        commandPalette,
        updateCommands: () => commandPalette.updateCommands(createCommands(state, functions))
    };
}

/**
 * Inject CSS into document
 * @param {string} css - CSS string
 */
function injectCSS(css) {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
}

/**
 * Create command palette commands
 * @param {Object} state - Application state
 * @param {Object} functions - Application functions
 * @returns {Array} Commands array
 */
function createCommands(state, functions) {
    return [
        {
            name: 'New Note',
            description: 'Create a new note',
            icon: 'fas fa-plus',
            shortcut: 'Ctrl+N',
            keywords: ['create', 'add'],
            action: () => functions.createNewNote()
        },
        {
            name: 'Save Note',
            description: 'Save the current note',
            icon: 'fas fa-save',
            shortcut: 'Ctrl+S',
            keywords: ['save'],
            action: () => functions.saveCurrentNote()
        },
        {
            name: 'Search Notes',
            description: 'Focus the search input',
            icon: 'fas fa-search',
            shortcut: 'Ctrl+F',
            keywords: ['find', 'search'],
            action: () => document.getElementById('searchInput')?.focus()
        },
        {
            name: 'Export Notes',
            description: 'Export all notes to various formats',
            icon: 'fas fa-download',
            shortcut: 'Ctrl+Shift+E',
            keywords: ['export', 'download', 'backup'],
            action: () => showExportModal()
        },
        {
            name: 'Import Notes',
            description: 'Import notes from JSON file',
            icon: 'fas fa-upload',
            shortcut: 'Ctrl+Shift+I',
            keywords: ['import', 'upload', 'restore'],
            action: () => showImportModal()
        },
        {
            name: 'Analytics Dashboard',
            description: 'View analytics and insights',
            icon: 'fas fa-chart-bar',
            shortcut: 'Ctrl+Shift+A',
            keywords: ['analytics', 'stats', 'insights'],
            action: () => showAnalyticsModal(state.notes)
        },
        {
            name: 'Keyboard Shortcuts',
            description: 'View all keyboard shortcuts',
            icon: 'fas fa-keyboard',
            shortcut: '?',
            keywords: ['shortcuts', 'keys', 'help'],
            action: () => showKeyboardShortcutsModal()
        },
        {
            name: 'Settings',
            description: 'Open settings',
            icon: 'fas fa-cog',
            shortcut: 'Ctrl+,',
            keywords: ['settings', 'preferences', 'config'],
            action: () => document.getElementById('settingsBtn')?.click()
        },
        {
            name: 'Change Theme',
            description: 'Customize appearance',
            icon: 'fas fa-palette',
            keywords: ['theme', 'appearance', 'colors'],
            action: () => document.getElementById('changeThemeBtn')?.click()
        },
        {
            name: 'Toggle Edit Mode',
            description: 'Switch between edit and preview',
            icon: 'fas fa-edit',
            shortcut: 'Ctrl+E',
            keywords: ['edit', 'preview'],
            action: () => functions.toggleEditMode()
        }
    ];
}

/**
 * Setup event listeners for new features
 * @param {Object} state - Application state
 * @param {Object} elements - DOM elements
 * @param {Object} functions - Application functions
 * @param {CommandPalette} commandPalette - Command palette instance
 */
function setupEventListeners(state, elements, functions, commandPalette) {
    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', showExportModal);
    }

    // Import button
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        importBtn.addEventListener('click', showImportModal);
    }

    // Analytics button
    const analyticsBtn = document.getElementById('analyticsBtn');
    if (analyticsBtn) {
        analyticsBtn.addEventListener('click', () => showAnalyticsModal(state.notes));
    }

    // Keyboard shortcuts button
    const keyboardShortcutsBtn = document.getElementById('keyboardShortcutsBtn');
    if (keyboardShortcutsBtn) {
        keyboardShortcutsBtn.addEventListener('click', showKeyboardShortcutsModal);
    }

    // Export modal
    setupExportModal(state);

    // Import modal
    setupImportModal(state, functions);

    // Modal close buttons
    setupModalCloseButtons();
}

/**
 * Setup export modal
 * @param {Object} state - Application state
 */
function setupExportModal(state) {
    const exportModal = document.getElementById('exportModal');
    const exportExecuteBtn = document.getElementById('exportExecuteBtn');
    const exportFormatBtns = document.querySelectorAll('.export-format-btn');

    let selectedFormat = 'json';

    // Format selection
    exportFormatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            exportFormatBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedFormat = btn.dataset.format;
        });
    });

    // Export execution
    if (exportExecuteBtn) {
        exportExecuteBtn.addEventListener('click', () => {
            const groupByFolder = document.getElementById('exportGroupByFolder')?.checked ?? true;
            const includeTOC = document.getElementById('exportIncludeTOC')?.checked ?? true;
            const currentFolderOnly = document.getElementById('exportCurrentFolderOnly')?.checked ?? false;

            const notesToExport = currentFolderOnly && state.currentFolder !== 'All Notes'
                ? state.notes.filter(n => n.folder === state.currentFolder)
                : state.notes;

            const timestamp = getTimestamp();
            let content, filename, mimeType;

            switch (selectedFormat) {
                case 'json':
                    content = exportAsJSON(notesToExport, { includeMetadata: true, pretty: true });
                    filename = `munin-notes-${timestamp}.json`;
                    mimeType = 'application/json';
                    break;
                case 'markdown':
                    content = exportAsMarkdown(notesToExport, { includeTOC, groupByFolder });
                    filename = `munin-notes-${timestamp}.md`;
                    mimeType = 'text/markdown';
                    break;
                case 'html':
                    content = exportAsHTML(notesToExport, { includeTOC, groupByFolder });
                    filename = `munin-notes-${timestamp}.html`;
                    mimeType = 'text/html';
                    break;
                case 'csv':
                    content = exportAsCSV(notesToExport);
                    filename = `munin-notes-${timestamp}.csv`;
                    mimeType = 'text/csv';
                    break;
            }

            downloadFile(content, filename, mimeType);
            exportModal.style.display = 'none';

            // Show success notification
            showNotification('Export successful!', 'success');
        });
    }
}

/**
 * Setup import modal
 * @param {Object} state - Application state
 * @param {Object} functions - Application functions
 */
function setupImportModal(state, functions) {
    const importModal = document.getElementById('importModal');
    const importFileInput = document.getElementById('importFileInput');
    const importFileName = document.getElementById('importFileName');
    const importExecuteBtn = document.getElementById('importExecuteBtn');
    const importError = document.getElementById('importError');
    const importSuccess = document.getElementById('importSuccess');
    const fileInputLabel = document.querySelector('.file-input-label');

    let selectedFile = null;

    // File selection
    if (fileInputLabel) {
        fileInputLabel.addEventListener('click', () => {
            importFileInput?.click();
        });
    }

    if (importFileInput) {
        importFileInput.addEventListener('change', (e) => {
            selectedFile = e.target.files[0];
            if (selectedFile) {
                importFileName.textContent = selectedFile.name;
                importExecuteBtn.disabled = false;
            } else {
                importFileName.textContent = 'No file selected';
                importExecuteBtn.disabled = true;
            }
        });
    }

    // Import execution
    if (importExecuteBtn) {
        importExecuteBtn.addEventListener('click', async () => {
            if (!selectedFile) return;

            importError.style.display = 'none';
            importSuccess.style.display = 'none';

            try {
                const fileContent = await selectedFile.text();
                const result = importFromJSON(fileContent);

                if (!result.success) {
                    throw new Error(result.error);
                }

                const mergeMode = document.getElementById('importMergeMode')?.checked ?? true;

                if (mergeMode) {
                    // Merge with existing notes
                    const newNotes = result.notes.filter(newNote =>
                        !state.notes.some(existingNote => existingNote.id === newNote.id)
                    );
                    state.notes.push(...newNotes);
                    importSuccess.textContent = `Successfully imported ${result.notes.length} notes (${newNotes.length} new, ${result.notes.length - newNotes.length} duplicates skipped)`;
                } else {
                    // Replace all notes
                    state.notes = result.notes;
                    importSuccess.textContent = `Successfully imported ${result.notes.length} notes (replaced all existing notes)`;
                }

                importSuccess.style.display = 'block';

                // Refresh UI
                if (functions.refreshUI) {
                    functions.refreshUI();
                }

                // Persist to Supabase
                if (functions.saveData) {
                    await functions.saveData();
                }

                // Close modal after delay
                setTimeout(() => {
                    importModal.style.display = 'none';
                    importFileInput.value = '';
                    importFileName.textContent = 'No file selected';
                    importExecuteBtn.disabled = true;
                    importSuccess.style.display = 'none';
                }, 2000);

            } catch (error) {
                importError.textContent = `Import failed: ${error.message}`;
                importError.style.display = 'block';
            }
        });
    }
}

/**
 * Show export modal
 */
function showExportModal() {
    const exportModal = document.getElementById('exportModal');
    if (exportModal) {
        exportModal.style.display = 'flex';
    }
}

/**
 * Show import modal
 */
function showImportModal() {
    const importModal = document.getElementById('importModal');
    if (importModal) {
        importModal.style.display = 'flex';
    }
}

/**
 * Show keyboard shortcuts modal
 */
function showKeyboardShortcutsModal() {
    const modal = document.getElementById('keyboardShortcutsModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Show analytics modal
 * @param {Array} notes - Notes array
 */
function showAnalyticsModal(notes) {
    const modal = document.getElementById('analyticsModal');
    const content = document.getElementById('analyticsContent');

    if (modal && content) {
        const analytics = calculateAnalytics(notes);
        renderAnalyticsDashboard(content, analytics);
        modal.style.display = 'flex';
    }
}

/**
 * Setup modal close buttons
 */
function setupModalCloseButtons() {
    const modals = [
        { modal: 'exportModal', closeBtn: 'closeExportModalBtn' },
        { modal: 'importModal', closeBtn: 'closeImportModalBtn' },
        { modal: 'keyboardShortcutsModal', closeBtn: 'closeKeyboardShortcutsBtn' },
        { modal: 'analyticsModal', closeBtn: 'closeAnalyticsBtn' }
    ];

    modals.forEach(({ modal, closeBtn }) => {
        const modalEl = document.getElementById(modal);
        const closeBtnEl = document.getElementById(closeBtn);

        if (closeBtnEl) {
            closeBtnEl.addEventListener('click', () => {
                if (modalEl) modalEl.style.display = 'none';
            });
        }

        if (modalEl) {
            modalEl.addEventListener('click', (e) => {
                if (e.target === modalEl) {
                    modalEl.style.display = 'none';
                }
            });
        }
    });
}

/**
 * Show notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info)
 */
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('munin-notification');

    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'munin-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            box-shadow: var(--shadow-lg);
            z-index: 10001;
            display: none;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(notification);
    }

    // Set message and type
    notification.textContent = message;
    notification.style.display = 'block';

    // Set color based on type
    switch (type) {
        case 'success':
            notification.style.borderColor = 'var(--success)';
            notification.style.color = 'var(--success)';
            break;
        case 'error':
            notification.style.borderColor = 'var(--danger)';
            notification.style.color = 'var(--danger)';
            break;
        default:
            notification.style.borderColor = 'var(--primary)';
            notification.style.color = 'var(--primary)';
    }

    // Auto hide after 3 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Add slide-in animation
const animationCSS = `
@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
`;
injectCSS(animationCSS);
