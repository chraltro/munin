// --- DEBOUNCE UTILITY ---
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

const APP_CONFIG = {
    passwordHash: '7f72131af35c82819bb44f256e34419f381fdeb465b1727d153b58030fabbcb7',
    gistFilename: 'chrisidian-notes.json',
    embeddingModel: 'text-embedding-004' // Google's latest embedding model
};

let state = {
    isAuthenticated: false,
    geminiKey: '',
    githubToken: '',
    notes: [],
    folders: ['Prompts', 'Recipes'],
    currentFolder: 'All Notes',
    currentNote: null,
    gistId: null,
    isNoteDirty: false,
    originalNoteContent: '' // Used to check if content changed for embedding
};

const THEMES = [
    { name: 'Slate', className: 'theme-slate', gradient: ['#64748b', '#94a3b8'] },
    { name: 'Dusk', className: 'theme-dusk', gradient: ['#4f46e5', '#7c3aed'] },
    { name: 'Forest', className: 'theme-forest', gradient: ['#16a34a', '#65a30d'] },
    { name: 'Rose', className: 'theme-rose', gradient: ['#be185d', '#e11d48'] },
    { name: 'Ocean', className: 'theme-ocean', gradient: ['#0ea5e9', '#0891b2'] },
    { name: 'Amethyst', className: 'theme-amethyst', gradient: ['#9333ea', '#be185d'] },
    { name: 'Sunset', className: 'theme-sunset', gradient: ['#ea580c', '#ca8a04'] },
    { name: 'Mint', className: 'theme-mint', gradient: ['#10b981', '#16a34a'] },
    { name: 'Merlot', className: 'theme-merlot', gradient: ['#be185d', '#9d174d'] },
    { name: 'Olive', className: 'theme-olive', gradient: ['#65a30d', '#4d7c0f'] },
    { name: 'Cyber', className: 'theme-cyber', gradient: ['#0891b2', '#2563eb'] },
    { name: 'Espresso', className: 'theme-espresso', gradient: ['#a16207', '#854d0e'] },
    { name: 'Arctic', className: 'theme-arctic', gradient: ['#3b82f6', '#60a5fa'] },
    { name: 'Sandstone', className: 'theme-sandstone', gradient: ['#ca8a04', '#b45309'] },
    { name: 'Monochrome', className: 'theme-monochrome', gradient: ['#a1a1aa', '#71717a'] },
    { name: 'Bronze', className: 'theme-bronze', gradient: ['#b45309', '#92400e'] },
];

const FONTS = [
    { name: 'Inter', family: "'Inter', sans-serif" },
    { name: 'Roboto', family: "'Roboto', sans-serif" },
    { name: 'Open Sans', family: "'Open Sans', sans-serif" },
    { name: 'Lato', family: "'Lato', sans-serif" },
    { name: 'Nunito', family: "'Nunito', sans-serif" },
    { name: 'Merriweather', family: "'Merriweather', serif" },
    { name: 'Lora', family: "'Lora', serif" },
    { name: 'Source Serif Pro', family: "'Source Serif Pro', serif" },
    { name: 'Fira Code', family: "'Fira Code', monospace" },
    { name: 'JetBrains Mono', family: "'JetBrains Mono', monospace" }
];

let userPreferences = {
    fontFamily: FONTS[0].family,
    fontSize: '16px',
    lineHeight: '1.6'
};

