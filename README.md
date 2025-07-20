# Chrisidian - AI-Powered Notes App

A smart, markdown-based note-taking app with AI categorization powered by Google Gemini Flash 2.5. Host it on GitHub Pages and access your notes from anywhere!

## Features

- 🤖 **AI-Powered Organization**: Natural language commands like "save this recipe" automatically categorize notes
- 📝 **Markdown Support**: Full markdown editing with live preview
- 📁 **Smart Folders**: Auto-organizing with AI-suggested folders
- 🔒 **Password Protected**: Secure access with auto-login after first sign-in
- ☁️ **Cloud Storage**: Notes stored in GitHub Gists
- 📱 **Responsive**: Works on desktop and mobile
- 🌙 **Dark Theme**: Easy on the eyes

## Quick Setup (5 minutes)

### 1. Get Your API Keys

#### Google Gemini API Key:
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key - you'll need it for login

#### GitHub Personal Access Token:
1. Go to GitHub → Settings → Developer settings → [Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Name it "Chrisidian Notes"
4. Select scope: `gist` (create gists)
5. Generate and copy the token

### 2. Deploy to GitHub Pages

1. Create a new GitHub repository named `chrisidian` (or any name you prefer)
2. Upload these files:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `README.md`

3. Enable GitHub Pages:
   - Go to Settings → Pages
   - Source: Deploy from a branch
   - Branch: main (or master)
   - Folder: / (root)
   - Save

4. Your app will be live at: `https://[your-username].github.io/chrisidian/`

### 3. First Login

1. Visit your deployed app
2. Enter:
   - **Password**: `chrisidian2024` (change this in script.js line 5!)
   - **Gemini API Key**: Your key from step 1
   - **GitHub Token**: Your token from step 1

The app will remember your credentials for auto-login (stored locally, not in the cloud).

## Usage

### Natural Language Commands

Type commands in the input bar:
- `"Save this recipe: Chocolate chip cookies - Mix flour, sugar..."`
- `"Save this idea: App that tracks mood with colors"`
- `"Store this meeting note: Q1 planning - Discussed roadmap..."`
- `"Remember this: Buy groceries - milk, eggs, bread"`

The AI will:
- Extract the content
- Generate an appropriate title
- Choose or create the best folder
- Format it in markdown

### Manual Operations

- **New Note**: Click the + button in the notes area
- **New Folder**: Click the folder+ button in the sidebar
- **Edit Note**: Click any note to open the editor
- **Switch Modes**: Toggle between Edit and Preview
- **Delete Note**: Use the trash button in the editor

### Keyboard Shortcuts

- `Enter` in command input: Process command
- `Ctrl/Cmd + S` in editor: Save note (when implemented)

## Customization

### Change Password
Edit `script.js` line 5:
```javascript
password: 'your-secure-password-here'
```

### Add Default Folders
Edit `script.js` line 13:
```javascript
folders: ['Ideas', 'Recipes', 'Work', 'Personal', 'Your-Folder']
```

### Styling
Modify `styles.css` - uses CSS variables for easy theming:
```css
:root {
    --primary: #6366f1;  /* Main accent color */
    --bg-primary: #0f172a;  /* Background color */
    /* etc... */
}
```

## Data Storage

- **Notes**: Stored in a private GitHub Gist (JSON format)
- **Credentials**: Stored in browser localStorage (never uploaded)
- **Automatic Backup**: Every save updates the GitHub Gist

### Backup Your Data

1. Go to [gist.github.com](https://gist.github.com)
2. Find "chrisidian-notes.json"
3. Download or clone for backup

### Import/Export (Future Feature)

The JSON structure makes it easy to export/import data in future updates.

## Security Notes

- Change the default password immediately
- API keys are stored locally in your browser
- Notes are private (GitHub Gist is set to secret)
- Use HTTPS when deploying
- Don't share your deployed URL if you want to keep notes private

## Troubleshooting

### "Error loading data"
- Check your GitHub token has `gist` scope
- Ensure token hasn't expired

### "Error processing command"
- Verify Gemini API key is correct
- Check API quota at Google AI Studio

### Notes not saving
- Check browser console for errors
- Verify GitHub token permissions

### Can't see folders on mobile
- Folders are hidden on mobile for space
- Select "All Notes" to see everything

## Future Enhancements

- [ ] Search functionality
- [ ] Tags system
- [ ] Image attachments
- [ ] Collaborative sharing
- [ ] Export to various formats
- [ ] Keyboard shortcuts
- [ ] Offline mode with sync
- [ ] Voice input
- [ ] Multiple themes

## License

MIT License - feel free to modify and use!

## Credits

Built with:
- Google Gemini Flash 2.5 for AI
- GitHub Gists for storage
- Marked.js for markdown
- DOMPurify for security
- Font Awesome for icons

---

Made with 🧠 by Chrisidian