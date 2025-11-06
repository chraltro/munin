// Help and onboarding system for Munin
// Provides guided tours, tooltips, and contextual help

/**
 * Help topics with detailed explanations
 */
const HELP_TOPICS = {
    'getting-started': {
        title: 'Getting Started with Munin',
        icon: 'fa-rocket',
        content: `
## Welcome to Munin!

Munin is a powerful AI-powered knowledge management system. Here's how to get started:

### Creating Your First Note
1. Click the **+ icon** in the header or press **Alt+N**
2. Start typing in the editor
3. Press **Ctrl+S** to save

### Using Natural Language Commands
Type commands in the command input at the bottom:
- "Save this recipe for chocolate cake..."
- "Create a note about JavaScript async/await"
- "Who was Odin?" (Ask questions!)

### Organizing Notes
- **Folders**: Notes are automatically organized by topic
- **Tags**: Add tags for better organization
- **Search**: Use the search bar with advanced operators

### Keyboard Shortcuts
Press **?** to see all available shortcuts.
        `
    },
    'linking': {
        title: 'Linking Notes Together',
        icon: 'fa-link',
        content: `
## Note Linking

Create connections between your notes for better knowledge management.

### Creating Links
1. Type **[** in the editor
2. Start typing a note title
3. Select from autocomplete
4. Link is created as **[[Note Title]]**

### Viewing Backlinks
When editing a note, scroll down to see which other notes link to it.

### Clickable Links
In preview mode, click any note link to jump to that note instantly.

### Wiki-Style Links
- **[[Note Title]]** - Wiki-style link
- **[Custom Text](app://note/ID)** - Custom link text
        `
    },
    'search': {
        title: 'Advanced Search',
        icon: 'fa-search',
        content: `
## Advanced Search Features

Munin includes powerful search capabilities with fuzzy matching and operators.

### Basic Search
Just type words to search across all notes.

### Search Operators
- **"exact phrase"** - Match exact text
- **tag:recipe** or **#recipe** - Find notes with tag
- **folder:Recipes** - Search in specific folder
- **-excluded** - Exclude terms
- **before:2024-12-31** - Notes before date
- **after:2024-01-01** - Notes after date

### Combining Operators
\`\`\`
tag:recipe folder:Desserts "chocolate" -nuts
\`\`\`

### Fuzzy Matching
Munin automatically finds similar words even with typos!
        `
    },
    'export': {
        title: 'Export & Backup',
        icon: 'fa-download',
        content: `
## Exporting Your Notes

Keep your data safe with multiple export formats.

### Export Formats
1. **JSON** - Full data with metadata
2. **Markdown** - Plain text, portable
3. **HTML** - Styled web page
4. **CSV** - Spreadsheet format

### Export Options
- Group by folder
- Include table of contents
- Export current folder only

### How to Export
1. Click export icon or press **Alt+Shift+E**
2. Choose format
3. Configure options
4. Click Export

### Importing
Import JSON files to restore or merge notes.
        `
    },
    'markdown': {
        title: 'Markdown Features',
        icon: 'fa-markdown',
        content: `
## Advanced Markdown

Munin supports extended markdown with powerful features.

### Syntax Highlighting
\`\`\`javascript
function hello() {
  console.log("Hello World!");
}
\`\`\`

### Mermaid Diagrams
\`\`\`mermaid
graph TD
  A[Start] --> B[Process]
  B --> C[End]
\`\`\`

### Task Lists
- [ ] Unchecked task
- [x] Completed task

### Callouts
> [!NOTE]
> This is an important note!

> [!WARNING]
> This is a warning!

### Tables
| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
        `
    },
    'analytics': {
        title: 'Analytics Dashboard',
        icon: 'fa-chart-bar',
        content: `
## Analytics & Insights

Track your productivity and note patterns.

### Key Metrics
- **Total Notes**: All notes in your knowledge base
- **Total Words**: Sum of all note content
- **Writing Streak**: Consecutive days with activity
- **Notes This Week**: Recent productivity

### Visualizations
- **Activity Chart**: 7-day activity history
- **Top Folders**: Notes distribution by folder
- **Top Tags**: Most used tags
- **Note Highlights**: Longest, newest, oldest notes

### Accessing Analytics
Press **Alt+Shift+A** or click the analytics icon in the header.
        `
    },
    'shortcuts': {
        title: 'Keyboard Shortcuts',
        icon: 'fa-keyboard',
        content: `
## Keyboard Shortcuts

Work faster with keyboard shortcuts!

### Essential Shortcuts
- **Ctrl+K** - Command palette
- **Alt+N** - New note
- **Ctrl+S** - Save note
- **?** - Show all shortcuts

### Navigation
- **Alt+E** - Toggle edit mode
- **Alt+P** - Toggle preview
- **Esc** - Close editor

### Data Management
- **Alt+Shift+E** - Export notes
- **Alt+Shift+I** - Import notes
- **Alt+Shift+A** - Analytics

### Editor
- **[** - Start link autocomplete

### Pro Tip
Use **Ctrl+K** to access the command palette for quick access to all features!
        `
    }
};

/**
 * Create help modal
 * @returns {HTMLElement} Help modal element
 */
export function createHelpModal() {
    const modal = document.createElement('div');
    modal.id = 'helpModal';
    modal.className = 'modal-overlay';
    modal.style.display = 'none';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; max-height: 90vh;">
            <div class="modal-header">
                <h3><i class="fas fa-question-circle"></i> Munin Help Center</h3>
                <button id="closeHelpBtn" class="modal-close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="display: flex; gap: 1.5rem; overflow: hidden;">
                <div id="helpSidebar" class="help-sidebar">
                    <!-- Topic list -->
                </div>
                <div id="helpContent" class="help-content">
                    <!-- Content area -->
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Setup event listeners
    const closeBtn = modal.querySelector('#closeHelpBtn');
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Populate sidebar
    renderHelpSidebar();

    // Show first topic by default
    showHelpTopic('getting-started');

    return modal;
}

