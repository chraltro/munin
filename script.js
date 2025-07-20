function debounce(func, delay) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

let state = {
    isAuthenticated: false,
    geminiKey: '',
    githubToken: '',
    notes: [],
    folders: ['Prompts', 'Recipes'],
    currentFolder: 'All Notes',
    activeTags: [],
    allTags: [],
    isTagListExpanded: false,
    currentNote: null,
    gistId: null,
    gistOwner: null,
    isNoteDirty: false,
    isEmbeddingStale: false,
    originalNoteContent: '',
    isSemanticSearching: false,
    noteViewMode: 'card',
    saveTimeout: null,
    currentServings: null,
    baseServings: null,
    activeAIJobs: 0
};

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
    tagList: document.getElementById('tagList'),
    tagListContainer: document.getElementById('tagListContainer'),
    notesList: document.getElementById('notesList'),
    currentFolderName: document.getElementById('currentFolderName'),
    newFolderBtn: document.getElementById('newFolderBtn'),
    newNoteBtn: document.getElementById('newNoteBtn'),
    newFromTemplateBtn: document.getElementById('newFromTemplateBtn'),
    editorPanel: document.getElementById('editorPanel'),
    noteTitle: document.getElementById('noteTitle'),
    noteTagsContainer: document.getElementById('tags-input-area'),
    noteTagInput: document.getElementById('noteTagInput'),
    noteEditor: document.getElementById('noteEditor'),
    autocompleteContainer: document.getElementById('autocompleteContainer'),
    aiActionsContainer: document.getElementById('aiActionsContainer'),
    aiActionsBtn: document.getElementById('aiActionsBtn'),
    aiActionsMenu: document.getElementById('aiActionsMenu'),
    notePreview: document.getElementById('notePreview'),
    editModeBtn: document.getElementById('editModeBtn'),
    previewModeBtn: document.getElementById('previewModeBtn'),
    historyBtn: document.getElementById('historyBtn'),
    saveNoteBtn: document.getElementById('saveNoteBtn'),
    deleteNoteBtn: document.getElementById('deleteNoteBtn'),
    closeEditorBtn: document.getElementById('closeEditorBtn'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    searchInput: document.getElementById('searchInput'),
    toggleHeaderBtn: document.getElementById('toggleHeaderBtn'),
    aiResponseModal: document.getElementById('aiResponseModal'),
    aiResponseOutput: document.getElementById('aiResponseOutput'),
    closeAiResponseBtn: document.getElementById('closeAiResponseBtn'),
    templateModal: document.getElementById('templateModal'),
    closeTemplateModalBtn: document.getElementById('closeTemplateModalBtn'),
    templateList: document.getElementById('templateList'),
    changeThemeBtn: document.getElementById('changeThemeBtn'),
    themeModal: document.getElementById('themeModal'),
    themeModalGrid: document.getElementById('themeModalGrid'),
    closeThemeModalBtn: document.getElementById('closeThemeModalBtn'),
    customMobileSelector: document.getElementById('customMobileSelector'),
    customMobileSelectorBtn: document.getElementById('customMobileSelectorBtn'),
    customMobileSelectorDropdown: document.getElementById('customMobileSelectorDropdown'),
    fontFamilySelector: document.getElementById('fontFamilySelector'),
    fontSizeSlider: document.getElementById('fontSizeSlider'),
    fontSizeValue: document.getElementById('fontSizeValue'),
    lineHeightSlider: document.getElementById('lineHeightSlider'),
    lineHeightValue: document.getElementById('lineHeightValue'),
    saveStatus: document.getElementById('saveStatus'),
    recipeScaler: document.getElementById('recipeScaler'),
    servingsInput: document.getElementById('servingsInput'),
    servingsDecrement: document.getElementById('servingsDecrement'),
    servingsIncrement: document.getElementById('servingsIncrement'),
    cardViewBtn: document.getElementById('cardViewBtn'),
    listViewBtn: document.getElementById('listViewBtn')
};

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    checkSecurityWarning();
    loadTheme();
    loadTypography();
    loadViewMode();
    await checkAutoLogin();
    setupEventListeners();
}

function saveViewMode() {
    localStorage.setItem('chrisidian_noteViewMode', state.noteViewMode);
}

function loadViewMode() {
    const savedMode = localStorage.getItem('chrisidian_noteViewMode');
    if (savedMode) {
        state.noteViewMode = savedMode;
    }
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
    elements.newNoteBtn.addEventListener('click', () => createNewNote());
    elements.newFromTemplateBtn.addEventListener('click', openTemplateModal);
    elements.editModeBtn.addEventListener('click', () => setEditorMode('edit'));
    elements.previewModeBtn.addEventListener('click', () => setEditorMode('preview'));
    elements.historyBtn.addEventListener('click', showHistory);
    elements.saveNoteBtn.addEventListener('click', () => saveCurrentNote(true));
    elements.deleteNoteBtn.addEventListener('click', deleteCurrentNote);
    elements.closeEditorBtn.addEventListener('click', closeEditor);
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.searchInput.addEventListener('keypress', handleSearchKeyPress);
    elements.toggleHeaderBtn.addEventListener('click', toggleEditorHeader);
    elements.closeAiResponseBtn.addEventListener('click', () => elements.aiResponseModal.style.display = 'none');
    elements.changeThemeBtn.addEventListener('click', () => elements.themeModal.style.display = 'flex');
    elements.closeThemeModalBtn.addEventListener('click', () => elements.themeModal.style.display = 'none');
    elements.customMobileSelectorBtn.addEventListener('click', toggleCustomMobileSelector);
    elements.fontFamilySelector.addEventListener('change', handleFontChange);
    elements.fontSizeSlider.addEventListener('input', handleFontSizeChange);
    elements.lineHeightSlider.addEventListener('input', handleLineHeightChange);
    elements.servingsDecrement.addEventListener('click', () => updateServings(-1));
    elements.servingsIncrement.addEventListener('click', () => updateServings(1));
    elements.servingsInput.addEventListener('change', handleServingsInputChange);
    elements.noteTitle.addEventListener('input', handleNoteChange);
    elements.noteEditor.addEventListener('input', handleNoteChange);
    elements.noteEditor.addEventListener('input', handleEditorAutocomplete);
    elements.noteEditor.addEventListener('keydown', handleEditorAutocompleteKeydown);
    elements.noteEditor.addEventListener('mouseup', handleEditorSelectionChange);
    elements.noteEditor.addEventListener('keyup', handleEditorSelectionChange);
    elements.aiActionsBtn.addEventListener('mousedown', toggleAiActionsMenu);
    elements.aiActionsMenu.addEventListener('click', handleAiActionClick);
    elements.noteTagInput.addEventListener('keydown', handleTagInput);
    elements.currentFolderName.addEventListener('click', handleFolderNameClick);
    elements.notePreview.addEventListener('change', handleCheckboxChangeInPreview);

    elements.cardViewBtn.addEventListener('click', () => setViewMode('card'));
    elements.listViewBtn.addEventListener('click', () => setViewMode('list'));

    setupModalEventListeners();
    setupNoteLinkHandlers();

    document.addEventListener('click', (e) => {
        if (elements.customMobileSelector && !elements.customMobileSelector.contains(e.target)) {
            elements.customMobileSelector.classList.remove('is-open');
        }
        if (elements.aiActionsContainer && !elements.aiActionsContainer.contains(e.target)) {
            elements.aiActionsContainer.classList.remove('is-open');
        }
    });

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

    elements.templateModal.addEventListener('click', (e) => {
        if (e.target === elements.templateModal) {
            elements.templateModal.style.display = 'none';
        }
    });
    
    elements.closeTemplateModalBtn.addEventListener('click', () => {
        elements.templateModal.style.display = 'none';
    });
}

