const APP_CONFIG = {
    passwordHash: '7f72131af35c82819bb44f256e34419f381fdeb465b1727d153b58030fabbcb7',
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
const searchInput = document.getElementById('searchInput');
const toggleHeaderBtn = document.getElementById('toggleHeaderBtn');
const aiResponseModal = document.getElementById('aiResponseModal');
const aiResponseOutput = document.getElementById('aiResponseOutput');
const closeAiResponseBtn = document.getElementById('closeAiResponseBtn');

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
            console.log(`Attempting to use model: ${model}`);
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${state.geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: generationConfig
                })
            });

            if (response.ok) {
                console.log(`✅ Successfully used model: ${model}`);
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

async function processCommand() {
    const command = commandInput.value.trim();
    if (!command) return;

    showLoading(true);
    let rawResponseForDebugging = ''; // Variable to hold the raw text for logging on error

    try {
        const intentPrompt = `You are a strict command interpreter. Your ONLY job is to classify the user's text into one of four categories: "CREATE", "UPDATE", "DELETE", or "QUERY".
- Analyze the user's text to determine the intent.
- You MUST respond with ONLY a single, valid JSON object and nothing else.
- If the text is a command to manage notes, use the appropriate intent and find the "targetTitle" from the list if possible.
- If the text is a question or a request for information, the intent is "QUERY".
- If the intent is unclear or it's just a statement, you MUST default to "intent": "QUERY". Do not use "UNKNOWN".

User Command: "${command}"
Existing Note Titles: ${JSON.stringify(state.notes.map(n => n.title))}

Examples:
- User: "delete my cookie recipe" -> {"intent": "DELETE", "targetTitle": "Chocolate Chip Cookie Recipe"}
- User: "new idea for a cat-based dating app" -> {"intent": "CREATE", "targetTitle": null}
- User: "what is the capital of France?" -> {"intent": "QUERY", "targetTitle": null}
- User: "do the pancakes need baking powder?" -> {"intent": "QUERY", "targetTitle": null}
`;
        const intentResult = await callGeminiAPI(intentPrompt, { temperature: 0.0, maxOutputTokens: 2048 });

        if (!intentResult.candidates || intentResult.candidates.length === 0) {
            console.error("FATAL: AI response contained no candidates. Full API Response:", intentResult);
            throw new Error("AI response was empty or invalid. Check console for the full API response object.");
        }

        const intentCandidate = intentResult.candidates[0];
        if (!intentCandidate.content || !intentCandidate.content.parts) {
            console.error("FATAL: AI candidate is missing content. This is likely due to a safety filter. Full Candidate Object:", intentCandidate);
            const reason = intentCandidate.finishReason || "UNKNOWN";
            throw new Error(`AI did not return valid content. Reason: ${reason}. Check console for the full candidate object.`);
        }

        const intentText = intentCandidate.content.parts[0].text;
        rawResponseForDebugging = intentText; // Store for logging in case of JSON error

        const intentJsonMatch = intentText.match(/\{[\s\S]*\}/);
        if (!intentJsonMatch) {
            console.error("FATAL: Could not find a JSON object in the AI's response. Raw AI response text was:", `\n---START---\n${rawResponseForDebugging}\n---END---`);
            throw new Error("AI did not respond with a valid JSON object for intent detection. Check console for its raw response.");
        }
        const { intent, targetTitle } = JSON.parse(intentJsonMatch[0]);

        console.log(`Intent Detected: ${intent}`, `Target: ${targetTitle || 'N/A'}`);
        let shouldSave = false;

        switch (intent) {
            case 'QUERY': {
                showLoading(true, 'Finding an answer...');
                const queryPrompt = `You are a helpful assistant. Provide a clear and concise answer to the following question. Format the response in Markdown.\n\nQuestion: "${command}"`;
                const mainResult = await callGeminiAPI(queryPrompt, { temperature: 0.5, maxOutputTokens: 65536 });

                if (!mainResult.candidates || mainResult.candidates.length === 0) {
                    throw new Error("AI failed to provide an answer.");
                }
                const queryCandidate = mainResult.candidates[0];
                if (!queryCandidate.content || !queryCandidate.content.parts) {
                    console.error("AI response for query is missing content. It was likely blocked.", queryCandidate);
                    const reason = queryCandidate.finishReason || "UNKNOWN";
                    throw new Error(`AI did not return an answer. Reason: ${reason}. This may be due to safety filters.`);
                }
                const answerText = queryCandidate.content.parts[0].text;

                aiResponseOutput.innerHTML = DOMPurify.sanitize(marked.parse(answerText));
                aiResponseModal.style.display = 'flex';
                break;
            }
            case 'UPDATE': {
                const noteToUpdate = state.notes.find(n => n.title === targetTitle);
                if (!noteToUpdate) {
                    throw new Error(`Could not find a note titled "${targetTitle}" to update.`);
                }
                showLoading(true, 'Updating note...');
                const updatePrompt = `You are an AI note editor. Update the following note based on the user's command. Respond with ONLY a single JSON object containing the full, updated "title" and "content".\n\nUser Command: "${command}"\n\nOriginal Note:\n---\n${JSON.stringify({ title: noteToUpdate.title, content: noteToUpdate.content })}\n---`;
                const mainResult = await callGeminiAPI(updatePrompt, { temperature: 0.5, maxOutputTokens: 65536 });

                if (!mainResult.candidates || !mainResult.candidates.length === 0) throw new Error("AI response for note update is empty or invalid.");
                const candidate = mainResult.candidates[0];
                if (!candidate.content || !candidate.content.parts) {
                    console.error("AI response for update is missing content. It was likely blocked.", candidate);
                    const reason = candidate.finishReason || "UNKNOWN";
                    throw new Error(`AI did not return valid content for the update. Reason: ${reason}.`);
                }
                const mainText = candidate.content.parts[0].text;
                rawResponseForDebugging = mainText;

                const payloadMatch = mainText.match(/\{[\s\S]*\}/);
                if (!payloadMatch) {
                    console.error("FATAL: Could not find a JSON object in the AI's update response. Raw AI response text was:", `\n---START---\n${rawResponseForDebugging}\n---END---`);
                    throw new Error("AI did not respond with valid JSON for the note update. Check console for its raw response.");
                }
                const payload = JSON.parse(payloadMatch[0]);
                const noteIndex = state.notes.findIndex(n => n.id === noteToUpdate.id);
                state.notes[noteIndex].title = payload.title || noteToUpdate.title;
                state.notes[noteIndex].content = payload.content;
                state.notes[noteIndex].modified = new Date().toISOString();
                openNote(state.notes[noteIndex]);
                shouldSave = true;
                break;
            }
            case 'DELETE': {
                const noteToDelete = state.notes.find(n => n.title === targetTitle);
                if (!noteToDelete) throw new Error(`Could not find a note titled "${targetTitle}" to delete.`);
                if (confirm(`Are you sure you want to delete the note: "${noteToDelete.title}"?`)) {
                    state.notes = state.notes.filter(n => n.id !== noteToDelete.id);
                    if (state.currentNote && state.currentNote.id === noteToDelete.id) closeEditor();
                    shouldSave = true;
                }
                break;
            }
            case 'CREATE': {
                showLoading(true, 'Creating note...');
                const createPrompt = `Process a user command to create a new note. Respond with ONLY a single, valid JSON object with "title", "content", and "folder". Choose the folder from this list: ${JSON.stringify(state.folders)}\n\nUser Command: "${command}"`;
                const mainResult = await callGeminiAPI(createPrompt, { temperature: 0.7, maxOutputTokens: 65536 });

                if (!mainResult.candidates || mainResult.candidates.length === 0) throw new Error("AI response for note creation is empty or invalid.");
                const candidate = mainResult.candidates[0];
                if (!candidate.content || !candidate.content.parts) {
                    console.error("AI response for create is missing content. It was likely blocked.", candidate);
                    const reason = candidate.finishReason || "UNKNOWN";
                    throw new Error(`AI did not return valid content for the new note. Reason: ${reason}.`);
                }
                const mainText = candidate.content.parts[0].text;
                rawResponseForDebugging = mainText;

                const payloadMatch = mainText.match(/\{[\s\S]*\}/);
                if (!payloadMatch) {
                    console.error("FATAL: Could not find a JSON object in the AI's create response. Raw AI response text was:", `\n---START---\n${rawResponseForDebugging}\n---END---`);
                    throw new Error("AI did not respond with valid JSON for the new note. Check console for its raw response.");
                }
                const payload = JSON.parse(payloadMatch[0]);
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
                shouldSave = true;
                break;
            }
            default:
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
        alert(`An error occurred: ${error.message}\n\nPlease check the browser console (F12) for detailed logs.`);
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
    state.folders.sort((a, b) => a.localeCompare(b));
    state.folders.forEach(folder => {
        const folderEl = document.createElement('div');
        folderEl.className = `folder-item ${state.currentFolder === folder ? 'active' : ''}`;
        folderEl.innerHTML = `<i class="fas fa-folder"></i> ${folder}`;
        folderEl.onclick = () => selectFolder(folder);
        folderList.appendChild(folderEl);
    });
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

async function createNewNote() {
    const newNote = {
        id: Date.now(),
        title: 'New Note',
        content: '# New Note\n\nStart writing...',
        folder: state.currentFolder === 'All Notes' ? state.folders[0] || 'Personal' : state.currentFolder,
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
    setEditorMode('preview');
    if (window.innerWidth <= 768) {
        toggleHeaderBtn.style.display = 'flex';
    }
}

function closeEditor() {
    editorPanel.style.display = 'none';
    state.currentNote = null;
    toggleHeaderBtn.style.display = 'none';
    editorPanel.classList.remove('header-collapsed');
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