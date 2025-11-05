// Export utilities for Munin
// Provides multiple export formats: JSON, Markdown, HTML, and CSV

/**
 * Export notes as JSON
 * @param {Array} notes - Array of note objects
 * @param {Object} options - Export options
 * @returns {string} JSON string
 */
export function exportAsJSON(notes, options = {}) {
    const { includeMetadata = true, pretty = true } = options;

    const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        source: 'Munin Knowledge Base',
        notesCount: notes.length,
        notes: notes.map(note => {
            const exported = {
                id: note.id,
                title: note.title,
                content: note.content,
                folder: note.folder,
                tags: note.tags || [],
                created: note.created,
                modified: note.modified
            };

            if (includeMetadata) {
                if (note.servings) exported.servings = note.servings;
                if (note.embedding) exported.embedding = note.embedding;
            }

            return exported;
        })
    };

    return pretty ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
}

/**
 * Export notes as Markdown
 * @param {Array} notes - Array of note objects
 * @param {Object} options - Export options
 * @returns {string} Markdown content
 */
export function exportAsMarkdown(notes, options = {}) {
    const { includeTOC = true, groupByFolder = true } = options;

    let markdown = `# Munin Knowledge Base Export\n\n`;
    markdown += `**Export Date:** ${new Date().toLocaleString()}\n`;
    markdown += `**Total Notes:** ${notes.length}\n\n`;

    // Table of Contents
    if (includeTOC) {
        markdown += `## Table of Contents\n\n`;
        if (groupByFolder) {
            const folders = [...new Set(notes.map(n => n.folder))].sort();
            folders.forEach(folder => {
                const folderNotes = notes.filter(n => n.folder === folder);
                markdown += `- **${folder}** (${folderNotes.length} notes)\n`;
                folderNotes.forEach(note => {
                    const anchor = note.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    markdown += `  - [${note.title}](#${anchor})\n`;
                });
            });
        } else {
            notes.forEach(note => {
                const anchor = note.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                markdown += `- [${note.title}](#${anchor})\n`;
            });
        }
        markdown += `\n---\n\n`;
    }

    // Content
    if (groupByFolder) {
        const folders = [...new Set(notes.map(n => n.folder))].sort();
        folders.forEach(folder => {
            markdown += `# ${folder}\n\n`;
            const folderNotes = notes.filter(n => n.folder === folder);
            folderNotes.forEach(note => {
                markdown += formatNoteAsMarkdown(note);
            });
        });
    } else {
        notes.forEach(note => {
            markdown += formatNoteAsMarkdown(note);
        });
    }

    return markdown;
}

/**
 * Format a single note as Markdown
 * @param {Object} note - Note object
 * @returns {string} Markdown formatted note
 */
function formatNoteAsMarkdown(note) {
    let md = `## ${note.title}\n\n`;

    // Metadata
    if (note.tags && note.tags.length > 0) {
        md += `**Tags:** ${note.tags.map(t => `\`${t}\``).join(', ')}\n`;
    }
    md += `**Created:** ${new Date(note.created).toLocaleString()}\n`;
    md += `**Modified:** ${new Date(note.modified).toLocaleString()}\n`;
    if (note.servings) {
        md += `**Servings:** ${note.servings}\n`;
    }
    md += `\n`;

    // Content
    md += note.content + '\n\n';
    md += `---\n\n`;

    return md;
}

/**
 * Export notes as HTML
 * @param {Array} notes - Array of note objects
 * @param {Object} options - Export options
 * @returns {string} HTML content
 */
export function exportAsHTML(notes, options = {}) {
    const { includeTOC = true, groupByFolder = true, theme = 'default' } = options;

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Munin Knowledge Base Export</title>
    <style>
        ${getHTMLExportStyles(theme)}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Munin Knowledge Base Export</h1>
            <p class="export-meta">
                <strong>Export Date:</strong> ${new Date().toLocaleString()} |
                <strong>Total Notes:</strong> ${notes.length}
            </p>
        </header>
`;

    // Table of Contents
    if (includeTOC) {
        html += `        <nav class="toc">
            <h2>Table of Contents</h2>
            <ul>
`;
        if (groupByFolder) {
            const folders = [...new Set(notes.map(n => n.folder))].sort();
            folders.forEach(folder => {
                const folderNotes = notes.filter(n => n.folder === folder);
                html += `                <li><strong>${folder}</strong> (${folderNotes.length} notes)
                    <ul>
`;
                folderNotes.forEach(note => {
                    const anchor = note.id;
                    html += `                        <li><a href="#note-${anchor}">${escapeHtml(note.title)}</a></li>\n`;
                });
                html += `                    </ul>
                </li>
`;
            });
        } else {
            notes.forEach(note => {
                const anchor = note.id;
                html += `                <li><a href="#note-${anchor}">${escapeHtml(note.title)}</a></li>\n`;
            });
        }
        html += `            </ul>
        </nav>
`;
    }

    // Content
    html += `        <main class="content">\n`;
    if (groupByFolder) {
        const folders = [...new Set(notes.map(n => n.folder))].sort();
        folders.forEach(folder => {
            html += `            <section class="folder-section">
                <h2 class="folder-title">${escapeHtml(folder)}</h2>
`;
            const folderNotes = notes.filter(n => n.folder === folder);
            folderNotes.forEach(note => {
                html += formatNoteAsHTML(note);
            });
            html += `            </section>\n`;
        });
    } else {
        notes.forEach(note => {
            html += formatNoteAsHTML(note);
        });
    }
    html += `        </main>
    </div>
</body>
</html>`;

    return html;
}