function setupNoteLinkHandlers() {
    const handleLinkClick = (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const noteId = link.dataset.noteId;
        const tagName = link.dataset.tagName;

        if (noteId) {
            e.preventDefault();
            const noteToOpen = state.notes.find(n => n.id === parseInt(noteId, 10));
            if (noteToOpen) {
                openNote(noteToOpen);
                if (e.currentTarget === elements.aiResponseModal) {
                    elements.aiResponseModal.style.display = 'none';
                }
            } else {
                showNotification(`Note with ID ${noteId} not found.`, 'error');
            }
        } else if (tagName) {
            e.preventDefault();
            selectTag(tagName);
            if (e.currentTarget === elements.aiResponseModal) {
                elements.aiResponseModal.style.display = 'none';
            }
        }
    };

    elements.aiResponseOutput.addEventListener('click', handleLinkClick);
    elements.notePreview.addEventListener('click', handleLinkClick);
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
    renderTags();
    renderThemeSwitchers();
    renderFontSelector();
    updateViewModeUI();
    testGeminiAPI();
}

function updateViewModeUI() {
    if (state.noteViewMode === 'card') {
        elements.notesList.classList.remove('list-view');
        elements.cardViewBtn.classList.add('active');
        elements.listViewBtn.classList.remove('active');
    } else { // list
        elements.notesList.classList.add('list-view');
        elements.cardViewBtn.classList.remove('active');
        elements.listViewBtn.classList.add('active');
    }
}

function setViewMode(mode) {
    state.noteViewMode = mode;
    saveViewMode();
    updateViewModeUI();
    renderNotes(null, false);
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
    if (window.innerWidth > 1024) {
        elements.mainApp.classList.toggle('editor-fullscreen');
    } else {
        elements.editorPanel.classList.toggle('header-collapsed');
    }

    const icon = elements.toggleHeaderBtn.querySelector('i');
    if (elements.editorPanel.classList.contains('header-collapsed') || elements.mainApp.classList.contains('editor-fullscreen')) {
        icon.className = 'fas fa-compress-alt';
    } else {
        icon.className = 'fas fa-expand-alt';
    }
}

