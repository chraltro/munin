# Munin - Knowledge Base

A note-taking application with natural language processing for automatic organization. Uses private GitHub Gists for storage and supports full Markdown with live preview.

**Munin** (Old Norse: Odin's raven of memory and mind)

## Features

- Natural language commands for note creation and organization
- Automatic note titling and folder categorization
- Full Markdown support with live preview mode
- Private GitHub Gist storage with version control
- Multiple theme options
- Responsive design for desktop and mobile
- Local credential storage (browser-only)
- Zero-config deployment via GitHub Pages

## Prerequisites

- [Google Gemini API key](https://aistudio.google.com/app/apikey)
- [GitHub Personal Access Token](https://github.com/settings/tokens) (classic, with `gist` scope)

## Deployment

1. Fork this repository to your GitHub account
2. Navigate to Settings → Pages
3. Configure source as "Deploy from a branch"
4. Select `main` branch and `/ (root)` folder
5. Save and wait for deployment

Your app will be live at `https://<username>.github.io/<repository-name>/`

## Initial Configuration

On first launch, you'll be prompted for:
- **Password**: Default is `chrisidian2024` (must be changed)
- **Gemini API Key**: From Google AI Studio
- **GitHub Token**: From GitHub settings

### Changing the Default Password

**IMPORTANT:** Change the default password immediately after deployment.

1. Open browser Developer Console (`F12` or `Ctrl+Shift+I`)
2. Run this command with your new password:
```javascript
(async () => {
  const msgUint8 = new TextEncoder().encode('your-new-password');
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  console.log(hashHex);
})();
```
3. Copy the output hash
4. Edit `script.js` line 2, replace `passwordHash` value with your hash
5. Commit the change

## How It Works

Write notes using natural language commands like "Save this recipe for cookies..." and the application parses your intent to automatically generate a title and organize it into the appropriate folder. All notes are stored in a private GitHub Gist, providing version control and cross-device access.

### Data Storage

- **Credentials:** Browser `localStorage` (local only)
- **Notes:** Private GitHub Gist (user-controlled)
- **Processing:** Direct Gemini API calls for NLP

### Architecture

Built with vanilla JavaScript as a single-page application. The core is a single `index.html` file with embedded JavaScript and CSS. No build process or framework dependencies.

## Tech Stack

- Vanilla JavaScript
- HTML/CSS
- Gemini API (natural language understanding)
- GitHub Gists API
- Marked.js (Markdown parsing)
- DOMPurify (XSS sanitization)
- Font Awesome (icons)

## License

MIT