const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('password');
const geminiKeyInput = document.getElementById('geminiKey');
const githubTokenInput = document.getElementById('githubToken');
const logoutBtn = document.getElementById('logoutBtn');
const commandInput = document.getElementById('commandInput');
const processBtn = document.getElementById('processBtn');
const folderList = document.getElementById('folderList');
const notesList = document.getElementById('notesList');
const currentFolderName = document.getElementById('currentFolderName');
const newFolderBtn = document.getElementById('newFolderBtn');
const newNoteBtn = document.getElementById('newNoteBtn');
const editorPanel = document.getElementById('editorPanel');
const noteTitle = document.getElementById('noteTitle');
const noteEditor = document.getElementById('noteEditor');
const notePreview = document.getElementById('notePreview');
const editModeBtn = document.getElementById('editModeBtn');
const previewModeBtn = document.getElementById('previewModeBtn');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const deleteNoteBtn = document.getElementById('deleteNoteBtn');
const closeEditorBtn = document.getElementById('closeEditorBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const searchInput = document.getElementById('searchInput');
const toggleHeaderBtn = document.getElementById('toggleHeaderBtn');
const aiResponseModal = document.getElementById('aiResponseModal');
const aiResponseOutput = document.getElementById('aiResponseOutput');
const closeAiResponseBtn = document.getElementById('closeAiResponseBtn');
const changeThemeBtn = document.getElementById('changeThemeBtn');
const themeModal = document.getElementById('themeModal');
const themeModalGrid = document.getElementById('themeModalGrid');
const closeThemeModalBtn = document.getElementById('closeThemeModalBtn');
const mobileFolderSelector = document.getElementById('mobileFolderSelector');

const fontFamilySelector = document.getElementById('fontFamilySelector');
const fontSizeSlider = document.getElementById('fontSizeSlider');
const fontSizeValue = document.getElementById('fontSizeValue');
const lineHeightSlider = document.getElementById('lineHeightSlider');
const lineHeightValue = document.getElementById('lineHeightValue');

const debouncedSave = debounce(() => saveCurrentNote(), 2000);
const SAVE_BUTTON_DEFAULT_HTML = '<i class="fas fa-save"></i> Save';

document.addEventListener('DOMContentLoaded', () => {
    if (APP_CONFIG.passwordHash === '7f72131af35c82819bb44f256e34419f381fdeb465b1727d153b58030fabbcb7') {
        console.warn('⚠️ SECURITY WARNING: Using default password hash! Change it before deploying!');
        const warning = document.getElementById('securityWarning');
        if (warning) warning.style.display = 'block';
    }
    loadTheme();
    loadTypography();
    checkAutoLogin();
    setupEventListeners();
});

function checkAutoLogin() {
    const savedAuth = localStorage.getItem('chrisidian_auth');
    if (savedAuth) {
        const auth = JSON.parse(savedAuth);
        state.geminiKey = auth.geminiKey;
        state.githubToken = auth.githubToken;
        state.isAuthenticated = true;
        showMainApp();
        loadData();
    }
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const enteredPasswordHash = await hashPassword(passwordInput.value);
    if (enteredPasswordHash !== APP_CONFIG.passwordHash) {
        alert('Invalid password!');
        return;
    }
    state.geminiKey = geminiKeyInput.value;
    state.githubToken = githubTokenInput.value;
    state.isAuthenticated = true;
    localStorage.setItem('chrisidian_auth', JSON.stringify({
        geminiKey: state.geminiKey,
        githubToken: state.githubToken
    }));
    showMainApp();
    await loadData();
});

async function hashPassword(password) {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('chrisidian_auth');
    state.isAuthenticated = false;
    state.geminiKey = '';
    state.githubToken = '';
    loginScreen.style.display = 'flex';
    mainApp.style.display = 'none';
    passwordInput.value = '';
    geminiKeyInput.value = '';
    githubTokenInput.value = '';
});

function showMainApp() {
    loginScreen.style.display = 'none';
    mainApp.style.display = 'flex';
    renderFolders();
    renderThemeSwitchers();
    renderFontSelector();
    testGeminiAPI().then(result => {
        if (result && result.candidates) {
            console.log('✅ Gemini API is working');
        } else {
            console.error('❌ Gemini API test failed');
        }
    });
}

