const APP_CONFIG = {
    passwordHash: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    gistFilename: 'chrisidian-notes.json'
};

let state = {
    isAuthenticated: false,
    geminiKey: '',
    githubToken: '',
    notes: [],
    folders: ['Ideas', 'Recipes', 'Work', 'Personal', 'Archive'],
    currentFolder: 'All Notes',
    currentNote: null,
    gistId: null
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

document.addEventListener('DOMContentLoaded', () => {
    if (APP_CONFIG.passwordHash === '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069') {
        console.warn('⚠️ SECURITY WARNING: Using default password hash! Change it before deploying!');
        const warning = document.getElementById('securityWarning');
        if (warning) warning.style.display = 'block';
    }

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
    testGeminiAPI().then(result => {
        if (result && result.candidates) {
            console.log('✅ Gemini API is working');
        } else {
            console.error('❌ Gemini API test failed');
            alert('Warning: Gemini API might not be working correctly. Check your API key and console for details.');
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
}

async function testGeminiAPI() {
    try {
        let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Say "Hello World" in JSON format: {"message": "Hello World"}' }] }]
            })
        });
        if (!response.ok && response.status === 404) {
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'Say "Hello World" in JSON format: {"message": "Hello World"}' }] }]
                })
            });
        }
        const result = await response.json();
        console.log('Gemini API test response:', result);
        return result;
    } catch (error) {
        console.error('Gemini API test failed:', error);
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

async function processCommand() {
    const command = commandInput.value.trim();
    if (!command) return;

    showLoading(true);

    try {
        const intentPrompt = `Analyze the user's command and identify the primary intent and the title of the target note if applicable.

User Command: "${command}"
Note Titles: ${JSON.stringify(state.notes.map(n => n.title))}

Respond in JSON with "intent" ("CREATE", "UPDATE", "DELETE", or "UNKNOWN") and "targetTitle".
Example for "delete my cookie recipe": {"intent": "DELETE", "targetTitle": "Chocolate Chip Cookie Recipe"}
Example for "new idea for a cat-based dating app": {"intent": "CREATE", "targetTitle": null}
Example for "add milk to my grocery list": {"intent": "UPDATE", "targetTitle": "Grocery List"}
`;

        const intentResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: intentPrompt }] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
            })
        });

        if (!intentResponse.ok) throw new Error("Could not determine intent from the command.");

        const intentResult = await intentResponse.json();
        const intentText = intentResult.candidates[0].content.parts[0].text;
        const { intent, targetTitle } = JSON.parse(intentText.match(/\{[\s\S]*\}/)[0]);

        console.log(`Intent Detected: ${intent}`, `Target: ${targetTitle || 'N/A'}`);

        switch (intent) {
            case 'UPDATE': {
                const noteToUpdate = state.notes.find(n => n.title === targetTitle);
                if (!noteToUpdate) {
                    throw new Error(`Could not find a note titled "${targetTitle}" to update.`);
                }

                showLoading(true, 'Updating note...');
                const updatePrompt = `You are an AI note editor. Update the following note based on the user's command.
- Modify the text directly.
- Respond with ONLY a single JSON object containing the full, updated content. Do not add explanations.

User Command: "${command}"

Original Note Content to Update:
---
${noteToUpdate.content}
---

Response Format:
{
  "title": "Potentially updated title",
  "content": "The full, updated note content in markdown."
}`;

                const mainResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.geminiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: updatePrompt }] }],
                        generationConfig: { temperature: 0.5, maxOutputTokens: 8192 }
                    })
                });

                if (!mainResponse.ok) throw new Error("Failed to get update from AI.");
                const mainResult = await mainResponse.json();
                const candidate = mainResult.candidates[0];

                // --- THE CORRECT FIX IS HERE: Check finishReason BEFORE parsing ---
                if (candidate.finishReason !== "STOP") {
                    throw new Error(`AI processing stopped unexpectedly. Reason: ${candidate.finishReason}. The response may be too large for the model's limit.`);
                }

                const mainText = candidate.content.parts[0].text;
                const payload = JSON.parse(mainText.match(/\{[\s\S]*\}/)[0]);

                const noteIndex = state.notes.findIndex(n => n.id === noteToUpdate.id);
                state.notes[noteIndex].title = payload.title || noteToUpdate.title;
                state.notes[noteIndex].content = payload.content;
                state.notes[noteIndex].modified = new Date().toISOString();
                openNote(state.notes[noteIndex]);
                break;
            }

            case 'DELETE': {
                const noteToDelete = state.notes.find(n => n.title === targetTitle);
                if (!noteToDelete) {
                    throw new Error(`Could not find a note titled "${targetTitle}" to delete.`);
                }
                if (confirm(`Are you sure you want to delete the note: "${noteToDelete.title}"?`)) {
                    state.notes = state.notes.filter(n => n.id !== noteToDelete.id);
                    if (state.currentNote && state.currentNote.id === noteToDelete.id) {
                        closeEditor();
                    }
                }
                break;
            }

            case 'CREATE': {
                showLoading(true, 'Creating note...');
                const createPrompt = `You are a sophisticated AI assistant for a note-taking app. Your task is to process a user command to create a new note.

1.  **Generate Content**: Based on the user command, generate the full note content in well-formatted markdown.
2.  **Suggest Title**: Create a concise, relevant title for the note.
3.  **Categorize**: Assign the note to the most appropriate folder from the provided list. You can suggest a new folder if none fit. Folder names MUST be in English.
4.  **Language**: The 'title' and 'content' MUST be in the primary language of the user's command.

User Command: "${command}"
Existing Folders: ${JSON.stringify(state.folders)}

Response Format: You MUST respond with ONLY a single, valid JSON object.
{
    "title": "A concise title in the same language as the command",
    "content": "The full note content in well-formatted markdown...",
    "folder": "The single best matching folder name (in English)",
    "isNewFolder": false
}`;

                const mainResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.geminiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: createPrompt }] }],
                        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
                    })
                });

                if (!mainResponse.ok) throw new Error("Failed to get new note from AI.");
                const mainResult = await mainResponse.json();
                const candidate = mainResult.candidates[0];

                // --- THE CORRECT FIX IS HERE: Check finishReason BEFORE parsing ---
                if (candidate.finishReason !== "STOP") {
                    throw new Error(`AI processing stopped unexpectedly. Reason: ${candidate.finishReason}. The response may be too large for the model's limit.`);
                }

                const mainText = candidate.content.parts[0].text;
                const payload = JSON.parse(mainText.match(/\{[\s\S]*\}/)[0]);

                if (payload.isNewFolder && !state.folders.includes(payload.folder)) {
                    state.folders.push(payload.folder);
                    renderFolders();
                }
                const newNote = {
                    id: Date.now(),
                    title: payload.title,
                    content: payload.content,
                    folder: payload.folder,
                    created: new Date().toISOString(),
                    modified: new Date().toISOString()
                };
                state.notes.push(newNote);
                openNote(newNote);
                break;
            }

            default:
                alert("I'm not sure what you mean. Please try rephrasing your command, for example: 'create a new note about...', 'update my note titled...', or 'delete the note about...'.");
                break;
        }

        await saveData();
        renderNotes();
        commandInput.value = '';

    } catch (error) {
        console.error('Error processing command:', error);
        alert(`Error: ${error.message}\n\nCheck the console (F12) for more details.`);
    } finally {
        showLoading(false);
    }
}