/**
 * Format a single note as HTML
 * @param {Object} note - Note object
 * @returns {string} HTML formatted note
 */
function formatNoteAsHTML(note) {
    let html = `                <article class="note" id="note-${note.id}">
                    <h3 class="note-title">${escapeHtml(note.title)}</h3>
                    <div class="note-meta">
`;
    if (note.tags && note.tags.length > 0) {
        html += `                        <div class="tags">
                            ${note.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(' ')}
                        </div>
`;
    }
    html += `                        <div class="dates">
                            <span><strong>Created:</strong> ${new Date(note.created).toLocaleString()}</span>
                            <span><strong>Modified:</strong> ${new Date(note.modified).toLocaleString()}</span>
`;
    if (note.servings) {
        html += `                            <span><strong>Servings:</strong> ${note.servings}</span>\n`;
    }
    html += `                        </div>
                    </div>
                    <div class="note-content">
                        ${convertMarkdownToHTML(note.content)}
                    </div>
                </article>
`;
    return html;
}

/**
 * Simple markdown to HTML converter
 */
function convertMarkdownToHTML(markdown) {
    // Use marked.js if available, otherwise basic conversion
    if (typeof marked !== 'undefined') {
        return marked.parse(markdown);
    }

    // Basic markdown conversion
    let html = markdown;

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Lists
    html = html.replace(/^\- (.+)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Paragraphs
    html = html.split('\n\n').map(p => `<p>${p}</p>`).join('\n');

    return html;
}

/**
 * Export notes as CSV
 * @param {Array} notes - Array of note objects
 * @returns {string} CSV content
 */
export function exportAsCSV(notes) {
    const headers = ['ID', 'Title', 'Folder', 'Tags', 'Created', 'Modified', 'Content Preview'];
    let csv = headers.join(',') + '\n';

    notes.forEach(note => {
        const row = [
            note.id,
            escapeCsv(note.title),
            escapeCsv(note.folder),
            escapeCsv((note.tags || []).join('; ')),
            new Date(note.created).toISOString(),
            new Date(note.modified).toISOString(),
            escapeCsv(note.content.substring(0, 100) + (note.content.length > 100 ? '...' : ''))
        ];
        csv += row.join(',') + '\n';
    });

    return csv;
}

/**
 * Download a file
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 */
export function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Get timestamp for filename
 * @returns {string} Formatted timestamp
 */
export function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
}

/**
 * Helper: Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Helper: Escape CSV
 */
function escapeCsv(text) {
    if (text === null || text === undefined) return '';
    const str = String(text);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

/**
 * Get CSS styles for HTML export
 */
function getHTMLExportStyles(theme) {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-radius: 8px;
        }

        header {
            border-bottom: 3px solid #E63946;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }

        header h1 {
            color: #E63946;
            font-size: 2.5rem;
            margin-bottom: 10px;
        }

        .export-meta {
            color: #666;
            font-size: 0.9rem;
        }

        .toc {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 30px;
        }

        .toc h2 {
            color: #E63946;
            margin-bottom: 15px;
            font-size: 1.5rem;
        }

        .toc ul {
            list-style: none;
            padding-left: 0;
        }

        .toc ul ul {
            padding-left: 20px;
            margin-top: 5px;
        }

        .toc li {
            margin: 5px 0;
        }

        .toc a {
            color: #0066cc;
            text-decoration: none;
        }

        .toc a:hover {
            text-decoration: underline;
        }

        .folder-section {
            margin-bottom: 40px;
        }

        .folder-title {
            color: #E63946;
            font-size: 2rem;
            margin-bottom: 20px;
            border-bottom: 2px solid #E63946;
            padding-bottom: 10px;
        }

        .note {
            margin-bottom: 30px;
            padding: 20px;
            background: #fafafa;
            border-left: 4px solid #E63946;
            border-radius: 4px;
        }

        .note-title {
            color: #222;
            font-size: 1.5rem;
            margin-bottom: 10px;
        }

        .note-meta {
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
        }

        .tags {
            margin-bottom: 10px;
        }

        .tag {
            display: inline-block;
            background: #E63946;
            color: white;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 0.85rem;
            margin-right: 5px;
            margin-bottom: 5px;
        }

        .dates {
            font-size: 0.85rem;
            color: #666;
        }

        .dates span {
            margin-right: 15px;
        }

        .note-content {
            color: #333;
            line-height: 1.8;
        }

        .note-content h1, .note-content h2, .note-content h3 {
            margin-top: 20px;
            margin-bottom: 10px;
        }

        .note-content ul, .note-content ol {
            margin-left: 20px;
            margin-bottom: 10px;
        }

        .note-content p {
            margin-bottom: 10px;
        }

        .note-content code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }

            .container {
                box-shadow: none;
                padding: 20px;
            }

            .note {
                page-break-inside: avoid;
            }
        }
    `;
}

/**
 * Import notes from JSON
 * @param {string} jsonString - JSON string to import
 * @returns {Object} Parsed import data
 */
export function importFromJSON(jsonString) {
    try {
        const data = JSON.parse(jsonString);

        // Validate structure
        if (!data.notes || !Array.isArray(data.notes)) {
            throw new Error('Invalid import file: missing notes array');
        }

        // Validate each note has required fields
        data.notes.forEach((note, index) => {
            if (!note.title || !note.content) {
                throw new Error(`Invalid note at index ${index}: missing title or content`);
            }
        });

        return {
            success: true,
            notes: data.notes,
            metadata: {
                exportDate: data.exportDate,
                version: data.version,
                notesCount: data.notesCount
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}