function setupEventListeners() {
    processBtn.addEventListener('click', processCommand);
    commandInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') processCommand();
    });
    newFolderBtn.addEventListener('click', createNewFolder);
    newNoteBtn.addEventListener('click', createNewNote);
    editModeBtn.addEventListener('click', () => setEditorMode('edit'));
    previewModeBtn.addEventListener('click', () => setEditorMode('preview'));
    saveNoteBtn.addEventListener('click', saveCurrentNote);
    deleteNoteBtn.addEventListener('click', deleteCurrentNote);
    closeEditorBtn.addEventListener('click', closeEditor);
    searchInput.addEventListener('input', renderNotes);
    toggleHeaderBtn.addEventListener('click', toggleEditorHeader);
    closeAiResponseBtn.addEventListener('click', () => aiResponseModal.style.display = 'none');
    aiResponseModal.addEventListener('click', (e) => {
        if (e.target === aiResponseModal) {
            aiResponseModal.style.display = 'none';
        }
    });
    changeThemeBtn.addEventListener('click', () => themeModal.style.display = 'flex');
    closeThemeModalBtn.addEventListener('click', () => themeModal.style.display = 'none');
    themeModal.addEventListener('click', (e) => {
        if (e.target === themeModal) themeModal.style.display = 'none';
    });
    mobileFolderSelector.addEventListener('change', (e) => selectFolder(e.target.value));

    fontFamilySelector.addEventListener('change', handleFontChange);
    fontSizeSlider.addEventListener('input', handleFontSizeChange);
    lineHeightSlider.addEventListener('input', handleLineHeightChange);

    noteTitle.addEventListener('input', () => {
        setDirtyState(true);
        debouncedSave();
    });
    noteEditor.addEventListener('input', () => {
        setDirtyState(true);
        debouncedSave();
    });
}

function toggleEditorHeader() {
    editorPanel.classList.toggle('header-collapsed');
    const icon = toggleHeaderBtn.querySelector('i');
    if (editorPanel.classList.contains('header-collapsed')) {
        icon.classList.remove('fa-expand-alt');
        icon.classList.add('fa-compress-alt');
    } else {
        icon.classList.remove('fa-compress-alt');
        icon.classList.add('fa-expand-alt');
    }
}

async function testGeminiAPI() {
    try {
        const testPrompt = 'Say "Hello World" in JSON format: {"message": "Hello World"}';
        const result = await callGeminiAPI(testPrompt, { maxOutputTokens: 2048 });
        if (result && result.candidates) {
            return result;
        }
        return null;
    } catch (error) {
        console.error('Gemini API test failed:', error);
        alert(`Warning: Gemini API test failed. ${error.message}`);
        return null;
    }
}

async function loadData() {
    try {
        const response = await fetch('https://api.github.com/gists', {
            headers: {
                'Authorization': `token ${state.githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('GitHub token needs "gist" permission. Go to GitHub Settings > Developer settings > Personal access tokens > Select your token > Edit > Check "gist" scope');
            }
            throw new Error(`GitHub API error: ${response.statusText}`);
        }
        const gistsList = await response.json();
        const existingGist = gistsList.find(g =>
            g.files && g.files[APP_CONFIG.gistFilename]
        );
        if (existingGist) {
            state.gistId = existingGist.id;
            const gistData = await fetch(`https://api.github.com/gists/${state.gistId}`, {
                headers: {
                    'Authorization': `token ${state.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            const data = await gistData.json();
            const content = JSON.parse(data.files[APP_CONFIG.gistFilename].content);
            state.notes = content.notes || [];
            state.folders = content.folders || state.folders;
        } else {
            await saveData();
        }
        renderFolders();
        renderNotes();
    } catch (error) {
        console.error('Error loading data:', error);
        alert(error.message);
    }
}

async function saveData() {
    showLoading(true, 'Saving...');
    try {
        const data = {
            notes: state.notes,
            folders: state.folders,
            lastUpdated: new Date().toISOString()
        };
        const gistData = {
            files: {
                [APP_CONFIG.gistFilename]: {
                    content: JSON.stringify(data, null, 2)
                }
            },
            public: false
        };
        if (state.gistId) {
            const response = await fetch(`https://api.github.com/gists/${state.gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${state.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gistData)
            });
            if (!response.ok) {
                const error = await response.json();
                if (response.status === 403) {
                    throw new Error('GitHub token needs "gist" permission. Go to GitHub Settings > Developer settings > Personal access tokens > Select your token > Edit > Check "gist" scope');
                }
                throw new Error(`GitHub API error: ${error.message || response.statusText}`);
            }
        } else {
            gistData.description = 'Chrisidian Notes Data';
            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${state.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gistData)
            });
            if (!response.ok) {
                const error = await response.json();
                if (response.status === 403) {
                    throw new Error('GitHub token needs "gist" permission. Go to GitHub Settings > Developer settings > Personal access tokens > Select your token > Edit > Check "gist" scope');
                }
                throw new Error(`GitHub API error: ${error.message || response.statusText}`);
            }
            const result = await response.json();
            state.gistId = result.id;
        }
    } catch (error) {
        console.error('Error saving data:', error);
        alert(error.message);
    } finally {
        showLoading(false);
    }
}