function renderFolders() {
    folderList.innerHTML = `
        <div class="folder-item ${state.currentFolder === 'All Notes' ? 'active' : ''}" 
             onclick="selectFolder('All Notes')">
            <i class="fas fa-folder"></i> All Notes
        </div>
    `;
    state.folders.forEach(folder => {
        const folderEl = document.createElement('div');
        folderEl.className = `folder-item ${state.currentFolder === folder ? 'active' : ''}`;
        folderEl.innerHTML = `<i class="fas fa-folder"></i> ${folder}`;
        folderEl.onclick = () => selectFolder(folder);
        folderList.appendChild(folderEl);
    });
}

function renderNotes() {
    const filteredNotes = state.currentFolder === 'All Notes'
        ? state.notes
        : state.notes.filter(n => n.folder === state.currentFolder);
    notesList.innerHTML = '';
    if (filteredNotes.length === 0) {
        notesList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No notes yet</p>';
        return;
    }
    filteredNotes.forEach(note => {
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

async function createNewNote() {
    const newNote = {
        id: Date.now(),
        title: 'New Note',
        content: '# New Note\n\nStart writing...',
        folder: state.currentFolder === 'All Notes' ? state.folders[0] : state.currentFolder,
        created: new Date().toISOString(),
        modified: new Date().toISOString()
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
    editorPanel.style.display = 'flex';
    setEditorMode('edit');
}

function closeEditor() {
    editorPanel.style.display = 'none';
    state.currentNote = null;
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

async function saveCurrentNote() {
    if (!state.currentNote) return;
    const noteIndex = state.notes.findIndex(n => n.id === state.currentNote.id);
    if (noteIndex !== -1) {
        state.notes[noteIndex].title = noteTitle.value;
        state.notes[noteIndex].content = noteEditor.value;
        state.notes[noteIndex].modified = new Date().toISOString();
        state.currentNote = state.notes[noteIndex];
    }
    await saveData();
    renderNotes();
    const saveBtn = document.getElementById('saveNoteBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
    setTimeout(() => {
        saveBtn.innerHTML = originalText;
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