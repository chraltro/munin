// Keyboard shortcuts module for Munin
// Provides global keyboard shortcuts and command palette

/**
 * Keyboard shortcut handler
 */
export class KeyboardShortcutManager {
    constructor() {
        this.shortcuts = new Map();
        this.enabled = true;
        this.init();
    }

    init() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    /**
     * Register a keyboard shortcut
     * @param {string} key - Key combination (e.g., 'Ctrl+K', 'Ctrl+Shift+E')
     * @param {Function} handler - Function to execute
     * @param {string} description - Description of the shortcut
     */
    register(key, handler, description = '') {
        this.shortcuts.set(key.toLowerCase(), {
            handler,
            description
        });
    }

    /**
     * Unregister a keyboard shortcut
     * @param {string} key - Key combination to remove
     */
    unregister(key) {
        this.shortcuts.delete(key.toLowerCase());
    }

    /**
     * Handle keydown events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
        if (!this.enabled) return;

        // Don't intercept when typing in inputs/textareas (except for specific shortcuts)
        const isInput = event.target.tagName === 'INPUT' ||
                       event.target.tagName === 'TEXTAREA' ||
                       event.target.isContentEditable;

        const key = this.getKeyString(event);

        // Always allow these shortcuts even in inputs
        const alwaysAllowed = ['ctrl+s', 'ctrl+k', 'escape', '?'];

        if (isInput && !alwaysAllowed.includes(key.toLowerCase())) {
            return;
        }

        const shortcut = this.shortcuts.get(key.toLowerCase());

        if (shortcut) {
            event.preventDefault();
            shortcut.handler(event);
        }
    }

    /**
     * Convert keyboard event to key string
     * @param {KeyboardEvent} event - Keyboard event
     * @returns {string} Key string (e.g., 'Ctrl+K')
     */
    getKeyString(event) {
        const parts = [];

        if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
        if (event.shiftKey) parts.push('Shift');
        if (event.altKey) parts.push('Alt');

        // Get the actual key
        let key = event.key;

        // Normalize key names
        if (key === ' ') key = 'Space';
        if (key.length === 1) key = key.toUpperCase();

        // Don't duplicate modifier keys
        if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
            parts.push(key);
        }

        return parts.join('+');
    }

    /**
     * Enable shortcuts
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Disable shortcuts
     */
    disable() {
        this.enabled = false;
    }

    /**
     * Get all registered shortcuts
     * @returns {Map} Map of shortcuts
     */
    getAll() {
        return this.shortcuts;
    }
}

/**
 * Initialize default shortcuts
 * @param {Object} callbacks - Object containing callback functions
 * @returns {KeyboardShortcutManager} Shortcut manager instance
 */
export function initializeShortcuts(callbacks) {
    const manager = new KeyboardShortcutManager();

    // General shortcuts (using browser-safe combinations)
    manager.register('Alt+N', callbacks.newNote, 'New note');
    manager.register('Ctrl+S', callbacks.saveNote, 'Save note');
    manager.register('Ctrl+Shift+F', callbacks.focusSearch, 'Search notes');
    manager.register('Ctrl+K', callbacks.showCommandPalette, 'Command palette');
    manager.register('?', callbacks.showShortcuts, 'Show shortcuts');
    manager.register('Escape', callbacks.closeEditor, 'Close editor');

    // Navigation shortcuts (browser-safe)
    manager.register('Alt+E', callbacks.toggleEditMode, 'Toggle edit mode');
    manager.register('Alt+P', callbacks.togglePreview, 'Toggle preview');
    manager.register('Alt+,', callbacks.openSettings, 'Open settings');

    // Data shortcuts
    manager.register('Alt+Shift+E', callbacks.exportNotes, 'Export notes');
    manager.register('Alt+Shift+I', callbacks.importNotes, 'Import notes');
    manager.register('Alt+Shift+A', callbacks.showAnalytics, 'Show analytics');

    return manager;
}

/**
 * Command Palette functionality
 */
export class CommandPalette {
    constructor(commands) {
        this.commands = commands || [];
        this.isOpen = false;
        this.selectedIndex = 0;
        this.filteredCommands = [];
        this.createUI();
    }

    createUI() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'command-palette-overlay';
        this.overlay.style.display = 'none';

        // Create palette
        this.palette = document.createElement('div');
        this.palette.className = 'command-palette';

        // Create search input
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'command-palette-input';
        this.input.placeholder = 'Type a command...';
        this.input.addEventListener('input', () => this.filterCommands());
        this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Create results list
        this.resultsList = document.createElement('div');
        this.resultsList.className = 'command-palette-results';