async function callGeminiAPI(prompt, generationConfig) {
    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash'];
    let lastError = null;

    for (const model of modelsToTry) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${state.geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: generationConfig
                })
            });

            if (response.ok) {
                return await response.json();
            }

            const errorData = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}: ${response.statusText}` } }));
            const errorMessage = errorData.error?.message || 'Unknown API error.';
            console.error(`❌ Model ${model} failed: ${errorMessage}`);
            lastError = `[${model}]: ${errorMessage}`;

        } catch (networkError) {
            console.error(`❌ Network error while trying model ${model}:`, networkError);
            lastError = `[${model}]: Network error - ${networkError.message}`;
        }
    }

    throw new Error(`All API models failed. Last error: ${lastError}`);
}

async function callEmbeddingAPI(text) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${APP_CONFIG.embeddingModel}:embedContent?key=${state.geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: `models/${APP_CONFIG.embeddingModel}`, content: { parts: [{ text }] } })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Embedding API error: ${errorData.error.message}`);
        }
        const data = await response.json();
        return data.embedding.values;
    } catch (error) {
        console.error("Embedding generation failed:", error);
        return null;
    }
}

function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
        return 0;
    }
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }
    return dotProduct / (magnitudeA * magnitudeB);
}

async function findSemanticallyRelevantNotes(command, maxNotes = 5) {
    console.log("Finding relevant notes using semantic search...");
    const commandEmbedding = await callEmbeddingAPI(command);
    if (!commandEmbedding) {
        console.warn("Could not generate embedding for command. No relevant notes found.");
        return [];
    }

    const scoredNotes = state.notes
        .filter(note => note.embedding && note.embedding.length > 0)
        .map(note => ({
            note,
            score: cosineSimilarity(commandEmbedding, note.embedding)
        }));

    const sortedNotes = scoredNotes.sort((a, b) => b.score - a.score);

    console.log("Top scoring notes:", sortedNotes.slice(0, maxNotes).map(n => ({title: n.note.title, score: n.score})));
    return sortedNotes.slice(0, maxNotes).map(item => item.note);
}


