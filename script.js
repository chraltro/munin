function debounce(func, delay) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

const APP_CONFIG = {
    passwordHash: '7f72131af35c82819bb44f256e34419f381fdeb465b1727d153b58030fabbcb7',
    gistFilename: 'chrisidian-notes.json',
    embeddingModel: 'text-embedding-004'
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
    isEmbeddingStale: false,
    originalNoteContent: '',
    isSemanticSearching: false,
    saveTimeout: null,
    currentServings: null,
    baseServings: null
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
    { name: 'Night', className: 'theme-night', gradient: ['#8b5cf6', '#a78bfa'] },
    { name: 'Black', className: 'theme-black', gradient: ['#a3a3a3', '#d4d4d4'] },
    { name: 'White', className: 'theme-white', gradient: ['#3b82f6', '#60a5fa'] },
    { name: 'Light Grey', className: 'theme-light-grey', gradient: ['#475569', '#64748b'] },
    { name: 'Coral', className: 'theme-coral', gradient: ['#ef4444', '#f87171'] },
    { name: 'Indigo', className: 'theme-indigo', gradient: ['#6366f1', '#818cf8'] },
    { name: 'Emerald', className: 'theme-emerald', gradient: ['#10b981', '#34d399'] },
    { name: 'Gold', className: 'theme-gold', gradient: ['#f59e0b', '#fbbf24'] },
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

const elements = {
    loginScreen: document.getElementById('loginScreen'),
    mainApp: document.getElementById('mainApp'),
    loginForm: document.getElementById('loginForm'),
    passwordInput: document.getElementById('password'),
    geminiKeyInput: document.getElementById('geminiKey'),
    githubTokenInput: document.getElementById('githubToken'),
    logoutBtn: document.getElementById('logoutBtn'),
    commandInput: document.getElementById('commandInput'),
    processBtn: document.getElementById('processBtn'),
    folderList: document.getElementById('folderList'),
    notesList: document.getElementById('notesList'),
    currentFolderName: document.getElementById('currentFolderName'),
    newFolderBtn: document.getElementById('newFolderBtn'),
    newNoteBtn: document.getElementById('newNoteBtn'),
    editorPanel: document.getElementById('editorPanel'),
    noteTitle: document.getElementById('noteTitle'),
    noteEditor: document.getElementById('noteEditor'),
    notePreview: document.getElementById('notePreview'),
    editModeBtn: document.getElementById('editModeBtn'),
    previewModeBtn: document.getElementById('previewModeBtn'),
    saveNoteBtn: document.getElementById('saveNoteBtn'),
    deleteNoteBtn: document.getElementById('deleteNoteBtn'),
    closeEditorBtn: document.getElementById('closeEditorBtn'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    searchInput: document.getElementById('searchInput'),
    toggleHeaderBtn: document.getElementById('toggleHeaderBtn'),
    aiResponseModal: document.getElementById('aiResponseModal'),
    aiResponseOutput: document.getElementById('aiResponseOutput'),
    closeAiResponseBtn: document.getElementById('closeAiResponseBtn'),
    changeThemeBtn: document.getElementById('changeThemeBtn'),
    themeModal: document.getElementById('themeModal'),
    themeModalGrid: document.getElementById('themeModalGrid'),
    closeThemeModalBtn: document.getElementById('closeThemeModalBtn'),
    mobileFolderSelector: document.getElementById('mobileFolderSelector'),
    fontFamilySelector: document.getElementById('fontFamilySelector'),
    fontSizeSlider: document.getElementById('fontSizeSlider'),
    fontSizeValue: document.getElementById('fontSizeValue'),
    lineHeightSlider: document.getElementById('lineHeightSlider'),
    lineHeightValue: document.getElementById('lineHeightValue'),
    saveStatus: document.getElementById('saveStatus'),
    recipeScaler: document.getElementById('recipeScaler'),
    servingsInput: document.getElementById('servingsInput'),
    servingsDecrement: document.getElementById('servingsDecrement'),
    servingsIncrement: document.getElementById('servingsIncrement')
};

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    checkSecurityWarning();
    loadTheme();
    loadTypography();
    await checkAutoLogin();
    setupEventListeners();
}

function checkSecurityWarning() {
    if (APP_CONFIG.passwordHash === '7f72131af35c82819bb44f256e34419f381fdeb465b1727d153b58030fabbcb7') {
        console.warn('⚠️ SECURITY WARNING: Using default password hash! Change it before deploying!');
        const warning = document.getElementById('securityWarning');
        if (warning) warning.style.display = 'flex';
    }
}

async function checkAutoLogin() {
    const savedAuth = localStorage.getItem('chrisidian_auth');
    if (savedAuth) {
        const auth = JSON.parse(savedAuth);
        state.geminiKey = auth.geminiKey;
        state.githubToken = auth.githubToken;
        state.isAuthenticated = true;
        showMainApp();
        await loadData();
    }
}

let statusTimeout;
const debouncedSave = debounce(() => saveCurrentNote(false), 2000);

function updateSaveStatus(message, type = 'success') {
    if (!elements.saveStatus) return;
    
    clearTimeout(statusTimeout);
    const icon = elements.saveStatus.querySelector('i');
    const text = elements.saveStatus.querySelector('span');
    
    elements.saveStatus.className = 'save-status visible';
    
    switch (type) {
        case 'saving':
            icon.className = 'fas fa-spinner fa-spin';
            text.textContent = message;
            break;
        case 'error':
            icon.className = 'fas fa-exclamation-circle';
            text.textContent = message;
            elements.saveStatus.style.color = 'var(--danger)';
            break;
        case 'success':
        default:
            icon.className = 'fas fa-check-circle';
            text.textContent = message;
            elements.saveStatus.style.color = 'var(--success)';
            break;
    }
    
    if (type === 'success') {
        statusTimeout = setTimeout(() => {
            elements.saveStatus.classList.remove('visible');
        }, 2000);
    }
}

function setupEventListeners() {
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.logoutBtn.addEventListener('click', handleLogout);
    elements.processBtn.addEventListener('click', processCommand);
    elements.commandInput.addEventListener('keydown', handleCommandKeyPress);
    elements.commandInput.addEventListener('input', autoResizeCommandInput);
    elements.newFolderBtn.addEventListener('click', createNewFolder);
    elements.newNoteBtn.addEventListener('click', createNewNote);
    elements.editModeBtn.addEventListener('click', () => setEditorMode('edit'));
    elements.previewModeBtn.addEventListener('click', () => setEditorMode('preview'));
    elements.saveNoteBtn.addEventListener('click', () => saveCurrentNote(true));
    elements.deleteNoteBtn.addEventListener('click', deleteCurrentNote);
    elements.closeEditorBtn.addEventListener('click', closeEditor);
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.searchInput.addEventListener('keypress', handleSearchKeyPress);
    elements.toggleHeaderBtn.addEventListener('click', toggleEditorHeader);
    elements.closeAiResponseBtn.addEventListener('click', () => elements.aiResponseModal.style.display = 'none');
    elements.changeThemeBtn.addEventListener('click', () => elements.themeModal.style.display = 'flex');
    elements.closeThemeModalBtn.addEventListener('click', () => elements.themeModal.style.display = 'none');
    elements.mobileFolderSelector.addEventListener('change', (e) => selectFolder(e.target.value));
    elements.fontFamilySelector.addEventListener('change', handleFontChange);
    elements.fontSizeSlider.addEventListener('input', handleFontSizeChange);
    elements.lineHeightSlider.addEventListener('input', handleLineHeightChange);
    elements.servingsDecrement.addEventListener('click', () => updateServings(-1));
    elements.servingsIncrement.addEventListener('click', () => updateServings(1));
    elements.servingsInput.addEventListener('change', handleServingsInputChange);
    elements.noteTitle.addEventListener('input', handleNoteChange);
    elements.noteEditor.addEventListener('input', handleNoteChange);
    elements.currentFolderName.addEventListener('click', handleFolderNameClick);

    setupModalEventListeners();
    setupNoteLinkHandlers();
}

function setupModalEventListeners() {
    elements.aiResponseModal.addEventListener('click', (e) => {
        if (e.target === elements.aiResponseModal) {
            elements.aiResponseModal.style.display = 'none';
        }
    });

    elements.themeModal.addEventListener('click', (e) => {
        if (e.target === elements.themeModal) {
            elements.themeModal.style.display = 'none';
        }
    });
}

function setupNoteLinkHandlers() {
    const handleNoteLinkClick = (e) => {
        const link = e.target.closest('a');
        if (link && link.dataset.noteId) {
            e.preventDefault();
            const noteId = parseInt(link.dataset.noteId, 10);
            const noteToOpen = state.notes.find(n => n.id === noteId);
            if (noteToOpen) {
                openNote(noteToOpen);
                if (e.currentTarget === elements.aiResponseModal) {
                    elements.aiResponseModal.style.display = 'none';
                }
            } else {
                showNotification(`Note with ID ${noteId} not found.`, 'error');
            }
        }
    };

    elements.aiResponseOutput.addEventListener('click', handleNoteLinkClick);
    elements.notePreview.addEventListener('click', handleNoteLinkClick);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        padding: 1rem 1.5rem;
        border-radius: var(--radius);
        border: 1px solid var(--border);
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        max-width: 400px;
        transform: translateX(100%);
        transition: var(--transition);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

async function handleLogin(e) {
    e.preventDefault();
    
    const enteredPasswordHash = await hashPassword(elements.passwordInput.value);
    if (enteredPasswordHash !== APP_CONFIG.passwordHash) {
        showNotification('Invalid password!', 'error');
        return;
    }
    
    state.geminiKey = elements.geminiKeyInput.value;
    state.githubToken = elements.githubTokenInput.value;
    state.isAuthenticated = true;
    
    localStorage.setItem('chrisidian_auth', JSON.stringify({
        geminiKey: state.geminiKey,
        githubToken: state.githubToken
    }));
    
    showMainApp();
    await loadData();
}

async function hashPassword(password) {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function handleLogout() {
    localStorage.removeItem('chrisidian_auth');
    state.isAuthenticated = false;
    state.geminiKey = '';
    state.githubToken = '';
    elements.loginScreen.style.display = 'flex';
    elements.mainApp.style.display = 'none';
    elements.passwordInput.value = '';
    elements.geminiKeyInput.value = '';
    elements.githubTokenInput.value = '';
}

function showMainApp() {
    elements.loginScreen.style.display = 'none';
    elements.mainApp.style.display = 'flex';
    renderFolders();
    renderThemeSwitchers();
    renderFontSelector();
    testGeminiAPI();
}

function handleCommandKeyPress(e) {
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        processCommand();
    }
}

function autoResizeCommandInput() {
    const textarea = elements.commandInput;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
}

function handleSearchInput() {
    if (elements.searchInput.value.trim() === '') {
        clearSemanticSearch();
    } else {
        renderNotes();
    }
}

function handleSearchKeyPress(e) {
    if (e.key === 'Enter') {
        performSemanticSearch();
    }
}

function handleNoteChange() {
    setDirtyState(true);
    debouncedSave();
}

function handleFolderNameClick() {
    if (state.currentFolder !== 'All Notes' && !state.isSemanticSearching) {
        renameFolder(state.currentFolder);
    }
}

function updateServings(change) {
    const currentVal = parseInt(elements.servingsInput.value, 10);
    const newVal = Math.max(1, currentVal + change);
    elements.servingsInput.value = newVal;
    state.currentServings = newVal;
    setEditorMode('preview');
}

function handleServingsInputChange(e) {
    const newVal = Math.max(1, parseInt(e.target.value, 10) || state.baseServings);
    e.target.value = newVal;
    state.currentServings = newVal;
    setEditorMode('preview');
}

function toFraction(decimal) {
    if (decimal === Math.round(decimal)) {
        return decimal.toString();
    }
    
    const tolerance = 0.001;
    const whole = Math.floor(decimal);
    const fracDecimal = decimal - whole;

    if (fracDecimal < tolerance) {
        return whole.toString();
    }

    const commonFractions = [
        [1, 8], [1, 4], [1, 3], [3, 8], [1, 2], [5, 8], [2, 3], [3, 4], [7, 8]
    ];

    for (const [num, den] of commonFractions) {
        if (Math.abs(fracDecimal - (num / den)) < tolerance) {
            return (whole > 0 ? whole + ' ' : '') + `${num}/${den}`;
        }
    }
    
    return parseFloat(decimal.toFixed(1)).toString().replace('.', ',');
}

function parseQuantity(quantityStr) {
    quantityStr = quantityStr.trim();
    const normalizedQuantityStr = quantityStr.replace(',', '.');

    if (normalizedQuantityStr.includes(' ')) {
        const parts = normalizedQuantityStr.split(' ');
        if (parts.length === 2 && parts[1].includes('/')) {
            const whole = parseInt(parts[0], 10);
            const fracParts = parts[1].split('/');
            const num = parseInt(fracParts[0], 10);
            const den = parseInt(fracParts[1], 10);
            if (!isNaN(whole) && !isNaN(num) && den) {
                return whole + num / den;
            }
        }
    } else if (normalizedQuantityStr.includes('/')) {
        const parts = normalizedQuantityStr.split('/');
        if (parts.length === 2) {
            const num = parseInt(parts[0], 10);
            const den = parseInt(parts[1], 10);
            if (!isNaN(num) && den) {
                return num / den;
            }
        }
    }
    const parsed = parseFloat(normalizedQuantityStr);
    return isNaN(parsed) ? null : parsed;
}

function scaleRecipeContent(content, baseServings, newServings) {
    if (!baseServings || !newServings || baseServings === newServings) {
        return content;
    }
    const scaleFactor = newServings / baseServings;

    return content.split('\n').map(line => {
        const lineMatch = line.match(/^(\s*[-*+]\s*|\s*\d+\.\s+)(.*)/);
        if (!lineMatch) {
            return line;
        }

        const prefix = lineMatch[1];
        let restOfLine = lineMatch[2];
        
        const quantityMatch = restOfLine.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d*[,.]?\d+)/);
        
        if (quantityMatch) {
            const quantityStr = quantityMatch[0];
            const originalAmount = parseQuantity(quantityStr);
            
            if (originalAmount !== null) {
                const unitAndIngredient = restOfLine.substring(quantityStr.length);
                let newAmount = originalAmount * scaleFactor;
                let formattedAmount = toFraction(newAmount);
                return `${prefix}${formattedAmount}${unitAndIngredient}`;
            }
        }
        
        return line;
    }).join('\n');
}