function showHistory() {
    if (state.gistOwner && state.gistId) {
        const url = `https://gist.github.com/${state.gistOwner}/${state.gistId}/revisions`;
        window.open(url, '_blank');
    } else {
        showNotification('Gist history is not available yet.', 'info');
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
            state.gistOwner = existingGist.owner.login;
            const gistData = await fetch(`https://api.github.com/gists/${state.gistId}`, {
                headers: {
                    'Authorization': `token ${state.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            const data = await gistData.json();
            const mainContent = JSON.parse(data.files[APP_CONFIG.gistFilename].content);
            state.notes = mainContent.notes || [];
            state.folders = mainContent.folders || state.folders;

            let embeddings = {};
            if (data.files[APP_CONFIG.embeddingFilename]) {
                embeddings = JSON.parse(data.files[APP_CONFIG.embeddingFilename].content);
            }

            // Ensure all notes have a tags array and merge embeddings
            state.notes.forEach(note => {
                if (!note.tags) {
                    note.tags = [];
                }
                // If embeddings file exists, use it as source of truth.
                // Otherwise, legacy embeddings might be on the note object itself.
                if (embeddings[note.id]) {
                    note.embedding = embeddings[note.id];
                }
            });
            updateAllTags();
        } else {
            await saveData();
        }
        
        renderFolders();
        renderTags();
        renderNotes();
        await ensureTemplatesExist();
        updateSaveStatus('Loaded');
    } catch (error) {
        console.error('Error loading data:', error);
        updateSaveStatus('Load failed', 'error');
        showNotification(error.message, 'error');
    }
}

async function saveData() {
    try {
        const embeddingsToSave = {};
        const notesToSave = state.notes.map(note => {
            if (note.embedding && note.embedding.length > 0) {
                embeddingsToSave[note.id] = note.embedding;
            }
            // Create a new object without the embedding property
            const { embedding, ...noteWithoutEmbedding } = note;
            return noteWithoutEmbedding;
        });

        const mainData = {
            notes: notesToSave,
            folders: state.folders,
            lastUpdated: new Date().toISOString()
        };
        
        const gistData = {
            files: {
                [APP_CONFIG.gistFilename]: {
                    content: JSON.stringify(mainData, null, 2)
                },
                [APP_CONFIG.embeddingFilename]: {
                    content: JSON.stringify(embeddingsToSave, null, 2)
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
            state.gistOwner = result.owner.login;
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
    // Pre-process hashtags to convert them into a custom link format
    const preProcessedContent = markdownContent.replace(/(^|\s)#([a-zA-Z0-9\-_]+)/g, '$1[#$2](app://tag/$2)');

    let html = marked.parse(preProcessedContent, { gfm: true });
    
    // Convert custom note and tag links into usable data attributes
    html = html.replace(/href="app:\/\/note\/(\d+)"/g, 'href="#" data-note-id="$1"');
    html = html.replace(/href="app:\/\/tag\/([a-zA-Z0-9\-_]+)"/g, 'href="#" data-tag-name="$1"');

    // Allow checklists to be interactive by removing the 'disabled' attribute.
    html = html.replace(/ disabled=""/g, '');

    return DOMPurify.sanitize(html, { ADD_ATTR: ['data-note-id', 'class', 'data-tag-name'], ADD_TAGS: ['ol', 'li'] });
}

function enhanceCodeBlocks(container) {
    container.querySelectorAll('pre > code').forEach(codeBlock => {
        const pre = codeBlock.parentElement;
        if (pre.parentElement.classList.contains('code-block-wrapper')) {
            return; // Already enhanced
        }

        const codeToCopy = codeBlock.textContent;

        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        
        pre.parentNode.replaceChild(wrapper, pre);
        wrapper.appendChild(pre);

        const copyButton = document.createElement('button');
        copyButton.className = 'copy-code-btn';
        copyButton.title = 'Copy code';
        copyButton.innerHTML = '<i class="fas fa-copy"></i>';
        wrapper.appendChild(copyButton);
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(codeToCopy).then(() => {
                showNotification('Code copied to clipboard!', 'success');
            }, () => {
                showNotification('Failed to copy code.', 'error');
            });
        });

        // Use innerHTML to preserve syntax highlighting
        const linesHtml = codeBlock.innerHTML.split('\n');
        
        // If the last line is empty, it's from a trailing newline, remove it.
        if (linesHtml.length > 0 && linesHtml[linesHtml.length - 1].trim() === '') {
            linesHtml.pop();
        }

        // Don't add line numbers to empty or single-line-empty code blocks
        if (linesHtml.length === 0 || (linesHtml.length === 1 && linesHtml[0].trim() === '')) {
            return;
        }

        const ol = document.createElement('ol');
        linesHtml.forEach(lineHtml => {
            const li = document.createElement('li');
            li.innerHTML = lineHtml || '&nbsp;'; // Use non-breaking space for empty lines
            ol.appendChild(li);
        });
        
        codeBlock.innerHTML = '';
        codeBlock.appendChild(ol);
        pre.classList.add('line-numbered');
    });
}

async function processCommand() {
    const command = elements.commandInput.value.trim();
    if (!command) return;

    updateSaveStatus('Processing...', 'saving');
    let rawResponseForDebugging = '';

    try {
        const relevantNotes = await findSemanticallyRelevantNotes(command);
        console.log(`Sending ${relevantNotes.length} most relevant notes to AI for context.`);

        const masterPrompt = getMasterPrompt(command, state.folders, relevantNotes);
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
        updateSaveStatus('Processing failed', 'error');
    } finally {
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
            enhanceCodeBlocks(elements.aiResponseOutput);
            elements.aiResponseModal.style.display = 'flex';
            updateSaveStatus('Answer ready', 'success');
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
                tags: args.tags || [],
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                embedding: await callEmbeddingAPI(`${args.title}\n${args.content}`),
                servings: args.folder === 'Recipes' ? args.servings : undefined
            };
            
            state.notes.push(newNote);
            updateAllTags();
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
            if (args.newTags && Array.isArray(args.newTags)) {
                state.notes[noteIndex].tags = args.newTags;
            }
            if (state.notes[noteIndex].folder === 'Recipes' && args.servings) {
                 state.notes[noteIndex].servings = args.servings;
            }
            state.notes[noteIndex].modified = new Date().toISOString();
            state.notes[noteIndex].embedding = await callEmbeddingAPI(`${state.notes[noteIndex].title}\n${state.notes[noteIndex].content}`);

            openNote(state.notes[noteIndex]);
            updateAllTags();
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
        renderTags();
        updateSaveStatus('Saved');
    }
}

async function performSemanticSearch() {
    const query = elements.searchInput.value.trim();
    if (!query) return;

    updateSaveStatus('Searching...', 'saving');
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
        updateSaveStatus('Search complete', 'success');

    } catch (error) {
        console.error("Error during semantic search:", error);
        showNotification("Semantic search failed. Please check the console.", 'error');
        updateSaveStatus('Search failed', 'error');
        clearSemanticSearch();
    } finally {
    }
}

function clearSemanticSearch() {
    state.isSemanticSearching = false;
    elements.searchInput.value = '';
    selectFolder(state.currentFolder);
}

function renderFolders() {
    // Render desktop folder list
    elements.folderList.innerHTML = `
        <div class="folder-item ${state.currentFolder === 'All Notes' && state.activeTags.length === 0 ? 'active' : ''}" onclick="selectFolder('All Notes')">
            <span class="folder-name"><i class="fas fa-folder"></i> All Notes</span>
        </div>
    `;
    
    state.folders.sort((a, b) => a.localeCompare(b));
    state.folders.forEach(folder => {
        const folderEl = document.createElement('div');
        folderEl.className = `folder-item ${state.currentFolder === folder ? 'active' : ''}`;
        folderEl.onclick = () => selectFolder(folder);
        folderEl.dataset.folderName = folder;

        folderEl.addEventListener('dragover', handleDragOver);
        folderEl.addEventListener('dragenter', handleDragEnter);
        folderEl.addEventListener('dragleave', handleDragLeave);
        folderEl.addEventListener('drop', handleFolderDrop);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'folder-name';
        nameSpan.innerHTML = `<i class="fas fa-folder"></i> ${folder}`;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'folder-actions';

        const renameBtn = document.createElement('button');
        renameBtn.className = 'rename-folder-btn';
        renameBtn.title = `Rename folder "${folder}"`;
        renameBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
        renameBtn.onclick = (e) => { e.stopPropagation(); renameFolder(folder); };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-folder-btn';
        deleteBtn.title = `Delete folder "${folder}"`;
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.onclick = (e) => { e.stopPropagation(); deleteFolder(folder); };

        actionsDiv.appendChild(renameBtn);
        actionsDiv.appendChild(deleteBtn);
        folderEl.appendChild(nameSpan);
        folderEl.appendChild(actionsDiv);
        elements.folderList.appendChild(folderEl);
    });

    renderCustomMobileSelector();
}

function renderNotes(notesToShow = null, animate = true) {
    let notesToDisplay;

    if (notesToShow) {
        notesToDisplay = notesToShow;
    } else {
        let notesToDisplay_intermediate = state.notes;

        // Filter by folder first
        if (state.currentFolder !== 'All Notes') {
            notesToDisplay_intermediate = notesToDisplay_intermediate.filter(n => n.folder === state.currentFolder);
        }

        // Exclude templates from normal view unless we're in the Templates folder
        if (state.currentFolder !== APP_CONFIG.templateFolder) {
            notesToDisplay_intermediate = notesToDisplay_intermediate.filter(n => n.folder !== APP_CONFIG.templateFolder);
        }

        // Then filter by tags
        if (state.activeTags.length > 0) {
            notesToDisplay_intermediate = notesToDisplay_intermediate.filter(n =>
                n.tags && state.activeTags.every(tag => n.tags.includes(tag))
            );
        }
        
        notesToDisplay = notesToDisplay_intermediate;

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

    if (state.noteViewMode === 'card') {
        notesToDisplay.forEach((note, index) => {
            const noteCard = document.createElement('div');
            noteCard.className = 'note-card';
            noteCard.draggable = true;
            noteCard.dataset.noteId = note.id;
            if (!animate) {
                noteCard.classList.add('visible');
            }
            noteCard.onclick = () => openNote(note);
            noteCard.addEventListener('dragstart', handleDragStart);
            noteCard.addEventListener('dragend', handleDragEnd);
            
            const preview = note.content.substring(0, 150).replace(/[#*`]/g, '');

            const tagsHTML = (note.tags && note.tags.length > 0)
                ? `<div class="note-card-tags">${note.tags.slice().sort((a, b) => a.localeCompare(b)).map(tag => `<span class="note-card-tag">${tag}</span>`).join('')}</div>`
                : '';

            noteCard.innerHTML = `
                <h3>${note.title}</h3>
                <p>${preview}${note.content.length > 150 ? '...' : ''}</p>
                ${tagsHTML}
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
    } else { // List view
        notesToDisplay.forEach((note, index) => {
            const noteListItem = document.createElement('div');
            noteListItem.className = 'note-list-item';
            noteListItem.draggable = true;
            noteListItem.dataset.noteId = note.id;

            if (!animate) {
                noteListItem.classList.add('visible');
            }
            noteListItem.onclick = () => openNote(note);
            noteListItem.addEventListener('dragstart', handleDragStart);
            noteListItem.addEventListener('dragend', handleDragEnd);

            const tagsHTML = (note.tags && note.tags.length > 0)
                ? `<div class="note-card-tags">${note.tags.slice().sort((a, b) => a.localeCompare(b)).map(tag => `<span class="note-card-tag">${tag}</span>`).join('')}</div>`
                : '';

            const preview = note.content.substring(0, 250).replace(/[#*`]/g, '');

            noteListItem.innerHTML = `
                <div class="note-list-item-main">
                    <h3 class="note-list-item-title">${note.title}</h3>
                    <p class="note-list-item-excerpt">${preview}${note.content.length > 250 ? '...' : ''}</p>
                    ${tagsHTML}
                </div>
                <div class="note-list-item-meta">
                    <span title="Folder"><i class="fas fa-folder"></i> ${note.folder}</span>
                    <span title="Created on ${new Date(note.created).toLocaleDateString()}"><i class="fas fa-calendar-days"></i> ${formatDate(note.created)}</span>
                    <span title="Last modified on ${new Date(note.modified).toLocaleDateString()}"><i class="fas fa-clock"></i> ${formatDate(note.modified)}</span>
                </div>
            `;

            elements.notesList.appendChild(noteListItem);

            if (animate) {
                setTimeout(() => {
                    noteListItem.classList.add('visible');
                }, index * 50);
            }
        });
    }
}

