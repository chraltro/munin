// Chrisidian - AI-Powered Notes App
// SECURITY: Update the passwordHash below BEFORE deploying!
// Generate your hash at: https://www.sha256online.com/

// Configuration and State
const APP_CONFIG = {
    // Password hash - default is 'Hello World!' FOR DEMO ONLY!
    // Generate your own at: https://www.sha256online.com/
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

// DOM Elements
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

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Security warning for default hash
    if (APP_CONFIG.passwordHash === '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069') {
        console.warn('⚠️ SECURITY WARNING: Using default password hash! Change it before deploying!');
        const warning = document.getElementById('securityWarning');
        if (warning) warning.style.display = 'block';
    }
    
    checkAutoLogin();
    setupEventListeners();
});

// Authentication
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
    
    // Hash the entered password and compare
    const enteredPasswordHash = await hashPassword(passwordInput.value);
    
    if (enteredPasswordHash !== APP_CONFIG.passwordHash) {
        alert('Invalid password!');
        return;
    }
    
    state.geminiKey = geminiKeyInput.value;
    state.githubToken = githubTokenInput.value;
    state.isAuthenticated = true;
    
    // Save auth for auto-login
    localStorage.setItem('chrisidian_auth', JSON.stringify({
        geminiKey: state.geminiKey,
        githubToken: state.githubToken
    }));
    
    showMainApp();
    await loadData();
});

// Hash function
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
    
    // Test Gemini API on login
    testGeminiAPI().then(result => {
        if (result && result.candidates) {
            console.log('✅ Gemini API is working');
        } else {
            console.error('❌ Gemini API test failed');
            alert('Warning: Gemini API might not be working correctly. Check your API key and console for details.');
        }
    });
}

// Event Listeners
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

// Test Gemini API
async function testGeminiAPI() {
    try {
        // Try 2.5 first
        let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.geminiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: 'Say "Hello World" in JSON format: {"message": "Hello World"}'
                    }]
                }]
            })
        });
        
        if (!response.ok && response.status === 404) {
            // Try 1.5 as fallback
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.geminiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: 'Say "Hello World" in JSON format: {"message": "Hello World"}'
                        }]
                    }]
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

// GitHub Gist Storage
async function loadData() {
    try {
        // First, try to find existing gist
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
            // Create new gist
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
            // Update existing gist
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
            // Create new gist
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

// AI Processing with Gemini
async function processCommand() {
    const command = commandInput.value.trim();
    if (!command) return;
    
    showLoading(true);
    
    try {
        // Prepare context about existing structure
        const context = {
            folders: state.folders,
            recentNotes: state.notes.slice(-10).map(n => ({
                title: n.title,
                folder: n.folder,
                preview: n.content.substring(0, 100)
            }))
        };
        
        if (!state.geminiKey || state.geminiKey.trim() === '') {
            throw new Error('Gemini API key is missing');
        }
        
        // Call Gemini API - try 2.5 Flash first, fallback to 1.5
        let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.geminiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are an AI assistant for a note-taking app. Analyze this command and extract the note content, suggest a title, and determine the best folder.

Command: "${command}"

Current folders: ${JSON.stringify(context.folders)}
Recent notes for context: ${JSON.stringify(context.recentNotes)}

Respond ONLY with valid JSON (no markdown, no extra text):
{
    "title": "suggested title",
    "content": "extracted content in markdown",
    "folder": "best matching folder or suggest new",
    "isNewFolder": true/false
}`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 1,
                    topP: 1,
                    maxOutputTokens: 2048,
                }
            })
        });
        
        // If 2.5 fails, try 1.5
        if (!response.ok && response.status === 404) {
            console.log('Gemini 2.5 not available, trying 1.5...');
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.geminiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are an AI assistant for a note-taking app. Analyze this command and extract the note content, suggest a title, and determine the best folder.

Command: "${command}"

Current folders: ${JSON.stringify(context.folders)}
Recent notes for context: ${JSON.stringify(context.recentNotes)}

Respond ONLY with valid JSON (no markdown, no extra text):
{
    "title": "suggested title",
    "content": "extracted content in markdown",
    "folder": "best matching folder or suggest new",
    "isNewFolder": true/false
}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
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
                // This is handled by the fallback logic above
                throw new Error('Gemini model not found.');
            }
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Gemini API response:', result);
        
        // Check if response has expected structure
        if (!result.candidates || !result.candidates[0] || !result.candidates[0].content || !result.candidates[0].content.parts) {
            console.error('Unexpected Gemini API response structure:', result);
            throw new Error('Unexpected response from Gemini API. Check console for details.');
        }
        
        // Extract JSON from the response - Gemini might wrap it in markdown or extra text
        let aiResponseText = result.candidates[0].content.parts[0].text;
        console.log('AI response text:', aiResponseText);
        
        // Try to extract JSON if it's wrapped in backticks or has extra text
        const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            aiResponseText = jsonMatch[0];
        }
        
        const aiResponse = JSON.parse(aiResponseText);
        console.log('Parsed AI response:', aiResponse);
        
        // Handle new folder if suggested
        if (aiResponse.isNewFolder && !state.folders.includes(aiResponse.folder)) {
            state.folders.push(aiResponse.folder);
        }
        
        // Create note
        const newNote = {
            id: Date.now(),
            title: aiResponse.title,
            content: aiResponse.content,
            folder: aiResponse.folder,
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };
        
        state.notes.push(newNote);
        await saveData();
        
        // Clear input and refresh UI
        commandInput.value = '';
        renderFolders();
        renderNotes();
        
        // Open the new note
        openNote(newNote);
        
    } catch (error) {
        console.error('Error processing command:', error);
        console.error('Full error details:', error.stack);
        alert(`Error: ${error.message}\n\nCheck the console (F12) for more details.`);
    } finally {
        showLoading(false);
    }
}

// UI Rendering
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

// Note Operations
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
        // Remove the note if save failed
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
        
        // Render markdown
        const html = marked.parse(noteEditor.value);
        notePreview.innerHTML = DOMPurify.sanitize(html);
    }
}

async function saveCurrentNote() {
    if (!state.currentNote) return;
    
    // Find the note in the array and update it
    const noteIndex = state.notes.findIndex(n => n.id === state.currentNote.id);
    if (noteIndex !== -1) {
        state.notes[noteIndex].title = noteTitle.value;
        state.notes[noteIndex].content = noteEditor.value;
        state.notes[noteIndex].modified = new Date().toISOString();
        
        // Update the reference
        state.currentNote = state.notes[noteIndex];
    }
    
    await saveData();
    renderNotes();
    
    // Show success feedback
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

// Helper Functions
function showLoading(show, message = 'Processing with AI...') {
    loadingOverlay.style.display = show ? 'flex' : 'none';
    if (show && message) {
        const loadingText = loadingOverlay.querySelector('p');
        if (loadingText) loadingText.textContent = message;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
}