function toggleEditorHeader() {
    elements.editorPanel.classList.toggle('header-collapsed');
    const icon = elements.toggleHeaderBtn.querySelector('i');
    if (elements.editorPanel.classList.contains('header-collapsed')) {
        icon.className = 'fas fa-compress-alt';
    } else {
        icon.className = 'fas fa-expand-alt';
    }
}

async function testGeminiAPI() {
    try {
        const testPrompt = 'Say "Hello World" in JSON format: {"message": "Hello World"}';
        const result = await callGeminiAPI(testPrompt, { maxOutputTokens: 2048 });
        if (result && result.candidates) {
            console.log('✅ Gemini API is working');
        } else {
            console.error('❌ Gemini API test failed');
        }
    } catch (error) {
        console.error('Gemini API test failed:', error);
        showNotification(`Gemini API test failed: ${error.message}`, 'error');
    }
}

async function loadData() {
    try {
        updateSaveStatus('Loading...', 'saving');
        
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
        const existingGist = gistsList.find(g => g.files && g.files[APP_CONFIG.gistFilename]);
        
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
        updateSaveStatus('Loaded');
    } catch (error) {
        console.error('Error loading data:', error);
        updateSaveStatus('Load failed', 'error');
        showNotification(error.message, 'error');
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
        throw error;
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
            body: JSON.stringify({ 
                model: `models/${APP_CONFIG.embeddingModel}`, 
                content: { parts: [{ text }] } 
            })
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
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
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
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, maxNotes);

    console.log("Top scoring notes:", scoredNotes.map(n => ({ title: n.note.title, score: n.score })));
    return scoredNotes.map(item => item.note);
}