function selectFolder(folder) {
    state.isSemanticSearching = false;
    state.currentFolder = folder;
    state.activeTags = [];
    elements.searchInput.value = '';
    updateNotesHeader();
    renderFolders();
    renderTags();
    renderNotes();
}

function selectTag(tag) {
    state.isSemanticSearching = false;
    
    if (tag === 'All Notes') {
        state.activeTags = [];
        state.currentFolder = 'All Notes';
    } else {
        if (state.activeTags.includes(tag)) {
            // If tag is already active, remove it to un-select.
            state.activeTags = state.activeTags.filter(t => t !== tag);
        } else {
            // Otherwise, add the tag to the active filters.
            state.activeTags.push(tag);
        }
        state.currentFolder = 'All Notes'; // Filtering by tag implies all folders.
    }
    
    elements.searchInput.value = '';
    updateNotesHeader();
    renderFolders();
    renderTags();
    renderNotes();
}

function removeTagFilter(tagToRemove) {
    state.activeTags = state.activeTags.filter(t => t !== tagToRemove);
    if (state.activeTags.length === 0) {
        state.currentFolder = 'All Notes';
    }
    updateNotesHeader();
    renderTags();
    renderNotes();
}

function updateNotesHeader() {
    elements.currentFolderName.innerHTML = ''; // Clear it first

    if (state.activeTags.length > 0) {
        const container = document.createElement('div');
        container.className = 'notes-header-tags';

        const titleSpan = document.createElement('span');
        titleSpan.textContent = 'Tags:';
        container.appendChild(titleSpan);

        state.activeTags.forEach(tag => {
            const tagPill = document.createElement('span');
            tagPill.className = 'tag-filter-name';
            
            const textNode = document.createTextNode(tag);
            tagPill.appendChild(textNode);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'tag-filter-remove-btn';
            removeBtn.innerHTML = '&times;';
            removeBtn.title = `Remove filter for ${tag}`;
            removeBtn.onclick = () => removeTagFilter(tag);
            
            tagPill.appendChild(removeBtn);
            container.appendChild(tagPill);
        });

        elements.currentFolderName.appendChild(container);
    } else {
        elements.currentFolderName.textContent = state.currentFolder;
    }
}

function updateAllTags() {
    const allTags = new Set();
    state.notes
        .filter(note => note.folder !== APP_CONFIG.templateFolder)
        .forEach(note => {
            if (note.tags) {
                note.tags.forEach(tag => allTags.add(tag));
            }
        });
    state.allTags = Array.from(allTags).sort((a, b) => a.localeCompare(b));
}

function renderTags() {
    // Clear previous content and state
    elements.tagList.innerHTML = '';
    const oldBtn = elements.tagListContainer.querySelector('.show-more-tags-btn');
    if (oldBtn) oldBtn.remove();

    // Render "All Notes" tag
    elements.tagList.innerHTML = `
        <span class="tag-item ${state.activeTags.length === 0 ? 'active' : ''}" onclick="selectTag('All Notes')">
            All Notes
        </span>
    `;

    // Render all other tags
    state.allTags.forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.className = `tag-item ${state.activeTags.includes(tag) ? 'active' : ''}`;
        tagEl.onclick = () => selectTag(tag);
        tagEl.dataset.tagName = tag;
        
        tagEl.textContent = tag;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-tag-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.title = `Delete tag "${tag}"`;
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteTag(tag);
        };
        tagEl.appendChild(deleteBtn);

        tagEl.addEventListener('dragover', handleDragOver);
        tagEl.addEventListener('dragenter', handleDragEnter);
        tagEl.addEventListener('dragleave', handleDragLeave);
        tagEl.addEventListener('drop', handleTagDrop);
        
        elements.tagList.appendChild(tagEl);
    });

    // Check height and add button if needed. This is done synchronously to prevent layout shifts.
    const MAX_HEIGHT_BEFORE_COLLAPSE = 280; // Corresponds to approx. 10 rows
    
    // Use scrollHeight to get the full potential height regardless of current collapsed state
    if (elements.tagList.scrollHeight > MAX_HEIGHT_BEFORE_COLLAPSE) {
        elements.tagList.classList.toggle('is-collapsed', !state.isTagListExpanded);
        
        const showMoreBtn = document.createElement('button');
        showMoreBtn.className = 'show-more-tags-btn';
        showMoreBtn.textContent = state.isTagListExpanded ? 'Show Fewer Tags' : 'Show All Tags';

        showMoreBtn.onclick = () => {
            state.isTagListExpanded = !state.isTagListExpanded;
            elements.tagList.classList.toggle('is-collapsed', !state.isTagListExpanded);
            showMoreBtn.textContent = state.isTagListExpanded ? 'Show Fewer Tags' : 'Show All Tags';
        };
        elements.tagListContainer.appendChild(showMoreBtn);
    } else {
        // Not overflowing, so ensure it's expanded and reset state
        elements.tagList.classList.remove('is-collapsed');
        state.isTagListExpanded = false;
    }
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
    if (oldName === 'All Notes' || oldName === APP_CONFIG.templateFolder) {
        if (oldName === APP_CONFIG.templateFolder) {
            showNotification(`The "${APP_CONFIG.templateFolder}" folder cannot be renamed.`, 'error');
        }
        return;
    }

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
    if (folderName === APP_CONFIG.templateFolder) {
        showNotification(`The "${APP_CONFIG.templateFolder}" folder cannot be deleted.`, 'error');
        return;
    }
    
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

async function deleteTag(tagName) {
    if (!confirm(`Are you sure you want to delete the tag "${tagName}"? This will remove it from all notes.`)) {
        return;
    }

    // Remove from notes
    state.notes.forEach(note => {
        if (note.tags && note.tags.includes(tagName)) {
            note.tags = note.tags.filter(t => t !== tagName);
        }
    });

    // Remove from active filters if present, and from allTags list
    state.activeTags = state.activeTags.filter(t => t !== tagName);
    state.allTags = state.allTags.filter(t => t !== tagName);

    // If the currently open note was affected, refresh its tag display
    if (state.currentNote) {
        const noteInState = state.notes.find(n => n.id === state.currentNote.id);
        if (noteInState) {
            state.currentNote = noteInState; // ensure currentNote reflects the change
            renderNoteTags();
        }
    }
    
    await saveData();
    
    updateNotesHeader();
    renderTags();
    renderNotes();
    updateSaveStatus('Tag deleted');
}