async function processCommand() {
    const command = commandInput.value.trim();
    if (!command) return;

    showLoading(true, 'Thinking...');
    let rawResponseForDebugging = '';

    try {
        const relevantNotes = await findSemanticallyRelevantNotes(command);
        console.log(`Sending ${relevantNotes.length} most relevant notes to AI for context.`);

        const masterPrompt = `You are the intelligent engine for a note-taking app. Your task is to analyze a user's command and their most relevant notes to determine the single correct action to take.

You MUST respond with a single JSON object describing a "tool" to use and its "args".
The available tools are: "CREATE_NOTE", "UPDATE_NOTE", "DELETE_NOTE", "ANSWER_QUESTION".

Here is all the data you need:

1. User's Command:
"${command}"

2. Existing Folders:
${JSON.stringify(state.folders)}

3. Relevant Existing Notes (Title and Content):
${JSON.stringify(relevantNotes.map(n => ({ title: n.title, content: n.content })))}

---
TOOL-USE INSTRUCTIONS:

1. tool: "ANSWER_QUESTION"
   - Use this if the command is a question that can be answered using the provided notes as context, or from general knowledge if no note is relevant. If no notes seem relevant, say you couldn't find an answer in the notes.
   - Example: "how much natron is in the chocolate cake?" -> Checks the "Chocolate Cake" note first.
   - args: { "answer": "The full, markdown-formatted answer." }

2. tool: "CREATE_NOTE"
   - Use this to create a new note.
   - If the command implies using an existing note (e.g., "make a grocery list for the pancakes"), USE THE CONTEXT FROM THAT NOTE to generate the new content.
   - If the user specifies a new folder that doesn't exist, you MUST set "newFolder" to true.
   - args: { "title": "New Note Title", "content": "Markdown content...", "folder": "Folder Name", "newFolder": true/false }

3. tool: "UPDATE_NOTE"
   - Use this to modify an existing note. Identify the note to update from the 'Relevant Existing Notes'.
   - args: { "targetTitle": "Full Title of Note to Update", "newTitle": "Updated Title", "newContent": "Full new content..." }

4. tool: "DELETE_NOTE"
   - Use this to delete an existing note. Identify the note to delete from the 'Relevant Existing Notes'.
   - args: { "targetTitle": "Full Title of Note to Delete" }

---
Now, analyze all the provided data and return the single JSON object for the correct tool call. Do not include any other text or explanation.`;

        const mainResult = await callGeminiAPI(masterPrompt, { temperature: 0.1, maxOutputTokens: 8192 });

        if (!mainResult.candidates || !mainResult.candidates.length === 0) {
            console.error("FATAL: AI response contained no candidates.", mainResult);
            throw new Error("AI response was empty or invalid. Check console.");
        }
        const candidate = mainResult.candidates[0];
        if (!candidate.content || !candidate.content.parts) {
            console.error("FATAL: AI candidate is missing content.", candidate);
            const reason = candidate.finishReason || "UNKNOWN";
            throw new Error(`AI did not return valid content. Reason: ${reason}. Check console.`);
        }

        const responseText = candidate.content.parts[0].text;
        rawResponseForDebugging = responseText;

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("FATAL: Could not find a JSON object in the AI's response. Raw response was:", `\n---START---\n${rawResponseForDebugging}\n---END---`);
            throw new Error("AI did not respond with a valid JSON object. Check console for its raw response.");
        }

        const { tool, args } = JSON.parse(jsonMatch[0]);
        console.log(`AI chose tool: ${tool}`, args);
        let shouldSave = false;

        switch (tool) {
            case 'ANSWER_QUESTION':
                if (!args || !args.answer) throw new Error("AI chose ANSWER_QUESTION but provided no answer.");
                aiResponseOutput.innerHTML = DOMPurify.sanitize(marked.parse(args.answer));
                aiResponseModal.style.display = 'flex';
                break;

            case 'CREATE_NOTE':
                if (!args || !args.title || !args.content || !args.folder) throw new Error("AI chose CREATE_NOTE with incomplete arguments.");
                if (args.newFolder && !state.folders.includes(args.folder)) {
                    state.folders.push(args.folder);
                    renderFolders();
                }
                const newNote = {
                    id: Date.now(),
                    title: args.title,
                    content: args.content,
                    folder: args.folder,
                    created: new Date().toISOString(),
                    modified: new Date().toISOString(),
                    embedding: await callEmbeddingAPI(`${args.title}\n${args.content}`)
                };
                state.notes.push(newNote);
                openNote(newNote);
                shouldSave = true;
                break;

            case 'UPDATE_NOTE':
                if (!args || !args.targetTitle || !args.newContent) throw new Error("AI chose UPDATE_NOTE with incomplete arguments.");
                const noteIndex = state.notes.findIndex(n => n.title === args.targetTitle);
                if (noteIndex === -1) throw new Error(`AI tried to update a note titled "${args.targetTitle}" which does not exist.`);
                
                state.notes[noteIndex].title = args.newTitle || args.targetTitle;
                state.notes[noteIndex].content = args.newContent;
                state.notes[noteIndex].modified = new Date().toISOString();
                state.notes[noteIndex].embedding = await callEmbeddingAPI(`${state.notes[noteIndex].title}\n${state.notes[noteIndex].content}`);
                
                openNote(state.notes[noteIndex]);
                shouldSave = true;
                break;

            case 'DELETE_NOTE':
                if (!args || !args.targetTitle) throw new Error("AI chose DELETE_NOTE with incomplete arguments.");
                const noteToDelete = state.notes.find(n => n.title === args.targetTitle);
                if (!noteToDelete) throw new Error(`AI tried to delete a note titled "${args.targetTitle}" which does not exist.`);
                
                if (confirm(`Are you sure you want to delete the note: "${noteToDelete.title}"?`)) {
                    state.notes = state.notes.filter(n => n.id !== noteToDelete.id);
                    if (state.currentNote && state.currentNote.id === noteToDelete.id) closeEditor();
                    shouldSave = true;
                }
                break;

            default:
                console.error("AI returned an unknown tool:", tool);
                alert("The AI returned an unknown command. Please try rephrasing.");
                break;
        }

        if (shouldSave) {
            await saveData();
            renderNotes();
        }
        commandInput.value = '';

    } catch (error) {
        console.error('Full error object:', error);
        if (rawResponseForDebugging) {
            console.error("The AI's last raw response before the error was:", `\n---START---\n${rawResponseForDebugging}\n---END---`);
        }
        alert(`An error occurred: ${error.message}\n\nPlease check the browser console (F12) for detailed logs.`);
    } finally {
        showLoading(false);
    }
}