/**
 * Render help sidebar with topics
 */
function renderHelpSidebar() {
    const sidebar = document.getElementById('helpSidebar');
    if (!sidebar) return;

    sidebar.innerHTML = '<h4>Help Topics</h4>';

    const topicList = document.createElement('div');
    topicList.className = 'help-topic-list';

    Object.entries(HELP_TOPICS).forEach(([key, topic]) => {
        const item = document.createElement('div');
        item.className = 'help-topic-item';
        item.dataset.topic = key;

        item.innerHTML = `
            <i class="fas ${topic.icon}"></i>
            <span>${topic.title}</span>
        `;

        item.addEventListener('click', () => {
            document.querySelectorAll('.help-topic-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            showHelpTopic(key);
        });

        topicList.appendChild(item);
    });

    sidebar.appendChild(topicList);

    // Set first item as active
    topicList.querySelector('.help-topic-item')?.classList.add('active');
}

/**
 * Show help topic content
 * @param {string} topicKey - Topic key
 */
function showHelpTopic(topicKey) {
    const content = document.getElementById('helpContent');
    if (!content) return;

    const topic = HELP_TOPICS[topicKey];
    if (!topic) return;

    // Convert markdown to HTML if marked is available
    let html = topic.content;
    if (typeof marked !== 'undefined') {
        html = marked.parse(topic.content);
    }

    // Sanitize with DOMPurify if available
    if (typeof DOMPurify !== 'undefined') {
        html = DOMPurify.sanitize(html);
    }

    content.innerHTML = html;
    content.scrollTop = 0;
}

/**
 * Show help modal
 * @param {string} topicKey - Optional topic to show
 */
export function showHelp(topicKey = 'getting-started') {
    let modal = document.getElementById('helpModal');

    if (!modal) {
        modal = createHelpModal();
    }

    if (topicKey && HELP_TOPICS[topicKey]) {
        showHelpTopic(topicKey);

        // Update active state in sidebar
        document.querySelectorAll('.help-topic-item').forEach(el => {
            el.classList.toggle('active', el.dataset.topic === topicKey);
        });
    }

    modal.style.display = 'flex';
}

/**
 * Add help button to header
 */
export function addHelpButton() {
    const header = document.querySelector('.header-actions');
    if (!header) return;

    const helpBtn = document.createElement('button');
    helpBtn.id = 'helpBtn';
    helpBtn.className = 'icon-btn';
    helpBtn.title = 'Help Center (F1)';
    helpBtn.innerHTML = '<i class="fas fa-question-circle"></i>';

    helpBtn.addEventListener('click', () => showHelp());

    // Insert before settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        header.insertBefore(helpBtn, settingsBtn);
    } else {
        header.appendChild(helpBtn);
    }
}

/**
 * Show contextual help tooltip
 * @param {HTMLElement} element - Element to attach tooltip
 * @param {string} message - Help message
 */
export function showTooltip(element, message) {
    const tooltip = document.createElement('div');
    tooltip.className = 'help-tooltip';
    tooltip.textContent = message;

    document.body.appendChild(tooltip);

    const rect = element.getBoundingClientRect();
    tooltip.style.position = 'fixed';
    tooltip.style.top = `${rect.bottom + 10}px`;
    tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;

    setTimeout(() => {
        tooltip.remove();
    }, 3000);
}

// Help system CSS
export const helpSystemCSS = `
.help-sidebar {
    width: 250px;
    border-right: 1px solid var(--border);
    padding-right: 1.5rem;
    overflow-y: auto;
}

.help-sidebar h4 {
    color: var(--text-secondary);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 1rem;
}

.help-topic-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.help-topic-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: var(--radius);
    cursor: pointer;
    transition: var(--transition-fast);
    color: var(--text-secondary);
}

.help-topic-item:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

.help-topic-item.active {
    background: var(--primary);
    color: white;
}

.help-topic-item i {
    font-size: 1.2rem;
    width: 24px;
    text-align: center;
}

.help-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 1rem;
}

.help-content h2 {
    color: var(--primary);
    margin-bottom: 1rem;
    font-size: 1.8rem;
}

.help-content h3 {
    color: var(--text-primary);
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    font-size: 1.3rem;
}

.help-content p {
    color: var(--text-secondary);
    line-height: 1.8;
    margin-bottom: 1rem;
}

.help-content code {
    background: var(--bg-tertiary);
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-family: 'Fira Code', monospace;
    font-size: 0.9em;
}

.help-content pre {
    background: var(--bg-tertiary);
    padding: 1rem;
    border-radius: var(--radius);
    overflow-x: auto;
    margin: 1rem 0;
}

.help-content pre code {
    background: transparent;
    padding: 0;
}

.help-content ul,
.help-content ol {
    margin-left: 1.5rem;
    margin-bottom: 1rem;
    color: var(--text-secondary);
}

.help-content li {
    margin-bottom: 0.5rem;
    line-height: 1.6;
}

.help-content strong {
    color: var(--text-primary);
    font-weight: 600;
}

.help-tooltip {
    position: fixed;
    background: var(--bg-secondary);
    color: var(--text-primary);
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-lg);
    z-index: 10000;
    font-size: 0.9rem;
    max-width: 250px;
    animation: tooltipFadeIn 0.2s ease;
}

@keyframes tooltipFadeIn {
    from {
        opacity: 0;
        transform: translateY(-5px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (max-width: 768px) {
    .help-sidebar {
        width: 200px;
        padding-right: 1rem;
    }

    .help-content {
        padding: 0 0.5rem;
    }
}
`;