async function createNewNote(content = null, title = null, tags = [], servings = undefined) {
    const newContent = content || '# New Note\n\nStart writing...';
    const newTitle = title || 'New Note';
    
    const newEmbedding = await callEmbeddingAPI(`${newTitle}\n${newContent}`);

    const newNote = {
        id: Date.now(),
        title: newTitle,
        content: newContent,
        folder: state.currentFolder === 'All Notes' || state.currentFolder === APP_CONFIG.templateFolder ? 'Prompts' : state.currentFolder,
        tags: tags,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        embedding: newEmbedding,
        servings: servings
    };
    
    state.notes.push(newNote);
    
    try {
        await saveData();
        if (newNote.tags.length > 0) {
            updateAllTags();
            renderTags();
        }
        renderNotes();
        openNote(newNote);
        updateSaveStatus('Saved');
    } catch (error) {
        state.notes = state.notes.filter(n => n.id !== newNote.id);
        console.error('Failed to create note:', error);
        showNotification(`Failed to create note: ${error.message}`, 'error');
    }
}

function openTemplateModal() {
    const templates = state.notes.filter(n => n.folder === APP_CONFIG.templateFolder);
    elements.templateList.innerHTML = '';

    // Add Blank Note option
    const blankCard = document.createElement('div');
    blankCard.className = 'template-card';
    blankCard.innerHTML = `<i class="fas fa-file"></i><h4>Blank Note</h4>`;
    blankCard.onclick = () => {
        createNewNote();
        elements.templateModal.style.display = 'none';
    };
    elements.templateList.appendChild(blankCard);

    // Add templates
    templates.forEach(template => {
        const templateCard = document.createElement('div');
        templateCard.className = 'template-card';
        // Use a generic icon for templates for now, can be improved later
        templateCard.innerHTML = `<i class="fas fa-paste"></i><h4>${template.title}</h4>`;
        templateCard.onclick = () => {
            let newTitle = template.title.replace('Template', '').trim();
            if (newTitle === 'Meeting Minutes') {
                newTitle += ` - ${new Date().toLocaleDateString()}`;
            }
            createNewNote(template.content, newTitle, template.tags, template.servings);
            elements.templateModal.style.display = 'none';
        };
        elements.templateList.appendChild(templateCard);
    });
    
    elements.templateModal.style.display = 'flex';
}

async function ensureTemplatesExist() {
    const templateFolder = APP_CONFIG.templateFolder;
    let madeChanges = false;
    
    if (!state.folders.includes(templateFolder)) {
        state.folders.push(templateFolder);
        madeChanges = true;
    }

    const originalNoteCount = state.notes.length;
    // Remove all existing templates to ensure a clean slate
    state.notes = state.notes.filter(note => note.folder !== templateFolder);
    if (state.notes.length !== originalNoteCount) {
        madeChanges = true;
    }

    const templates = getTemplates();

    // Re-create all templates from the latest code
    for (const template of templates) {
        const newTemplateNote = {
            id: Date.now() + Math.random(), // Use random to avoid collision in loop
            title: template.title,
            content: template.content,
            folder: templateFolder,
            tags: template.tags || [],
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            embedding: await callEmbeddingAPI(`${template.title}\n${template.content}`),
            servings: template.servings
        };
        state.notes.push(newTemplateNote);
        madeChanges = true;
    }
    
    if (madeChanges) {
        updateAllTags();
        renderFolders();
        renderTags();
        await saveData();
        console.log("Templates have been synchronized with the application code.");
    }
}

function openNote(note) {
    if (state.currentNote && state.isEmbeddingStale) {
        const noteToSave = {
            id: state.currentNote.id,
            title: elements.noteTitle.value,
            content: elements.noteEditor.value,
            tags: Array.from(elements.noteTagsContainer.querySelectorAll('.tag-pill'))
                .map(pill => pill.firstChild.textContent),
            servings: state.currentNote.servings
        };
        performBackgroundSave(noteToSave);
    }

    state.currentNote = note;
    elements.historyBtn.disabled = !(state.gistOwner && state.gistId);
    elements.noteTitle.value = note.title;
    renderNoteTags();
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
    populateAiActionsMenu();
    
    elements.toggleHeaderBtn.style.display = 'flex';
    elements.closeEditorBtn.style.display = 'flex';
}

function closeEditor() {
    if (state.currentNote && state.isEmbeddingStale) {
        const noteToSave = {
            id: state.currentNote.id,
            title: elements.noteTitle.value,
            content: elements.noteEditor.value,
            tags: Array.from(elements.noteTagsContainer.querySelectorAll('.tag-pill'))
                .map(pill => pill.firstChild.textContent),
            servings: state.currentNote.servings
        };
        performBackgroundSave(noteToSave);
    }

    elements.noteTagsContainer.innerHTML = '';
    elements.noteTagInput.value = '';
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
    elements.mainApp.classList.remove('editor-fullscreen');
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
        enhanceCodeBlocks(elements.notePreview);
    }
    handleEditorSelectionChange();
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
    state.notes[noteIndex].tags = note.tags;
    state.notes[noteIndex].servings = note.servings;
    state.notes[noteIndex].modified = new Date().toISOString();

    console.log("Regenerating embedding in background for note:", note.id);
    const newEmbedding = await callEmbeddingAPI(`${note.title}\n${note.content}`);
    state.notes[noteIndex].embedding = newEmbedding;

    await saveData();
    
    updateAllTags();
    renderTags();

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
    const newTags = Array.from(elements.noteTagsContainer.querySelectorAll('.tag-pill'))
        .map(pill => pill.firstChild.textContent)
        .sort((a, b) => a.localeCompare(b));

    state.notes[noteIndex].title = newTitle;
    state.notes[noteIndex].content = newContent;
    state.notes[noteIndex].tags = newTags;
    state.notes[noteIndex].modified = new Date().toISOString();
    state.notes[noteIndex].servings = state.currentNote.servings;

    if (regenerateEmbedding) {
        console.log("Regenerating embedding on explicit save...");
        const newEmbedding = await callEmbeddingAPI(`${newTitle}\n${newContent}`);
        state.notes[noteIndex].embedding = newEmbedding;
        state.isEmbeddingStale = false;
    }

    state.originalNoteContent = newContent;
    state.currentNote = state.notes[noteIndex];

    await saveData();

    updateAllTags();
    renderTags();

    if (!state.isSemanticSearching) {
        renderNotes(null, false);
    }
    
    renderNoteTags();
    state.isNoteDirty = false;
    elements.saveNoteBtn.classList.toggle('is-dirty', state.isEmbeddingStale);
    updateSaveStatus('Saved');
}