function renderSanitizedHTML(markdownContent) {
    let html = marked.parse(markdownContent);
    html = html.replace(/href="app:\/\/note\/(\d+)"/g, 'href="#" data-note-id="$1"');
    return DOMPurify.sanitize(html, { ADD_ATTR: ['data-note-id'] });
}

async function processCommand() {
    const command = elements.commandInput.value.trim();
    if (!command) return;

    showLoading(true, 'Processing...');
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

3. Relevant Existing Notes (ID, Title, and Content):
${JSON.stringify(relevantNotes.map(n => ({ id: n.id, title: n.title, content: n.content })))}

---
TOOL-USE INSTRUCTIONS:

1. tool: "ANSWER_QUESTION"
   - Use this if the command is a question.
   - **CRITICAL**: The 'content' you generate MUST be well-formatted markdown. Use headings, lists, bold text, and newlines (\`\\n\`) to make the note clear and readable.
   - **LINKING**: When you reference a specific note, you MUST create a markdown link to it using its ID in this exact format: \`[The Note's Title](app://note/THE_NOTE_ID)\`.
   - **Example**: "Here are the cookie recipes I found:\\n\\n## Recipes\\n\\n- **[Nemme Havregrynskager](app://note/1709251200000)**: A simple Danish oatmeal cookie.\\n- **[Chocolate Chip Cookies](app://note/1704067200000)**: A classic American recipe."
   - If no notes seem relevant, say you couldn't find an answer in the notes.
   - args: { "answer": "The full, markdown-formatted answer." }

2. tool: "CREATE_NOTE"
   - Use this for commands that clearly ask to save new information.
   - **CRITICAL**: The 'content' you generate MUST be well-formatted markdown. Use headings, lists, bold text, and newlines (\`\\n\`) to make the note clear and readable.
   - **If the note is a RECIPE, you MUST follow these rules**:
     1. Set 'folder' to "Recipes".
     2. Add a 'servings' argument (e.g., \'"servings": 4\').
     3. For every ingredient in the markdown 'content', the line MUST be a list item starting with a numeric quantity (e.g., \`- 250g flour\`, \`* 2 eggs\`). This is required for scaling.
   - **args for a regular note**: { "title": "...", "content": "...", "folder": "...", "newFolder": true/false }
   - **args for a RECIPE**: { "title": "...", "content": "...", "folder": "Recipes", "servings": 4, "newFolder": false }

3. tool: "UPDATE_NOTE"
   - Use this to modify an existing note based on the 'Relevant Existing Notes'.
   - **CRITICAL**: The 'newContent' you generate MUST be the complete, well-formatted markdown for the entire note.
   - args: { "targetTitle": "Full Title of Note to Update", "newTitle": "Updated Title", "newContent": "Full new content..." }

4. tool: "DELETE_NOTE"
   - Use this to delete a note based on the 'Relevant Existing Notes'.
   - args: { "targetTitle": "Full Title of Note to Delete" }

---
Now, analyze all the provided data and return the single JSON object for the correct tool call. Do not include any other text or explanation.`;

        const mainResult = await callGeminiAPI(masterPrompt, { temperature: 0.1, maxOutputTokens: 8192 });

        if (!mainResult.candidates || mainResult.candidates.length === 0) {
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
        
        await executeAITool(tool, args);
        elements.commandInput.value = '';
        autoResizeCommandInput();

    } catch (error) {
        console.error('Full error object:', error);
        if (rawResponseForDebugging) {
            console.error("The AI's last raw response before the error was:", `\n---START---\n${rawResponseForDebugging}\n---END---`);
        }
        showNotification(`An error occurred: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

async function executeAITool(tool, args) {
    let shouldSave = false;

    switch (tool) {
        case 'ANSWER_QUESTION':
            if (!args || !args.answer) {
                throw new Error("AI chose ANSWER_QUESTION but provided no answer.");
            }
            elements.aiResponseOutput.innerHTML = renderSanitizedHTML(args.answer);
            elements.aiResponseModal.style.display = 'flex';
            break;

        case 'CREATE_NOTE':
            if (!args || !args.title || !args.content || !args.folder) {
                throw new Error("AI chose CREATE_NOTE with incomplete arguments.");
            }
            if (args.folder === 'Recipes' && !args.servings) {
                showNotification("AI created a recipe without servings. Defaulting to 4.", "warning");
                args.servings = 4;
            }
            
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
                embedding: await callEmbeddingAPI(`${args.title}\n${args.content}`),
                servings: args.folder === 'Recipes' ? args.servings : undefined
            };
            
            state.notes.push(newNote);
            openNote(newNote);
            shouldSave = true;
            break;

        case 'UPDATE_NOTE':
            if (!args || !args.targetTitle || !args.newContent) {
                throw new Error("AI chose UPDATE_NOTE with incomplete arguments.");
            }
            
            const noteIndex = state.notes.findIndex(n => n.title === args.targetTitle);
            if (noteIndex === -1) {
                throw new Error(`AI tried to update a note titled "${args.targetTitle}" which does not exist.`);
            }

            state.notes[noteIndex].title = args.newTitle || args.targetTitle;
            state.notes[noteIndex].content = args.newContent;
            state.notes[noteIndex].modified = new Date().toISOString();
            state.notes[noteIndex].embedding = await callEmbeddingAPI(`${state.notes[noteIndex].title}\n${state.notes[noteIndex].content}`);

            openNote(state.notes[noteIndex]);
            shouldSave = true;
            break;

        case 'DELETE_NOTE':
            if (!args || !args.targetTitle) {
                throw new Error("AI chose DELETE_NOTE with incomplete arguments.");
            }
            
            const noteToDelete = state.notes.find(n => n.title === args.targetTitle);
            if (!noteToDelete) {
                throw new Error(`AI tried to delete a note titled "${args.targetTitle}" which does not exist.`);
            }

            if (confirm(`Are you sure you want to delete the note: "${noteToDelete.title}"?`)) {
                state.notes = state.notes.filter(n => n.id !== noteToDelete.id);
                if (state.currentNote && state.currentNote.id === noteToDelete.id) {
                    closeEditor();
                }
                shouldSave = true;
            }
            break;

        default:
            console.error("AI returned an unknown tool:", tool);
            throw new Error("The AI returned an unknown command. Please try rephrasing.");
    }

    if (shouldSave) {
        await saveData();
        renderNotes();
        updateSaveStatus('Saved');
    }
}

async function performSemanticSearch() {
    const query = elements.searchInput.value.trim();
    if (!query) return;

    showLoading(true, 'Semantic Search...');
    state.isSemanticSearching = true;

    try {
        const relevantNotes = await findSemanticallyRelevantNotes(query, 10);
        renderNotes(relevantNotes);

        elements.currentFolderName.innerHTML = `
            <span>Semantic Results</span>
            <button id="clearSearchBtn" class="clear-search-btn" title="Clear Semantic Search">
                <i class="fas fa-times-circle"></i>
            </button>
        `;
        
        document.getElementById('clearSearchBtn').addEventListener('click', clearSemanticSearch);

    } catch (error) {
        console.error("Error during semantic search:", error);
        showNotification("Semantic search failed. Please check the console.", 'error');
        clearSemanticSearch();
    } finally {
        showLoading(false);
    }
}

function clearSemanticSearch() {
    state.isSemanticSearching = false;
    elements.searchInput.value = '';
    selectFolder(state.currentFolder);
}

function renderFolders() {
    elements.folderList.innerHTML = `
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

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'folder-actions';

        const renameBtn = document.createElement('button');
        renameBtn.className = 'rename-folder-btn';
        renameBtn.title = `Rename folder "${folder}"`;
        renameBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
        renameBtn.onclick = (e) => {
            e.stopPropagation();
            renameFolder(folder);
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-folder-btn';
        deleteBtn.title = `Delete folder "${folder}"`;
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteFolder(folder);
        };

        actionsDiv.appendChild(renameBtn);
        actionsDiv.appendChild(deleteBtn);
        folderEl.appendChild(nameSpan);
        folderEl.appendChild(actionsDiv);
        elements.folderList.appendChild(folderEl);
    });

    elements.mobileFolderSelector.innerHTML = '<option value="All Notes">All Notes</option>';
    state.folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder;
        option.textContent = folder;
        elements.mobileFolderSelector.appendChild(option);
    });
    elements.mobileFolderSelector.value = state.currentFolder;
}