        this.palette.appendChild(this.input);
        this.palette.appendChild(this.resultsList);
        this.overlay.appendChild(this.palette);
        document.body.appendChild(this.overlay);

        // Click overlay to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });
    }

    show() {
        this.isOpen = true;
        this.overlay.style.display = 'flex';
        this.input.value = '';
        this.selectedIndex = 0;
        this.filterCommands();
        this.input.focus();
    }

    hide() {
        this.isOpen = false;
        this.overlay.style.display = 'none';
    }

    filterCommands() {
        const query = this.input.value.toLowerCase();

        if (query === '') {
            this.filteredCommands = this.commands;
        } else {
            this.filteredCommands = this.commands.filter(cmd =>
                cmd.name.toLowerCase().includes(query) ||
                (cmd.description && cmd.description.toLowerCase().includes(query)) ||
                (cmd.keywords && cmd.keywords.some(kw => kw.toLowerCase().includes(query)))
            );
        }

        this.selectedIndex = 0;
        this.renderResults();
    }

    renderResults() {
        this.resultsList.innerHTML = '';

        if (this.filteredCommands.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'command-palette-no-results';
            noResults.textContent = 'No commands found';
            this.resultsList.appendChild(noResults);
            return;
        }

        this.filteredCommands.forEach((cmd, index) => {
            const item = document.createElement('div');
            item.className = 'command-palette-item';
            if (index === this.selectedIndex) {
                item.classList.add('selected');
            }

            const icon = document.createElement('i');
            icon.className = cmd.icon || 'fas fa-terminal';

            const content = document.createElement('div');
            content.className = 'command-palette-item-content';

            const name = document.createElement('div');
            name.className = 'command-palette-item-name';
            name.textContent = cmd.name;

            const desc = document.createElement('div');
            desc.className = 'command-palette-item-desc';
            desc.textContent = cmd.description || '';

            content.appendChild(name);
            if (cmd.description) content.appendChild(desc);

            item.appendChild(icon);
            item.appendChild(content);

            if (cmd.shortcut) {
                const shortcut = document.createElement('div');
                shortcut.className = 'command-palette-item-shortcut';
                shortcut.textContent = cmd.shortcut;
                item.appendChild(shortcut);
            }

            item.addEventListener('click', () => {
                this.executeCommand(cmd);
            });

            this.resultsList.appendChild(item);
        });
    }

    handleKeyDown(e) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCommands.length - 1);
                this.renderResults();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                this.renderResults();
                break;
            case 'Enter':
                e.preventDefault();
                if (this.filteredCommands[this.selectedIndex]) {
                    this.executeCommand(this.filteredCommands[this.selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.hide();
                break;
        }
    }

    executeCommand(cmd) {
        this.hide();
        if (cmd.action) {
            cmd.action();
        }
    }

    addCommand(command) {
        this.commands.push(command);
    }

    updateCommands(commands) {
        this.commands = commands;
    }
}

// Add CSS for command palette (to be injected)
export const commandPaletteCSS = `
.command-palette-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 10000;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 10vh;
}

.command-palette {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    width: 90%;
    max-width: 600px;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.command-palette-input {
    width: 100%;
    padding: 1.5rem;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border);
    color: var(--text-primary);
    font-size: 1.1rem;
    outline: none;
}

.command-palette-input::placeholder {
    color: var(--text-tertiary);
}

.command-palette-results {
    overflow-y: auto;
    max-height: 60vh;
    padding: 0.5rem;
}

.command-palette-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border-radius: var(--radius);
    cursor: pointer;
    transition: var(--transition-fast);
}

.command-palette-item:hover,
.command-palette-item.selected {
    background: var(--bg-tertiary);
}

.command-palette-item i {
    color: var(--primary);
    font-size: 1.2rem;
    width: 24px;
    text-align: center;
}

.command-palette-item-content {
    flex: 1;
}

.command-palette-item-name {
    color: var(--text-primary);
    font-weight: 600;
    margin-bottom: 0.25rem;
}

.command-palette-item-desc {
    color: var(--text-tertiary);
    font-size: 0.85rem;
}

.command-palette-item-shortcut {
    color: var(--text-tertiary);
    font-size: 0.85rem;
    font-family: 'Fira Code', monospace;
    background: var(--bg-quaternary);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
}

.command-palette-no-results {
    text-align: center;
    padding: 2rem;
    color: var(--text-tertiary);
}
`;