async function deleteCurrentNote() {
    if (!state.currentNote) return;
    
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    state.notes = state.notes.filter(n => n.id !== state.currentNote.id);
    await saveData();
    updateAllTags();
    renderTags();
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
        card.innerHTML = `<div class="theme-card-swatch" style="background-image: ${gradientCss}; aspect-ratio: 1 / 1;"></div>`;
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

function toggleCustomMobileSelector() {
    elements.customMobileSelector.classList.toggle('is-open');
}

function renderCustomMobileSelector() {
    const dropdown = elements.customMobileSelectorDropdown;
    dropdown.innerHTML = ''; // Clear previous options

    // Set button text
    const btn = elements.customMobileSelectorBtn;
    if (state.activeTags.length > 0) {
        const tagsHTML = state.activeTags.map(t => `<span class="tag-item">${t}</span>`).join(' ');
        btn.innerHTML = `<span>${tagsHTML}</span><i class="fas fa-chevron-down"></i>`;
    } else {
        btn.innerHTML = `<span>${state.currentFolder}</span><i class="fas fa-chevron-down"></i>`;
    }

    // Add "All Notes" option
    const allNotesOpt = document.createElement('div');
    allNotesOpt.className = 'custom-select-option';
    allNotesOpt.innerHTML = `<i class="fas fa-folder"></i> All Notes`;
    allNotesOpt.onclick = () => { selectFolder('All Notes'); toggleCustomMobileSelector(); };
    dropdown.appendChild(allNotesOpt);
    
    // Add Folders
    if (state.folders.length > 0) {
        const folderHeader = document.createElement('div');
        folderHeader.className = 'custom-select-header';
        folderHeader.textContent = 'Folders';
        dropdown.appendChild(folderHeader);

        state.folders.forEach(folder => {
            const opt = document.createElement('div');
            opt.className = 'custom-select-option';
            opt.innerHTML = `<i class="fas fa-folder"></i> ${folder}`;
            opt.onclick = () => { selectFolder(folder); toggleCustomMobileSelector(); };
            dropdown.appendChild(opt);
        });
    }

    // Add Tags
    if (state.allTags.length > 0) {
        const tagHeader = document.createElement('div');
        tagHeader.className = 'custom-select-header';
        tagHeader.textContent = 'Tags';
        dropdown.appendChild(tagHeader);
        
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'custom-select-tags-container';
        
        state.allTags.forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'tag-item';
            tagEl.textContent = tag;
            tagEl.onclick = () => { selectTag(tag); toggleCustomMobileSelector(); };
            tagsContainer.appendChild(tagEl);
        });
        dropdown.appendChild(tagsContainer);
    }
}

let dragImage = null;

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.noteId);
    e.dataTransfer.effectAllowed = 'move';

    // Create a custom drag image. We're making it solid and simple for max browser compatibility.
    dragImage = e.target.cloneNode(true);
    dragImage.classList.remove('visible'); // remove animation classes
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-9999px';
    dragImage.style.width = `${e.target.offsetWidth}px`;
    dragImage.style.height = `${e.target.offsetHeight}px`;
    dragImage.style.pointerEvents = 'none';
    dragImage.style.margin = '0';
    dragImage.style.opacity = '1'; // Make it solid
    // Removing transform and shadow for better setDragImage compatibility
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
    
    // Defer hiding the original element slightly to ensure the browser has time
    // to snapshot it for the drag image.
    setTimeout(() => {
        e.target.classList.add('is-dragging');
    }, 1);
}

function handleDragEnd(e) {
    e.target.classList.remove('is-dragging');
    if (dragImage) {
        document.body.removeChild(dragImage);
        dragImage = null;
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    e.currentTarget.classList.add('droppable-hover');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('droppable-hover');
}

async function handleFolderDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('droppable-hover');
    
    const noteId = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const folderName = e.currentTarget.dataset.folderName;
    const noteIndex = state.notes.findIndex(n => n.id === noteId);

    if (noteIndex !== -1 && state.notes[noteIndex].folder !== folderName) {
        const oldFolderName = state.notes[noteIndex].folder;
        state.notes[noteIndex].folder = folderName;
        state.notes[noteIndex].modified = new Date().toISOString();
        
        updateSaveStatus('Moving...', 'saving');
        await saveData();
        
        // Only re-render if the current view is affected
        if (state.currentFolder === oldFolderName || state.currentFolder === 'All Notes') {
            renderNotes();
        }
        
        showNotification(`Note moved to "${folderName}"`, 'success');
        updateSaveStatus('Saved');
    }
}

async function handleTagDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('droppable-hover');

    const noteId = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const tagName = e.currentTarget.dataset.tagName;
    const noteIndex = state.notes.findIndex(n => n.id === noteId);

    if (noteIndex !== -1) {
        const note = state.notes[noteIndex];
        if (!note.tags) note.tags = [];

        if (!note.tags.includes(tagName)) {
            note.tags.push(tagName);
            note.modified = new Date().toISOString();

            updateSaveStatus('Tagging...', 'saving');
            await saveData();

            // Re-render notes list if tags are visible or if filtering by the new tag
            renderNotes(null, false); 
            
            // If the dropped-on note is open, update its tags view
            if (state.currentNote && state.currentNote.id === noteId) {
                renderNoteTags();
            }

            showNotification(`Note tagged with "#${tagName}"`, 'success');
            updateSaveStatus('Saved');
        } else {
            showNotification(`Note already has tag "#${tagName}"`);
        }
    }
}

function handleCheckboxChangeInPreview(e) {
    if (e.target.tagName !== 'INPUT' || e.target.type !== 'checkbox' || !e.target.closest('.task-list-item')) {
        return;
    }
    
    // Find the index of the checkbox that was clicked.
    const checkboxes = Array.from(elements.notePreview.querySelectorAll('.task-list-item input[type="checkbox"]'));
    const clickedIndex = checkboxes.indexOf(e.target);
    
    if (clickedIndex === -1) return;
    
    let content = elements.noteEditor.value;
    
    const taskRegex = /^- \[( |x)\]/gim;
    let matchCount = 0;
    
    const newContent = content.replace(taskRegex, (match) => {
        if (matchCount === clickedIndex) {
            matchCount++;
            return e.target.checked ? '- [x]' : '- [ ]';
        }
        matchCount++;
        return match;
    });
    
    if (content !== newContent) {
        elements.noteEditor.value = newContent;
        handleNoteChange();
    }
}

function handleTagInput(e) {
    if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const tagValue = elements.noteTagInput.value.trim().replace(/,/g, '');
        if (tagValue) {
            addTagToNote(tagValue);
            elements.noteTagInput.value = '';
        }
    }
}

function addTagToNote(tag) {
    const existingTags = Array.from(elements.noteTagsContainer.querySelectorAll('.tag-pill')).map(p => p.firstChild.textContent);
    if (existingTags.includes(tag)) {
        elements.noteTagInput.value = '';
        return;
    }

    const tagPill = document.createElement('span');
    tagPill.className = 'tag-pill';
    tagPill.textContent = tag;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'tag-pill-remove';
    removeBtn.innerHTML = '&times;';
    removeBtn.title = `Remove tag ${tag}`;
    removeBtn.onclick = () => {
        tagPill.remove();
        setDirtyState(true);
        debouncedSave();
    };

    tagPill.appendChild(removeBtn);
    elements.noteTagsContainer.appendChild(tagPill);
    setDirtyState(true);
    debouncedSave();
}

function renderNoteTags() {
    elements.noteTagsContainer.innerHTML = '';
    if (state.currentNote && state.currentNote.tags) {
        state.currentNote.tags.slice().sort((a, b) => a.localeCompare(b)).forEach(tag => {
            const tagPill = document.createElement('span');
            tagPill.className = 'tag-pill';
            tagPill.textContent = tag;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'tag-pill-remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.title = `Remove tag ${tag}`;
            removeBtn.onclick = () => {
                tagPill.remove();
                setDirtyState(true);
                debouncedSave();
            };

            tagPill.appendChild(removeBtn);
            elements.noteTagsContainer.appendChild(tagPill);
        });
    }
}

// --- Contextual AI Menu Logic ---