function renderNotes(notesToShow = null, animate = true) {
    let notesToDisplay;

    if (notesToShow) {
        notesToDisplay = notesToShow;
    } else {
        notesToDisplay = state.currentFolder === 'All Notes'
            ? state.notes
            : state.notes.filter(n => n.folder === state.currentFolder);

        const searchTerm = elements.searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            notesToDisplay = notesToDisplay.filter(note =>
                note.title.toLowerCase().includes(searchTerm) ||
                note.content.toLowerCase().includes(searchTerm)
            );
        }
        notesToDisplay.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    }

    elements.notesList.innerHTML = '';
    
    if (notesToDisplay.length === 0) {
        elements.notesList.innerHTML = `
            <div style="
                grid-column: 1 / -1;
                text-align: center;
                padding: 3rem 1rem;
                color: var(--text-tertiary);
            ">
                <i class="fas fa-sticky-note" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No notes found</p>
                <p style="font-size: 0.9rem;">Create your first note to get started</p>
            </div>
        `;
        return;
    }

    notesToDisplay.forEach((note, index) => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        if (!animate) {
            noteCard.classList.add('visible');
        }
        noteCard.onclick = () => openNote(note);
        
        const preview = note.content.substring(0, 150).replace(/[#*`]/g, '');
        noteCard.innerHTML = `
            <h3>${note.title}</h3>
            <p>${preview}${note.content.length > 150 ? '...' : ''}</p>
            <div class="note-meta">
                <span><i class="fas fa-folder"></i> ${note.folder}</span>
                <span><i class="fas fa-clock"></i> ${formatDate(note.modified)}</span>
            </div>
        `;
        
        elements.notesList.appendChild(noteCard);
        
        if (animate) {
            setTimeout(() => {
                noteCard.classList.add('visible');
            }, index * 50);
        }
    });
}

