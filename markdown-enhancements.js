// Markdown enhancements for Munin
// Adds syntax highlighting, mermaid diagrams, and other advanced markdown features

/**
 * Initialize syntax highlighting
 * Uses highlight.js for code blocks
 */
export function initSyntaxHighlighting() {
    // Load highlight.js dynamically
    if (!window.hljs) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
        document.head.appendChild(script);

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
        document.head.appendChild(link);

        script.onload = () => {
            console.log('Syntax highlighting loaded');
        };
    }
}

/**
 * Initialize mermaid for diagrams
 */
export function initMermaid() {
    if (!window.mermaid) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        script.type = 'module';
        document.head.appendChild(script);

        script.onload = () => {
            console.log('Mermaid loaded');
            if (window.mermaid) {
                window.mermaid.initialize({
                    startOnLoad: true,
                    theme: 'dark',
                    securityLevel: 'loose'
                });
            }
        };
    }
}

/**
 * Process markdown content with enhanced features
 * @param {string} markdown - Raw markdown content
 * @param {Object} options - Processing options
 * @returns {string} Processed HTML
 */
export function processEnhancedMarkdown(markdown, options = {}) {
    if (!markdown) return '';

    const { enableSyntaxHighlight = true, enableMermaid = true, enableMath = false } = options;

    let html = markdown;

    // Use marked.js if available
    if (typeof marked !== 'undefined') {
        // Configure marked
        marked.setOptions({
            gfm: true,
            breaks: true,
            pedantic: false,
            smartLists: true,
            smartypants: true
        });

        html = marked.parse(markdown);
    }

    // Process code blocks for syntax highlighting
    if (enableSyntaxHighlight && window.hljs) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        const codeBlocks = tempDiv.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            // Detect language from class
            const classes = Array.from(block.classList);
            const langClass = classes.find(c => c.startsWith('language-'));

            if (langClass) {
                const lang = langClass.replace('language-', '');
                try {
                    const highlighted = window.hljs.highlight(block.textContent, {
                        language: lang
                    });
                    block.innerHTML = highlighted.value;
                    block.classList.add('hljs');
                } catch (e) {
                    // Language not found, use auto-detect
                    window.hljs.highlightElement(block);
                }
            } else {
                window.hljs.highlightElement(block);
            }
        });

        html = tempDiv.innerHTML;
    }

    // Process mermaid diagrams
    if (enableMermaid && window.mermaid) {
        html = processMermaidDiagrams(html);
    }

    // Process math equations (if enabled)
    if (enableMath) {
        html = processMathEquations(html);
    }

    // Sanitize with DOMPurify
    if (typeof DOMPurify !== 'undefined') {
        html = DOMPurify.sanitize(html, {
            ADD_TAGS: ['mermaid'],
            ADD_ATTR: ['class', 'id', 'data-processed']
        });
    }

    return html;
}

/**
 * Process mermaid diagram code blocks
 * @param {string} html - HTML content
 * @returns {string} HTML with mermaid diagrams processed
 */
function processMermaidDiagrams(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const mermaidBlocks = tempDiv.querySelectorAll('code.language-mermaid, pre.language-mermaid code');

    mermaidBlocks.forEach((block, index) => {
        const code = block.textContent;
        const mermaidDiv = document.createElement('div');
        mermaidDiv.className = 'mermaid';
        mermaidDiv.textContent = code;
        mermaidDiv.id = `mermaid-${Date.now()}-${index}`;

        // Replace the code block with mermaid div
        const pre = block.closest('pre');
        if (pre) {
            pre.replaceWith(mermaidDiv);
        } else {
            block.replaceWith(mermaidDiv);
        }
    });

    return tempDiv.innerHTML;
}

/**
 * Process math equations (LaTeX-style)
 * @param {string} html - HTML content
 * @returns {string} HTML with math equations processed
 */
function processMathEquations(html) {
    // Inline math: $equation$
    html = html.replace(/\$([^$]+)\$/g, '<span class="math-inline">$1</span>');

    // Block math: $$equation$$
    html = html.replace(/\$\$([^$]+)\$\$/g, '<div class="math-block">$1</div>');

    return html;
}

/**
 * Add custom markdown extensions
 */
export function addCustomMarkdownExtensions() {
    if (typeof marked === 'undefined') return;

    // Task lists enhancement
    const renderer = new marked.Renderer();

    const originalListItem = renderer.listitem;
    renderer.listitem = function(text) {
        // Convert [ ] and [x] to checkboxes
        if (text.startsWith('[ ] ')) {
            return '<li class="task-list-item"><input type="checkbox" disabled> ' + text.substring(4) + '</li>';
        }
        if (text.startsWith('[x] ') || text.startsWith('[X] ')) {
            return '<li class="task-list-item"><input type="checkbox" checked disabled> ' + text.substring(4) + '</li>';
        }
        return originalListItem.call(this, text);
    };

    // Callouts/Admonitions (> [!NOTE], > [!WARNING], etc.)
    const originalBlockquote = renderer.blockquote;
    renderer.blockquote = function(quote) {
        // Check for callout syntax
        const calloutMatch = quote.match(/^<p>\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]<\/p>\n(.+)/is);

        if (calloutMatch) {
            const type = calloutMatch[1].toLowerCase();
            const content = calloutMatch[2];

            return `<div class="callout callout-${type}">
                <div class="callout-title">
                    <i class="fas fa-${getCalloutIcon(type)}"></i>
                    <strong>${calloutMatch[1]}</strong>
                </div>
                <div class="callout-content">${content}</div>
            </div>`;
        }

        return originalBlockquote.call(this, quote);
    };

    marked.setOptions({ renderer });
}