function toggleAiActionsMenu(e) {
    e.preventDefault(); // Prevent editor from losing focus, which would clear selection
    e.stopPropagation();
    const isOpen = elements.aiActionsContainer.classList.toggle('is-open');

    if (isOpen) {
        // Position menu below the button
        const menu = elements.aiActionsMenu;
        const btn = elements.aiActionsBtn;
        menu.style.top = `${btn.offsetHeight}px`;
        menu.style.bottom = 'auto';
    }
}

function populateAiActionsMenu() {
    elements.aiActionsMenu.innerHTML = `
        <button data-action="summarize" title="Summarize the selected text">Summarize</button>
        <button data-action="expand" title="Expand on the selected text">Expand</button>
        <button data-action="fix" title="Fix spelling and grammar">Fix Grammar</button>
        <div class="nested-dropdown">
            <button>Change Tone</button>
            <div class="nested-dropdown-content">
                <button data-action="tone" data-tone="Professional">Professional</button>
                <button data-action="tone" data-tone="Casual">Casual</button>
                <button data-action="tone" data-tone="Friendly">Friendly</button>
                <button data-action="tone" data-tone="Technical">Technical</button>
            </div>
        </div>
        <div class="menu-separator"></div>
        <button data-action="cleanup" title="Apply best practice formatting or match template">Clean Up</button>
        <button data-action="add_tags" title="Suggest and add relevant tags to this note">Add Tags</button>
        <div class="menu-separator"></div>
        <button data-action="custom" title="Give custom instructions to the AI">Custom...</button>
    `;

    // Add positioning logic for nested dropdowns
    const nestedDropdowns = elements.aiActionsMenu.querySelectorAll('.nested-dropdown');
    nestedDropdowns.forEach(dropdown => {
        dropdown.addEventListener('mouseover', (e) => {
            const content = dropdown.querySelector('.nested-dropdown-content');
            if (content) {
                const rect = content.getBoundingClientRect();
                if (rect.left < 0) {
                    // It's off-screen to the left, so flip it to the right
                    content.style.left = '100%';
                    content.style.right = 'auto';
                    content.style.marginLeft = '5px';
                } else {
                    // Reset to default styles in case it was flipped before
                    content.style.left = 'auto';
                    content.style.right = '100%';
                    content.style.marginLeft = '0';
                }
            }
        });
    });
}

function handleEditorSelectionChange() {
    // Use a small timeout to allow the browser to finalize the selection action
    setTimeout(() => {
        if (state.currentNote) {
            const isPreview = elements.previewModeBtn.classList.contains('active');
            if (isPreview) {
                elements.aiActionsBtn.disabled = false;
            } else {
                const selection = elements.noteEditor.value.substring(elements.noteEditor.selectionStart, elements.noteEditor.selectionEnd);
                elements.aiActionsBtn.disabled = selection.trim().length < 10;
            }
        } else {
            elements.aiActionsBtn.disabled = true;
        }
    }, 50);
}

function handleAiActionClick(e) {
    const button = e.target.closest('button');
    if (!button || button.parentElement.classList.contains('nested-dropdown')) return;

    const action = button.dataset.action;
    const tone = button.dataset.tone;

    if (action) {
        elements.aiActionsContainer.classList.remove('is-open');

        if (action === 'custom') {
            const customInstruction = prompt('Enter your custom instructions for the AI:');
            if (customInstruction && customInstruction.trim()) {
                performContextualAIAction(action, customInstruction.trim());
            }
        } else {
            performContextualAIAction(action, tone);
        }
    }
}

function incrementAIJobs() {
    state.activeAIJobs++;
    updateSaveStatus(`AI is working (${state.activeAIJobs})...`, 'saving');
}

function decrementAIJobs(wasSuccess, message) {
    state.activeAIJobs--;
    if (state.activeAIJobs > 0) {
        updateSaveStatus(`AI is working (${state.activeAIJobs})...`, 'saving');
    } else if (wasSuccess) {
        updateSaveStatus(message, 'success');
    } else {
        updateSaveStatus(message, 'error');
    }
}

async function performContextualAIAction(action, tone) {
    const editor = elements.noteEditor;
    const isPreview = elements.previewModeBtn.classList.contains('active');

    // --- Capture context at the moment the action is fired ---
    const noteForAction = { ...state.currentNote };
    if (!noteForAction || !noteForAction.id) return;
    const originalContent = editor.value;
    const selectionStart = editor.selectionStart;
    const selectionEnd = editor.selectionEnd;
    // --- End context capture ---

    let isFullNoteAction = false;
    if (isPreview || action === 'add_tags' || (action === 'cleanup' && selectionStart === selectionEnd)) {
        isFullNoteAction = true;
    }

    const textToProcess = isFullNoteAction 
        ? originalContent.trim() 
        : originalContent.substring(selectionStart, selectionEnd).trim();

    if (!textToProcess) return;

    incrementAIJobs();

    const noteIsRecipe = noteForAction.folder === 'Recipes';
    const noteContext = { isRecipe: noteIsRecipe };
    if (noteIsRecipe) {
        noteContext.recipeTemplate = getTemplates().find(t => t.title === 'Recipe Template').content;
    }
    if (action === 'add_tags') {
        noteContext.currentTags = noteForAction.tags || [];
        noteContext.allTags = state.allTags;
    }

    const prompt = getContextualPrompt(action, tone, textToProcess, noteContext);

    try {
        const result = await callGeminiAPI(prompt, { temperature: 0.2, maxOutputTokens: 4096 });
        if (!result || !result.candidates || result.candidates.length === 0) {
            throw new Error("AI did not return a valid response.");
        }

        const responseText = result.candidates[0].content.parts[0].text;
        const targetNoteIndex = state.notes.findIndex(n => n.id === noteForAction.id);
        if (targetNoteIndex === -1) {
            throw new Error("Note was deleted while AI was working.");
        }
        
        let successMessage = "AI action complete";
        const noteToUpdate = state.notes[targetNoteIndex];

        if (action === 'cleanup' && noteIsRecipe) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("AI did not respond with valid JSON for recipe cleanup.");
            
            const { content, servings } = JSON.parse(jsonMatch[0]);
            if (!content || !servings) throw new Error("AI response for recipe cleanup was missing 'content' or 'servings'.");

            noteToUpdate.content = content;
            noteToUpdate.servings = servings;
            successMessage = 'Recipe cleaned up';

        } else if (action === 'add_tags') {
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) throw new Error("AI did not respond with a valid JSON array for adding tags.");
            
            const suggestedTags = JSON.parse(jsonMatch[0]);
            if (!Array.isArray(suggestedTags)) throw new Error("AI response for adding tags was not a JSON array.");
            
            const currentTags = new Set(noteToUpdate.tags || []);
            suggestedTags.forEach(tag => currentTags.add(tag));
            noteToUpdate.tags = Array.from(currentTags).sort((a, b) => a.localeCompare(b));
            
            const newSystemTags = suggestedTags.filter(t => !state.allTags.includes(t));
            if (newSystemTags.length > 0) {
                updateAllTags();
                renderTags();
            }
            successMessage = 'Tags added';

        } else { // Generic text replacement
            const start = isFullNoteAction ? 0 : selectionStart;
            const end = isFullNoteAction ? originalContent.length : selectionEnd;
            noteToUpdate.content = originalContent.substring(0, start) + responseText + originalContent.substring(end);
            successMessage = 'Text updated';
        }
        
        noteToUpdate.modified = new Date().toISOString();
        noteToUpdate.embedding = await callEmbeddingAPI(`${noteToUpdate.title}\n${noteToUpdate.content}`);
        
        await saveData();

        // After a background update, refresh the notes list to reflect the new order,
        // but only if we're not in a semantic search view.
        // We do this without animation to make it less jarring.
        if (!state.isSemanticSearching) {
            renderNotes(null, false);
        }

        // Sync UI only if the note is still open in the editor
        if (state.currentNote && state.currentNote.id === noteForAction.id) {
            openNote(noteToUpdate); // Re-opening syncs the entire editor state correctly
            setEditorMode('preview'); // Default to preview to show results
        }
        
        decrementAIJobs(true, successMessage);

    } catch (error) {
        console.error(`Error performing contextual action "${action}":`, error);
        showNotification(`AI action failed: ${error.message}`, 'error');
        decrementAIJobs(false, 'AI action failed');
    }
}