function selectFolder(folder) {
    state.isSemanticSearching = false;
    state.currentFolder = folder;
    elements.currentFolderName.innerHTML = folder;
    elements.searchInput.value = '';
    renderFolders();
    renderNotes();
}

async function createNewFolder() {
    const folderName = prompt('Enter folder name:');
    if (!folderName || folderName.trim() === '') return;

    const formattedName = folderName.trim().charAt(0).toUpperCase() + folderName.trim().slice(1);

    const folderExists = state.folders.some(f => f.toLowerCase() === formattedName.toLowerCase());
    if (folderExists) {
        showNotification(`A folder named "${formattedName}" already exists.`, 'error');
        return;
    }
    
    state.folders.push(formattedName);
    await saveData();
    renderFolders();
    updateSaveStatus('Saved');
}

async function renameFolder(oldName) {
    if (oldName === 'All Notes') return;

    const newNamePrompt = prompt('Enter new folder name:', oldName);
    if (!newNamePrompt || newNamePrompt.trim() === '') return;

    const formattedNewName = newNamePrompt.trim().charAt(0).toUpperCase() + newNamePrompt.trim().slice(1);

    if (formattedNewName === oldName) return;

    const folderExists = state.folders.some(f => f.toLowerCase() === formattedNewName.toLowerCase() && f.toLowerCase() !== oldName.toLowerCase());
    if (folderExists) {
        showNotification(`A folder named "${formattedNewName}" already exists.`, 'error');
        return;
    }

    state.notes.forEach(note => {
        if (note.folder === oldName) {
            note.folder = formattedNewName;
        }
    });

    const folderIndex = state.folders.findIndex(f => f === oldName);
    if (folderIndex > -1) {
        state.folders[folderIndex] = formattedNewName;
    }

    if (state.currentFolder === oldName) {
        state.currentFolder = formattedNewName;
    }

    await saveData();
    renderFolders();
    selectFolder(state.currentFolder);
    updateSaveStatus('Saved');
}