/**
 * Get icon for callout type
 * @param {string} type - Callout type
 * @returns {string} Font Awesome icon class
 */
function getCalloutIcon(type) {
    const icons = {
        note: 'info-circle',
        tip: 'lightbulb',
        warning: 'exclamation-triangle',
        important: 'exclamation-circle',
        caution: 'radiation'
    };
    return icons[type] || 'info-circle';
}

/**
 * Add table of contents to markdown
 * @param {string} markdown - Markdown content
 * @returns {string} Markdown with TOC
 */
export function generateTableOfContents(markdown) {
    const headings = [];
    const lines = markdown.split('\n');

    // Extract headings
    lines.forEach((line, index) => {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
            const level = match[1].length;
            const title = match[2].trim();
            const anchor = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

            headings.push({
                level,
                title,
                anchor,
                line: index
            });
        }
    });

    if (headings.length === 0) {
        return markdown; // No headings found
    }

    // Generate TOC
    let toc = '## Table of Contents\n\n';

    headings.forEach(heading => {
        const indent = '  '.repeat(heading.level - 1);
        toc += `${indent}- [${heading.title}](#${heading.anchor})\n`;
    });

    toc += '\n';

    // Insert TOC after first heading or at start
    const firstHeadingIndex = headings[0]?.line || 0;
    const beforeTOC = lines.slice(0, firstHeadingIndex + 1).join('\n');
    const afterTOC = lines.slice(firstHeadingIndex + 1).join('\n');

    return beforeTOC + '\n\n' + toc + afterTOC;
}

// Add CSS for enhanced markdown features
export const markdownEnhancementsCSS = `
/* Syntax highlighting enhancements */
.note-preview pre {
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem;
    overflow-x: auto;
}

.note-preview code {
    font-family: 'Fira Code', 'Courier New', monospace;
    font-size: 0.9em;
}

.note-preview pre code {
    background: transparent;
    padding: 0;
    border: none;
}

/* Mermaid diagrams */
.note-preview .mermaid {
    background: var(--bg-secondary);
    padding: 1rem;
    border-radius: var(--radius);
    margin: 1rem 0;
    text-align: center;
}

/* Task lists */
.task-list-item {
    list-style: none;
    margin-left: -1.5rem;
}

.task-list-item input[type="checkbox"] {
    margin-right: 0.5rem;
}

/* Callouts/Admonitions */
.callout {
    margin: 1rem 0;
    padding: 1rem;
    border-left: 4px solid;
    border-radius: var(--radius);
}

.callout-note {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
}

.callout-tip {
    border-color: #10b981;
    background: rgba(16, 185, 129, 0.1);
}

.callout-warning {
    border-color: #f59e0b;
    background: rgba(245, 158, 11, 0.1);
}

.callout-important {
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
}

.callout-caution {
    border-color: #a855f7;
    background: rgba(168, 85, 247, 0.1);
}

.callout-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-weight: 600;
}

.callout-title i {
    font-size: 1.1rem;
}

.callout-note .callout-title { color: #3b82f6; }
.callout-tip .callout-title { color: #10b981; }
.callout-warning .callout-title { color: #f59e0b; }
.callout-important .callout-title { color: #ef4444; }
.callout-caution .callout-title { color: #a855f7; }

/* Math equations */
.math-inline {
    font-family: 'Latin Modern Math', 'Times New Roman', serif;
    font-style: italic;
}

.math-block {
    font-family: 'Latin Modern Math', 'Times New Roman', serif;
    font-style: italic;
    padding: 1rem;
    margin: 1rem 0;
    text-align: center;
    background: var(--bg-secondary);
    border-radius: var(--radius);
}

/* Tables */
.note-preview table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
}

.note-preview table th,
.note-preview table td {
    padding: 0.75rem;
    border: 1px solid var(--border);
    text-align: left;
}

.note-preview table th {
    background: var(--bg-tertiary);
    font-weight: 600;
}

.note-preview table tr:nth-child(even) {
    background: var(--bg-secondary);
}

/* Horizontal rules */
.note-preview hr {
    border: none;
    border-top: 2px solid var(--border);
    margin: 2rem 0;
}

/* Blockquotes */
.note-preview blockquote {
    margin: 1rem 0;
    padding: 0.5rem 1rem;
    border-left: 4px solid var(--primary);
    background: var(--bg-secondary);
    font-style: italic;
    color: var(--text-secondary);
}
`;

/**
 * Initialize all markdown enhancements
 */
export function initializeMarkdownEnhancements() {
    initSyntaxHighlighting();
    initMermaid();
    addCustomMarkdownExtensions();

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = markdownEnhancementsCSS;
    document.head.appendChild(style);

    console.log('Markdown enhancements initialized');
}