// --- Autocomplete Logic ---

function getCaretCoordinates(element, position) {
    const mirrorDiv = document.getElementById('caret-mirror-div') || document.createElement('div');
    if (!mirrorDiv.id) {
        mirrorDiv.id = 'caret-mirror-div';
        document.body.appendChild(mirrorDiv);
    }
    
    const style = window.getComputedStyle(element);
    const properties = [
        'boxSizing', 'width', 'height', 'overflowX', 'overflowY', 'whiteSpace', 'wordWrap',
        'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle',
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontSizeAdjust', 'lineHeight', 'fontFamily',
    ];
    
    properties.forEach(prop => { mirrorDiv.style[prop] = style[prop]; });
    
    mirrorDiv.style.position = 'absolute';
    mirrorDiv.style.visibility = 'hidden';
    mirrorDiv.style.top = '-9999px';
    mirrorDiv.style.left = '0px';

    mirrorDiv.textContent = element.value.substring(0, position);
    
    const span = document.createElement('span');
    span.textContent = '.';
    mirrorDiv.appendChild(span);
    
    const coords = {
        top: span.offsetTop + parseInt(style.borderTopWidth),
        left: span.offsetLeft + parseInt(style.borderLeftWidth)
    };
    
    const editorRect = elements.editorPanel.getBoundingClientRect();
    const textareaRect = element.getBoundingClientRect();
    
    return {
        top: coords.top - element.scrollTop + textareaRect.top - editorRect.top,
        left: coords.left - element.scrollLeft + textareaRect.left - editorRect.left,
        height: parseInt(style.lineHeight)
    };
}


let autocompleteState = {
    active: false,
    term: '',
    startIndex: -1,
    items: [],
    activeIndex: -1,
    type: ''
};

function handleEditorAutocomplete(e) {
    const editor = e.target;
    const text = editor.value;
    const pos = editor.selectionStart;

    const textBeforeCursor = text.slice(0, pos);
    const match = textBeforeCursor.match(/#(\w*)$/);

    if (match) {
        autocompleteState.active = true;
        autocompleteState.type = '#';
        autocompleteState.term = match[1];
        autocompleteState.startIndex = match.index;

        const tagMatches = state.allTags.filter(t => t.toLowerCase().includes(autocompleteState.term.toLowerCase()));
        const noteMatches = state.notes
            .filter(n => n.folder !== APP_CONFIG.templateFolder && n.title.toLowerCase().includes(autocompleteState.term.toLowerCase()))
            .slice(0, 5); // Limit note results for performance

        autocompleteState.items = [
            ...tagMatches.map(t => ({ type: 'tag', value: t })),
            ...noteMatches.map(n => ({ type: 'note', value: n.title, id: n.id }))
        ];

        if (autocompleteState.items.length > 0) {
            renderAutocomplete();
        } else {
            hideAutocomplete();
        }
    } else {
        hideAutocomplete();
    }
}

function renderAutocomplete() {
    const container = elements.autocompleteContainer;
    container.innerHTML = '';

    autocompleteState.items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.dataset.index = index;

        if (item.type === 'tag') {
            div.innerHTML = `<span class="autocomplete-item-title">#${item.value}</span> <span class="autocomplete-item-type">Tag</span>`;
        } else {
            div.innerHTML = `<span class="autocomplete-item-title">${item.value}</span> <span class="autocomplete-item-type">Note</span>`;
        }

        div.addEventListener('click', () => {
            autocompleteState.activeIndex = index;
            insertAutocompleteSelection();
        });
        container.appendChild(div);
    });

    autocompleteState.activeIndex = 0;
    container.children[0]?.classList.add('active');

    const coords = getCaretCoordinates(elements.noteEditor, elements.noteEditor.selectionStart);
    const editorPanelRect = elements.editorPanel.getBoundingClientRect();
    
    // Temporarily show to measure its width without causing a flicker
    container.style.visibility = 'hidden';
    container.style.display = 'block';
    const containerWidth = container.offsetWidth;
    
    container.style.top = `${coords.top + coords.height}px`;
    
    // Check if the container would overflow the editor panel's width
    // 24px is an approximation for 1.5rem padding
    if (coords.left + containerWidth + 24 > editorPanelRect.width) {
        // It overflows, so align it to the right edge of the editor panel
        container.style.left = 'auto';
        container.style.right = '1.5rem';
    } else {
        // It fits, so align it to the caret's left position
        container.style.left = `${coords.left}px`;
        container.style.right = 'auto';
    }
    
    // Make it visible now that it's positioned correctly
    container.style.visibility = 'visible';
}

function hideAutocomplete() {
    autocompleteState.active = false;
    elements.autocompleteContainer.style.display = 'none';
}

function handleEditorAutocompleteKeydown(e) {
    if (!autocompleteState.active) return;

    if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
        e.preventDefault();
        
        if (e.key === 'ArrowDown') {
            navigateAutocomplete(1);
        } else if (e.key === 'ArrowUp') {
            navigateAutocomplete(-1);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            insertAutocompleteSelection();
        } else if (e.key === 'Escape') {
            hideAutocomplete();
        }
    }
}

function navigateAutocomplete(direction) {
    const items = elements.autocompleteContainer.children;
    if (items.length === 0) return;

    items[autocompleteState.activeIndex]?.classList.remove('active');
    autocompleteState.activeIndex = (autocompleteState.activeIndex + direction + items.length) % items.length;
    items[autocompleteState.activeIndex]?.classList.add('active');
    items[autocompleteState.activeIndex]?.scrollIntoView({ block: 'nearest' });
}

function insertAutocompleteSelection() {
    const selected = autocompleteState.items[autocompleteState.activeIndex];
    if (!selected) {
        hideAutocomplete();
        return;
    }

    const editor = elements.noteEditor;
    const text = editor.value;
    const end = autocompleteState.startIndex + autocompleteState.term.length + 1;
    
    let replacement;
    if (selected.type === 'tag') {
        replacement = `#${selected.value} `;
    } else { // note
        replacement = `[${selected.value}](app://note/${selected.id})`;
    }

    editor.value = text.slice(0, autocompleteState.startIndex) + replacement + text.slice(end);
    
    const newCursorPos = autocompleteState.startIndex + replacement.length;
    editor.setSelectionRange(newCursorPos, newCursorPos);

    hideAutocomplete();
    handleNoteChange(); // Trigger save
}
