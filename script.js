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

// --- START: MODIFIED SECTION ---
// The entire processCommand function has been replaced to handle CREATE, UPDATE, and DELETE.
async function processCommand() {
    const command = commandInput.value.trim();
    if (!command) return;

    showLoading(true);

    try {
        // CHANGE 1: The AI now receives a list of existing notes (id and title)
        // so it can identify which one to update or delete.
        const context = {
            folders: state.folders,
            existingNotes: state.notes.map(n => ({
                id: n.id,
                title: n.title
            }))
        };

        if (!state.geminiKey || state.geminiKey.trim() === '') {
            throw new Error('Gemini API key is missing');
        }

        // CHANGE 2: The prompt is completely rewritten. It now instructs the AI
        // to determine the user's intent (action) and respond with a specific
        // JSON structure for CREATE, UPDATE, or DELETE.
        const prompt = `You are a sophisticated AI assistant for a note-taking app. Your task is to process user commands and determine the user's intent.

1.  **Analyze the Command**: Understand if the user wants to CREATE a new note, UPDATE an existing one, or DELETE an existing one.
2.  **Identify the Target Note**: If the command is to UPDATE or DELETE, you MUST identify the correct note from the 'existingNotes' list and use its 'id'. If you cannot determine the note, respond with an error.
3.  **Generate/Update Content**:
    *   For CREATE: Generate a title and content as you did before. Assign it to a suitable folder.
    *   For UPDATE: The user might provide specific content to add, change, or remove. You must intelligently merge these changes into the *existing* content of the note. You can also update the title if requested.
4.  **Language/Folder Rules**:
    *   Generated 'title' and 'content' MUST be in the primary language of the user's command.
    *   Folder names MUST be in English. You can suggest a new folder for new notes.
5.  **Response Format**: You MUST respond with ONLY a single, valid JSON object. The JSON object's structure depends on the determined action.

**CONTEXT:**
- **User Command**: "${command}"
- **Existing Folders**: ${JSON.stringify(context.folders)}
- **Existing Notes**: ${JSON.stringify(context.existingNotes)}

---
**JSON RESPONSE STRUCTURE:**

**If creating a new note:**
{
  "action": "CREATE",
  "payload": {
    "title": "A concise title",
    "content": "The full note content in markdown.",
    "folder": "The best matching folder name",
    "isNewFolder": false
  }
}

**If updating an existing note:**
{
  "action": "UPDATE",
  "payload": {
    "id": 123456789,
    "title": "Updated title (optional)",
    "content": "The *entire* new content of the note with the user's changes applied."
  }
}

**If deleting an existing note:**
{
  "action": "DELETE",
  "payload": {
    "id": 123456789
  }
}
---

Now, process the user command and provide the JSON response.`;

        let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.5,
                    topK: 1,
                    topP: 1,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok && response.status === 404) {
            console.log('Gemini 2.5 not available, trying 1.5...');
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.5,
                        topK: 1,
                        topP: 1,
                        maxOutputTokens: 2048,
                    }
                })
            });
        }
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('Gemini API error response:', errorData);

            if (response.status === 400 && errorData?.error?.message?.includes('API key not valid')) {
                throw new Error('Invalid Gemini API key. Please check your API key.');
            } else if (response.status === 400 && errorData?.error?.message?.includes('model')) {
                throw new Error('Gemini model error. The model name might have changed.');
            } else if (response.status === 404) {
                throw new Error('Gemini model not found.');
            }
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Gemini API response:', result);

        const candidate = result?.candidates?.[0];

        if (!candidate || (candidate.finishReason && candidate.finishReason !== "STOP")) {
            const reason = candidate?.finishReason || 'UNKNOWN';
            console.error(`Gemini API call finished with reason: ${reason}`, candidate);
            let errorMessage = `API call failed with reason: ${reason}.`;
            if (reason === 'SAFETY') errorMessage += ' The prompt or response was blocked due to safety concerns.';
            throw new Error(errorMessage);
        }
        
        if (!candidate.content?.parts?.[0]?.text) {
            console.error('Unexpected Gemini API response structure: Content or text part is missing.', result);
            throw new Error('Unexpected response from Gemini API. Check console for details.');
        }

        let aiResponseText = candidate.content.parts[0].text;
        console.log('AI response text:', aiResponseText);

        const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            aiResponseText = jsonMatch[0];
        }

        const aiResponse = JSON.parse(aiResponseText);
        console.log('Parsed AI response:', aiResponse);
        const { action, payload } = aiResponse;

        // CHANGE 3: A switch statement now handles the response from the AI.
        // It performs a different action on the 'state' based on the "action"
        // property in the JSON response.
        switch (action) {
            case 'CREATE':
                if (payload.isNewFolder && !state.folders.includes(payload.folder)) {
                    state.folders.push(payload.folder);
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
                await saveData();
                renderFolders();
                renderNotes();
                openNote(newNote);
                break;

            case 'UPDATE':
                const noteIndex = state.notes.findIndex(n => n.id === payload.id);
                if (noteIndex !== -1) {
                    if (payload.title) state.notes[noteIndex].title = payload.title;
                    if (payload.content) state.notes[noteIndex].content = payload.content;
                    state.notes[noteIndex].modified = new Date().toISOString();
                    
                    await saveData();
                    renderNotes();

                    if (state.currentNote && state.currentNote.id === payload.id) {
                        openNote(state.notes[noteIndex]);
                    } else {
                        openNote(state.notes[noteIndex]);
                    }
                } else {
                    throw new Error(`AI tried to update a note with ID ${payload.id}, but it was not found.`);
                }
                break;

            case 'DELETE':
                const noteToDelete = state.notes.find(n => n.id === payload.id);
                if (noteToDelete) {
                    if (confirm(`Are you sure you want to delete the note: "${noteToDelete.title}"?`)) {
                        state.notes = state.notes.filter(n => n.id !== payload.id);
                        await saveData();
                        renderNotes();
                        if (state.currentNote && state.currentNote.id === payload.id) {
                            closeEditor();
                        }
                    }
                } else {
                    throw new Error(`AI tried to delete a note with ID ${payload.id}, but it was not found.`);
                }
                break;

            default:
                throw new Error(`AI returned an unknown action: "${action}"`);
        }

        commandInput.value = '';

    } catch (error) {
        console.error('Error processing command:', error);
        console.error('Full error details:', error.stack);
        alert(`Error: ${error.message}\n\nCheck the console (F12) for more details.`);
    } finally {
        showLoading(false);
    }
}
// --- END: MODIFIED SECTION ---

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