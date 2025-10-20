# Munin OAuth Update Instructions

## Changes Made ✓
- ✅ Added Google Sign-In script tag to index.html
- ✅ Removed password field from login form
- ✅ Added OAuth buttons (Google + GitHub)
- ✅ Created munin-auth.js module

## Remaining Changes in script.js

### 1. Add import at top of script.js (line 1):

```javascript
import { initAuth, handleGoogleSignIn, handleGitHubConnect, retrieveKeys, saveKeys, getCurrentAuth, isAuthenticated } from './munin-auth.js';
```

**Note:** Change `<script src="script.js" defer></script>` to `<script type="module" src="script.js"></script>` in index.html (line ~317)

### 2. Update elements object (line ~60-110):

Add these new elements:
```javascript
const elements = {
    // ... existing elements ...
    googleSignInBtn: document.getElementById('googleSignInBtn'),
    githubConnectBtn: document.getElementById('githubConnectBtn'),
    showManualBtn: document.getElementById('showManualBtn'),
    manualForm: document.getElementById('manualForm'),
    oauthFlow: document.getElementById('oauthFlow'),
    loginStatus: document.getElementById('loginStatus'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    loginError: document.getElementById('loginError'),
    geminiKeyInput: document.getElementById('geminiKey'),
    // ... rest of existing elements ...
};
```

### 3. DELETE password-related code:

**Delete these lines:**
- Line 168-173: `checkSecurityWarning()` function
- Line 389-393: Password hash check in `handleLogin()`
- Line 408-413: `hashPassword()` function

**Delete from config.js:**
- Remove `passwordHash` property

### 4. REPLACE checkAutoLogin() function (line ~175-184):

```javascript
async function checkAutoLogin() {
    // Try OAuth first
    if (isAuthenticated()) {
        try {
            const keys = await retrieveKeys();
            if (keys && keys.geminiKey) {
                state.geminiKey = keys.geminiKey;
                state.githubToken = getCurrentAuth().githubToken;
                state.isAuthenticated = true;
                showMainApp();
                await loadNotesFromGist();
                return;
            }
        } catch (error) {
            console.error('Failed to retrieve synced keys:', error);
        }
    }

    // Fallback to localStorage (for existing users)
    const savedAuth = localStorage.getItem('munin_auth');
    if (savedAuth) {
        const auth = JSON.parse(savedAuth);
        state.geminiKey = auth.geminiKey;
        state.githubToken = auth.githubToken;
        state.isAuthenticated = true;
        showMainApp();
        await loadNotesFromGist();
    }
}
```

### 5. REPLACE handleLogin() function (line ~386-405):

```javascript
// DELETE the old handleLogin function entirely
```

### 6. ADD NEW OAuth handler functions (after checkAutoLogin):