function renderFolders() {
    folderList.innerHTML = `
        <div class="folder-item ${state.currentFolder === 'All Notes' ? 'active' : ''}" onclick="selectFolder('All Notes')">
            <span class="folder-name">
                <i class="fas fa-folder"></i> All Notes
            </span>
        </div>
    `;
    state.folders.sort((a, b) => a.localeCompare(b));
    state.folders.forEach(folder => {
        const folderEl = document.createElement('div');
        folderEl.className = `folder-item ${state.currentFolder === folder ? 'active' : ''}`;
        folderEl.onclick = () => selectFolder(folder);
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'folder-name';
        nameSpan.innerHTML = `<i class="fas fa-folder"></i> ${folder}`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-folder-btn';
        deleteBtn.title = `Delete folder "${folder}"`;
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteFolder(folder);
        };

        folderEl.appendChild(nameSpan);
        folderEl.appendChild(deleteBtn);
        folderList.appendChild(folderEl);
    });

    mobileFolderSelector.innerHTML = `<option value="All Notes">All Notes</option>`;
    state.folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder;
        option.textContent = folder;
        mobileFolderSelector.appendChild(option);
    });
    mobileFolderSelector.value = state.currentFolder;
}

function renderNotes() {
    let notesToDisplay = state.currentFolder === 'All Notes'
        ? state.notes
        : state.notes.filter(n => n.folder === state.currentFolder);

    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm) {
        notesToDisplay = notesToDisplay.filter(note =>
            note.title.toLowerCase().includes(searchTerm) ||
            note.content.toLowerCase().includes(searchTerm)
        );
    }

    notesToDisplay.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    notesList.innerHTML = '';
    if (notesToDisplay.length === 0) {
        notesList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No notes found</p>';
        return;
    }

    notesToDisplay.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        noteCard.onclick = () => openNote(note);
        const preview = note.content.substring(0, 150).replace(/[#*`]/g, '');
        noteCard.innerHTML = `
            <h3>${note.title}</h3>
            <p>${preview}${note.content.length > 150 ? '...' : ''}</p>
            <div class="note-meta">
                <span><i class="fas fa-folder"></i> ${note.folder}</span>
                <span>${formatDate(note.modified)}</span>
            </div>
        `;
        notesList.appendChild(noteCard);
    });
}

function selectFolder(folder) {
    state.currentFolder = folder;
    currentFolderName.textContent = folder;
    searchInput.value = '';
    renderFolders();
    renderNotes();
}

