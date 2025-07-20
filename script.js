// Chrisidian - AI-Powered Notes App
// Configuration and State
const APP_CONFIG = {
    password: 'chrchr', // Change this!
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
    
    if (passwordInput.value !== APP_CONFIG.password) {
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

// GitHub Gist Storage
async function loadData() {
    try {
        // First, try to find existing gist
        const gists = await fetch('https://api.github.com/gists', {
            headers: {
                'Authorization': `token ${state.githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        const gistsList = await gists.json();
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
        alert('Error loading data. Check your GitHub token.');
    }
}

async function saveData() {
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
            await fetch(`https://api.github.com/gists/${state.gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${state.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gistData)
            });
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
            
            const result = await response.json();
            state.gistId = result.id;
        }
    } catch (error) {
        console.error('Error saving data:', error);
        alert('Error saving data. Check your GitHub token.');
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
        
        // Call Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${state.geminiKey}`, {
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

Respond in JSON format:
{
    "title": "suggested title",
    "content": "extracted content in markdown",
    "folder": "best matching folder or suggest new",
    "isNewFolder": true/false
}`
                    }]
                }]
            })
        });
        
        const result = await response.json();
        const aiResponse = JSON.parse(result.candidates[0].content.parts[0].text);
        
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
        alert('Error processing command. Check your Gemini API key and try again.');
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
function createNewFolder() {
    const folderName = prompt('Enter folder name:');
    if (folderName && !state.folders.includes(folderName)) {
        state.folders.push(folderName);
        saveData();
        renderFolders();
    }
}

function createNewNote() {
    const newNote = {
        id: Date.now(),
        title: 'New Note',
        content: '# New Note\n\nStart writing...',
        folder: state.currentFolder === 'All Notes' ? state.folders[0] : state.currentFolder,
        created: new Date().toISOString(),
        modified: new Date().toISOString()
    };
    
    state.notes.push(newNote);
    saveData();
    renderNotes();
    openNote(newNote);
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
    
    state.currentNote.title = noteTitle.value;
    state.currentNote.content = noteEditor.value;
    state.currentNote.modified = new Date().toISOString();
    
    await saveData();
    renderNotes();
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
function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
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