```javascript
// Initialize auth on page load
async function initializeAuth() {
    await initAuth();
    setupOAuthListeners();
}

function setupOAuthListeners() {
    elements.googleSignInBtn.addEventListener('click', handleOAuthGoogleSignIn);
    elements.githubConnectBtn.addEventListener('click', handleOAuthGitHubConnect);
    elements.showManualBtn.addEventListener('click', showManualEntry);
    elements.manualForm.addEventListener('submit', handleManualSubmit);
}

async function handleOAuthGoogleSignIn() {
    try {
        elements.loadingSpinner.style.display = 'block';
        elements.oauthFlow.style.display = 'none';
        elements.loginStatus.style.display = 'block';
        elements.loginStatus.textContent = 'Signing in with Google...';
        elements.loginError.style.display = 'none';

        const user = await handleGoogleSignIn();
        elements.loginStatus.textContent = 'Google sign-in successful!';

        // Show GitHub connect button
        elements.githubConnectBtn.style.display = 'block';
        elements.loadingSpinner.style.display = 'none';
    } catch (error) {
        elements.loginError.textContent = error.message;
        elements.loginError.style.display = 'block';
        elements.loadingSpinner.style.display = 'none';
        elements.oauthFlow.style.display = 'block';
    }
}

async function handleOAuthGitHubConnect() {
    try {
        elements.loadingSpinner.style.display = 'block';
        elements.githubConnectBtn.style.display = 'none';
        elements.loginStatus.textContent = 'Connecting to GitHub...';
        elements.loginError.style.display = 'none';

        const token = await handleGitHubConnect();
        state.githubToken = token;

        elements.loginStatus.textContent = 'Retrieving synced keys...';

        // Try to retrieve synced keys
        const keys = await retrieveKeys();

        if (keys && keys.geminiKey) {
            // Keys found!
            state.geminiKey = keys.geminiKey;
            state.isAuthenticated = true;

            elements.loginStatus.textContent = 'Keys retrieved! Signing you in...';

            setTimeout(() => {
                showMainApp();
                loadNotesFromGist();
            }, 500);
        } else {
            // First time - need Gemini key
            elements.loginStatus.textContent = 'No saved keys. Please enter your Gemini API key.';
            elements.loadingSpinner.style.display = 'none';
            elements.manualForm.style.display = 'block';
        }
    } catch (error) {
        elements.loginError.textContent = error.message;
        elements.loginError.style.display = 'block';
        elements.loadingSpinner.style.display = 'none';
    }
}

async function handleManualSubmit(e) {
    e.preventDefault();
    const geminiKey = elements.geminiKeyInput.value.trim();

    if (!geminiKey) {
        elements.loginError.textContent = 'Please enter a Gemini API key';
        elements.loginError.style.display = 'block';
        return;
    }

    try {
        elements.loadingSpinner.style.display = 'block';
        elements.manualForm.style.display = 'none';
        elements.loginStatus.style.display = 'block';
        elements.loginStatus.textContent = 'Validating and saving keys...';
        elements.loginError.style.display = 'none';

        // Validate key
        const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
        if (!testResponse.ok) throw new Error('Invalid Gemini API key');

        // Save to gist (if OAuth completed)
        if (isAuthenticated()) {
            await saveKeys(geminiKey);
            elements.loginStatus.textContent = 'Keys saved and synced!';
        } else {
            // Fallback to localStorage
            localStorage.setItem('munin_auth', JSON.stringify({
                geminiKey,
                githubToken: state.githubToken
            }));
            elements.loginStatus.textContent = 'Keys saved locally';
        }

        state.geminiKey = geminiKey;
        state.isAuthenticated = true;

        setTimeout(() => {
            showMainApp();
            loadNotesFromGist();
        }, 500);
    } catch (error) {
        elements.loginError.textContent = error.message;
        elements.loginError.style.display = 'block';
        elements.loadingSpinner.style.display = 'none';
        elements.manualForm.style.display = 'block';
    }
}

function showManualEntry() {
    elements.oauthFlow.style.display = 'none';
    elements.manualForm.style.display = 'block';
}
```

### 7. UPDATE handleLogout() function (line ~415-425):

```javascript
function handleLogout() {
    // Clear OAuth tokens
    localStorage.removeItem('munin_auth');
    localStorage.removeItem('github_token');

    state.isAuthenticated = false;
    state.geminiKey = '';
    state.githubToken = '';
    elements.loginScreen.style.display = 'flex';
    elements.mainApp.style.display = 'none';
    elements.geminiKeyInput.value = '';

    // Reset OAuth flow
    elements.oauthFlow.style.display = 'block';
    elements.manualForm.style.display = 'none';
    elements.githubConnectBtn.style.display = 'none';
    elements.loginStatus.style.display = 'none';
    elements.loadingSpinner.style.display = 'none';
}
```

### 8. UPDATE DOMContentLoaded (near end of script.js):

```javascript
document.addEventListener('DOMContentLoaded', async () => {
    migrateOldLocalStorage();
    loadViewMode();
    loadTheme();
    loadTypography();
    await checkAutoLogin();  // Keep this
    await initializeAuth();  // ADD this
    // ... rest of initialization ...
});
```

### 9. UPDATE index.html script tag (line ~317):

**Change from:**
```html
<script src="script.js" defer></script>
```

**To:**
```html
<script type="module" src="script.js"></script>
```

## Testing Checklist

After making changes:

- [ ] App loads without errors
- [ ] "Sign in with Google" button appears
- [ ] Clicking Google button opens sign-in popup
- [ ] After Google auth, GitHub button appears
- [ ] Clicking GitHub opens authorization
- [ ] First time: Prompts for Gemini key
- [ ] Keys save and app initializes
- [ ] Logout and login again
- [ ] Keys auto-fill from gist
- [ ] Manual entry fallback works
- [ ] Existing localStorage users still work

## Summary of Changes

**Removed:**
- ❌ Password field
- ❌ Password hash validation
- ❌ `hashPassword()` function
- ❌ `checkSecurityWarning()` function
- ❌ `passwordHash` from config.js

**Added:**
- ✅ Google Sign-In button
- ✅ GitHub Connect button
- ✅ OAuth flow handling
- ✅ Key sync via gist
- ✅ Manual entry fallback
- ✅ munin-auth.js module

**Updated:**
- 🔄 `checkAutoLogin()` - Check OAuth first
- 🔄 `handleLogout()` - Clear OAuth tokens
- 🔄 Elements object - New OAuth elements
- 🔄 DOMContentLoaded - Initialize auth

## Need Help?

See `/shared/AUTH_SETUP.md` for OAuth configuration or `GOOGLE_AUTH_IMPLEMENTATION_GUIDE.md` for detailed examples.