async function createNewFolder() {
    const folderName = prompt('Enter folder name:');
    if (folderName && !state.folders.includes(folderName)) {
        state.folders.push(folderName);
        await saveData();
        renderFolders();
    }
}

async function deleteFolder(folderName) {
    if (confirm(`Are you sure you want to delete the folder "${folderName}"? This cannot be undone.`)) {
        const isFolderEmpty = !state.notes.some(note => note.folder === folderName);
        if (!isFolderEmpty) {
            alert(`Error: Cannot delete folder "${folderName}" because it is not empty.`);
            return;
        }

        state.folders = state.folders.filter(f => f !== folderName);
        
        if (state.currentFolder === folderName) {
            selectFolder('All Notes');
        } else {
            renderFolders();
        }

        await saveData();
    }
}

async function createNewNote() {
    const newContent = '# New Note\n\nStart writing...';
    const newEmbedding = await callEmbeddingAPI(newContent);

    const newNote = {
        id: Date.now(),
        title: 'New Note',
        content: newContent,
        folder: state.currentFolder === 'All Notes' ? state.folders[0] || 'Prompts' : state.currentFolder,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        embedding: newEmbedding
    };
    state.notes.push(newNote);
    try {
        await saveData();
        renderNotes();
        openNote(newNote);
    } catch (error) {
        state.notes = state.notes.filter(n => n.id !== newNote.id);
        console.error('Failed to create note:', error);
        alert(`Failed to create note: ${error.message}`);
    }
}

function openNote(note) {
    state.currentNote = note;
    noteTitle.value = note.title;
    noteEditor.value = note.content;
    state.originalNoteContent = note.content;
    editorPanel.style.display = 'flex';
    setEditorMode('preview');
    setDirtyState(false); 
    if (window.innerWidth <= 768) {
        toggleHeaderBtn.style.display = 'flex';
    }
}

function closeEditor() {
    editorPanel.style.display = 'none';
    state.currentNote = null;
    state.originalNoteContent = '';
    toggleHeaderBtn.style.display = 'none';
    editorPanel.classList.remove('header-collapsed');
    setDirtyState(false);
}

function setEditorMode(mode) {
    if (mode === 'edit') {
        noteEditor.style.display = 'block';
        notePreview.style.display = 'none';
        editModeBtn.classList.add('active');
        previewModeBtn.classList.remove('active');
    } else {
        noteEditor.style.display = 'none';
        notePreview.style.display = 'block';
        editModeBtn.classList.remove('active');
        previewModeBtn.classList.add('active');
        const html = marked.parse(noteEditor.value);
        notePreview.innerHTML = DOMPurify.sanitize(html);
    }
}

function setDirtyState(isDirty) {
    state.isNoteDirty = isDirty;
    saveNoteBtn.classList.toggle('is-dirty', isDirty);
}

async function saveCurrentNote() {
    if (!state.currentNote) return;

    const noteIndex = state.notes.findIndex(n => n.id === state.currentNote.id);
    if (noteIndex === -1) return;

    const newTitle = noteTitle.value;
    const newContent = noteEditor.value;
    const titleHasChanged = newTitle !== state.notes[noteIndex].title;
    const contentHasChanged = newContent !== state.originalNoteContent;

    state.notes[noteIndex].title = newTitle;
    state.notes[noteIndex].content = newContent;
    state.notes[noteIndex].modified = new Date().toISOString();

    if (contentHasChanged || titleHasChanged || !state.notes[noteIndex].embedding) {
        console.log("Content or title changed, or embedding missing. Regenerating embedding...");
        const newEmbedding = await callEmbeddingAPI(`${newTitle}\n${newContent}`);
        state.notes[noteIndex].embedding = newEmbedding;
    }
    
    // *** BUG FIX: Always update originalNoteContent after any successful save ***
    state.originalNoteContent = newContent; 
    state.currentNote = state.notes[noteIndex];
    
    await saveData();
    renderNotes();
    setDirtyState(false); 
    
    saveNoteBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
    setTimeout(() => {
        saveNoteBtn.innerHTML = SAVE_BUTTON_DEFAULT_HTML;
    }, 2000);
}