async function deleteFolder(folderName) {
    if (!confirm(`Are you sure you want to delete the folder "${folderName}"? This cannot be undone.`)) {
        return;
    }
    
    const isFolderEmpty = !state.notes.some(note => note.folder === folderName);
    if (!isFolderEmpty) {
        showNotification(`Cannot delete folder "${folderName}" because it is not empty.`, 'error');
        return;
    }

    state.folders = state.folders.filter(f => f !== folderName);

    if (state.currentFolder === folderName) {
        selectFolder('All Notes');
    } else {
        renderFolders();
    }

    await saveData();
    updateSaveStatus('Saved');
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
        updateSaveStatus('Saved');
    } catch (error) {
        state.notes = state.notes.filter(n => n.id !== newNote.id);
        console.error('Failed to create note:', error);
        showNotification(`Failed to create note: ${error.message}`, 'error');
    }
}

function openNote(note) {
    if (state.currentNote && state.isEmbeddingStale) {
        const noteToSave = {
            id: state.currentNote.id,
            title: elements.noteTitle.value,
            content: elements.noteEditor.value
        };
        performBackgroundSave(noteToSave);
    }

    state.currentNote = note;
    elements.noteTitle.value = note.title;
    elements.noteEditor.value = note.content;
    state.originalNoteContent = note.content;

    if (note.folder === 'Recipes' && note.servings) {
        state.baseServings = note.servings;
        state.currentServings = note.servings;
        elements.servingsInput.value = note.servings;
        elements.recipeScaler.style.display = 'flex';
    } else {
        elements.recipeScaler.style.display = 'none';
        state.baseServings = null;
        state.currentServings = null;
    }
    
    state.isNoteDirty = false;
    state.isEmbeddingStale = false;
    elements.saveNoteBtn.classList.remove('is-dirty');

    elements.editorPanel.classList.add('is-open');
    setEditorMode('preview');
    
    if (window.innerWidth <= 768) {
        elements.toggleHeaderBtn.style.display = 'flex';
        elements.closeEditorBtn.style.display = 'flex';
    }
}

function closeEditor() {
    if (state.currentNote && state.isEmbeddingStale) {
        const noteToSave = {
            id: state.currentNote.id,
            title: elements.noteTitle.value,
            content: elements.noteEditor.value
        };
        performBackgroundSave(noteToSave);
    }

    elements.recipeScaler.style.display = 'none';
    state.baseServings = null;
    state.currentServings = null;

    elements.editorPanel.classList.remove('is-open');
    state.currentNote = null;
    state.originalNoteContent = '';
    
    state.isNoteDirty = false;
    state.isEmbeddingStale = false;
    elements.saveNoteBtn.classList.remove('is-dirty');

    elements.toggleHeaderBtn.style.display = 'none';
    elements.closeEditorBtn.style.display = 'none';
    elements.editorPanel.classList.remove('header-collapsed');
}

function setEditorMode(mode) {
    if (mode === 'edit') {
        elements.noteEditor.style.display = 'block';
        elements.notePreview.style.display = 'none';
        elements.editModeBtn.classList.add('active');
        elements.previewModeBtn.classList.remove('active');
    } else {
        elements.noteEditor.style.display = 'none';
        elements.notePreview.style.display = 'block';
        elements.editModeBtn.classList.remove('active');
        elements.previewModeBtn.classList.add('active');
        
        let contentToRender = elements.noteEditor.value;
        if (state.currentNote && state.currentNote.folder === 'Recipes' && state.baseServings) {
            contentToRender = scaleRecipeContent(contentToRender, state.baseServings, state.currentServings);
        }
        elements.notePreview.innerHTML = renderSanitizedHTML(contentToRender);
    }
}