async function deleteCurrentNote() {
    if (!state.currentNote) return;
    if (confirm('Are you sure you want to delete this note?')) {
        state.notes = state.notes.filter(n => n.id !== state.currentNote.id);
        await saveData();
        renderNotes();
        closeEditor();
    }
}

function showLoading(show, message = 'Processing with AI...') {
    loadingOverlay.style.display = show ? 'flex' : 'none';
    if (show && message) {
        const loadingText = loadingOverlay.querySelector('p');
        if (loadingText) loadingText.textContent = message;
    }
}

function formatDate(dateString) {
    const noteDate = new Date(dateString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOf7DaysAgo = new Date(startOfToday);
    startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 6);
    if (noteDate >= startOfToday) {
        return 'Today';
    } else if (noteDate >= startOfYesterday) {
        return 'Yesterday';
    } else if (noteDate >= startOf7DaysAgo) {
        const diffTime = startOfToday.getTime() - noteDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return `${diffDays} days ago`;
    } else {
        return noteDate.toLocaleDateString();
    }
}

function applyTheme(themeClassName) {
    document.documentElement.className = '';
    document.documentElement.classList.add(themeClassName);
    localStorage.setItem('chrisidian_theme', themeClassName);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('chrisidian_theme') || 'theme-dusk';
    applyTheme(savedTheme);
}

function renderThemeSwitchers() {
    themeModalGrid.innerHTML = '';
    THEMES.forEach(theme => {
        const gradientCss = `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]})`;
        const card = document.createElement('div');
        card.className = 'theme-card';
        card.title = theme.name;
        card.onclick = () => {
            applyTheme(theme.className);
            themeModal.style.display = 'none';
        };
        card.innerHTML = `<div class="theme-card-swatch" style="background-image: ${gradientCss};"></div>`;
        themeModalGrid.appendChild(card);
    });
}

function applyTypography(prefs) {
    document.documentElement.style.setProperty('--user-font-family', prefs.fontFamily);
    document.documentElement.style.setProperty('--user-font-size', prefs.fontSize);
    document.documentElement.style.setProperty('--user-line-height', prefs.lineHeight);
}

function saveTypography() {
    localStorage.setItem('chrisidian_typography', JSON.stringify(userPreferences));
}

function loadTypography() {
    const savedPrefs = localStorage.getItem('chrisidian_typography');
    if (savedPrefs) {
        userPreferences = JSON.parse(savedPrefs);
    }
    applyTypography(userPreferences);
    updateTypographyControls();
}

function renderFontSelector() {
    fontFamilySelector.innerHTML = '';
    const sortedFonts = [...FONTS].sort((a, b) => a.name.localeCompare(b.name));
    
    sortedFonts.forEach(font => {
        const option = document.createElement('option');
        option.value = font.family;
        option.textContent = font.name;
        option.style.fontFamily = font.family;
        fontFamilySelector.appendChild(option);
    });
}

function updateTypographyControls() {
    fontFamilySelector.value = userPreferences.fontFamily;
    
    const size = parseInt(userPreferences.fontSize, 10);
    fontSizeSlider.value = size;
    fontSizeValue.textContent = `${size}px`;

    const height = parseFloat(userPreferences.lineHeight);
    lineHeightSlider.value = height;
    lineHeightValue.textContent = height.toFixed(1);
}

function handleFontChange(e) {
    userPreferences.fontFamily = e.target.value;
    applyTypography(userPreferences);
    saveTypography();
}

function handleFontSizeChange(e) {
    const size = e.target.value;
    userPreferences.fontSize = `${size}px`;
    fontSizeValue.textContent = `${size}px`;
    applyTypography(userPreferences);
    saveTypography();
}

function handleLineHeightChange(e) {
    const height = e.target.value;
    userPreferences.lineHeight = height;
    lineHeightValue.textContent = parseFloat(height).toFixed(1);
    applyTypography(userPreferences);
    saveTypography();
}