function setDirtyState(isDirty) {
    state.isNoteDirty = isDirty;
    if (isDirty) {
        state.isEmbeddingStale = true;
    }
    elements.saveNoteBtn.classList.toggle('is-dirty', state.isEmbeddingStale);
}

async function performBackgroundSave(note) {
    updateSaveStatus('Saving...', 'saving');

    const noteIndex = state.notes.findIndex(n => n.id === note.id);
    if (noteIndex === -1) return;

    state.notes[noteIndex].title = note.title;
    state.notes[noteIndex].content = note.content;
    state.notes[noteIndex].modified = new Date().toISOString();

    console.log("Regenerating embedding in background for note:", note.id);
    const newEmbedding = await callEmbeddingAPI(`${note.title}\n${note.content}`);
    state.notes[noteIndex].embedding = newEmbedding;

    await saveData();
    
    if (!state.currentNote && !state.isSemanticSearching) {
        renderNotes(null, false);
    }

    updateSaveStatus('Saved');
}

async function saveCurrentNote(regenerateEmbedding = false) {
    if (!state.currentNote) return;

    updateSaveStatus('Saving...', 'saving');

    const noteIndex = state.notes.findIndex(n => n.id === state.currentNote.id);
    if (noteIndex === -1) return;

    const newTitle = elements.noteTitle.value;
    const newContent = elements.noteEditor.value;

    state.notes[noteIndex].title = newTitle;
    state.notes[noteIndex].content = newContent;
    state.notes[noteIndex].modified = new Date().toISOString();

    if (regenerateEmbedding) {
        console.log("Regenerating embedding on explicit save...");
        const newEmbedding = await callEmbeddingAPI(`${newTitle}\n${newContent}`);
        state.notes[noteIndex].embedding = newEmbedding;
        state.isEmbeddingStale = false;
    }

    state.originalNoteContent = newContent;
    state.currentNote = state.notes[noteIndex];

    await saveData();

    if (!state.isSemanticSearching) {
        renderNotes(null, false);
    }
    
    state.isNoteDirty = false;
    elements.saveNoteBtn.classList.toggle('is-dirty', state.isEmbeddingStale);
    updateSaveStatus('Saved');
}

async function deleteCurrentNote() {
    if (!state.currentNote) return;
    
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    state.notes = state.notes.filter(n => n.id !== state.currentNote.id);
    await saveData();
    renderNotes();
    closeEditor();
    updateSaveStatus('Saved');
}

function showLoading(show, message = 'Processing...') {
    elements.loadingOverlay.style.display = show ? 'flex' : 'none';
    if (show && message) {
        const loadingText = elements.loadingOverlay.querySelector('.loading-text');
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
    elements.themeModalGrid.innerHTML = '';
    THEMES.forEach(theme => {
        const gradientCss = `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]})`;
        const card = document.createElement('div');
        card.className = 'theme-card';
        card.title = theme.name;
        card.onclick = () => {
            applyTheme(theme.className);
            elements.themeModal.style.display = 'none';
        };
        card.innerHTML = `<div class="theme-card-swatch" style="background-image: ${gradientCss};"></div>`;
        elements.themeModalGrid.appendChild(card);
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
    elements.fontFamilySelector.innerHTML = '';
    const sortedFonts = [...FONTS].sort((a, b) => a.name.localeCompare(b.name));

    sortedFonts.forEach(font => {
        const option = document.createElement('option');
        option.value = font.family;
        option.textContent = font.name;
        option.style.fontFamily = font.family;
        elements.fontFamilySelector.appendChild(option);
    });
}

function updateTypographyControls() {
    elements.fontFamilySelector.value = userPreferences.fontFamily;

    const size = parseInt(userPreferences.fontSize, 10);
    elements.fontSizeSlider.value = size;
    elements.fontSizeValue.textContent = `${size}px`;

    const height = parseFloat(userPreferences.lineHeight);
    elements.lineHeightSlider.value = height;
    elements.lineHeightValue.textContent = height.toFixed(1);
}

function handleFontChange(e) {
    userPreferences.fontFamily = e.target.value;
    applyTypography(userPreferences);
    saveTypography();
}

function handleFontSizeChange(e) {
    const size = e.target.value;
    userPreferences.fontSize = `${size}px`;
    elements.fontSizeValue.textContent = `${size}px`;
    applyTypography(userPreferences);
    saveTypography();
}

function handleLineHeightChange(e) {
    const height = e.target.value;
    userPreferences.lineHeight = height;
    elements.lineHeightValue.textContent = parseFloat(height).toFixed(1);
    applyTypography(userPreferences);
    saveTypography();
}
