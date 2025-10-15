# Munin - AI-Powered Notes App



Munin is a smart, self-hosted, and private note-taking application that leverages AI to automatically organize your thoughts. Built with a focus on simplicity and privacy, it uses natural language to create, title, and file your notes into appropriate folders. Your data is stored securely in a private GitHub Gist, giving you full ownership and control.

## About The Project

In a world of complex, subscription-based note apps, Munin offers a return to simplicity and ownership. It's a single `index.html` file that you can host for free on GitHub Pages. The core idea is to remove the friction of note-taking: instead of thinking about titles, tags, and folders, you just write. The AI backend handles the organization for you.

This project is perfect for developers, writers, and anyone who wants a fast, intelligent, and private scratchpad for their ideas, accessible from any browser.

### Built With

*   [Google Gemini API](https://ai.google.dev/) - For natural language understanding and note organization.
*   [GitHub Gists](https://gist.github.com/) - As a private, version-controlled database.
*   [Marked.js](https://marked.js.org/) - For Markdown to HTML conversion.
*   [DOMPurify](https://github.com/cure53/DOMPurify) - For XSS sanitization and security.
*   [Font Awesome](https://fontawesome.com/) - For icons.
*   Vanilla JavaScript, HTML, and CSS - No frameworks, no build steps.

## Features

-   🤖 **AI-Powered Commands**: Use natural language to create and organize notes (e.g., `"Save this recipe for cookies..."`).
-   📝 **Full Markdown Support**: Write in Markdown with a live preview mode.
-   ☁️ **Private Cloud Storage**: All notes are stored in a private, secret GitHub Gist that only you can access.
-   🔒 **Secure & Private**: API keys are stored only in your browser's local storage. Your notes are never shared with third parties.
-   🎨 **Theming**: Multiple built-in color themes to customize the look and feel.
-   📱 **Responsive Design**: Works on both desktop and mobile browsers.
-   🚀 **Zero-Config Deployment**: Host it for free on GitHub Pages with no server or database setup required.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

You will need to obtain API keys from the following services:

1.  **Google Gemini API Key**
    *   Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and create a new API key.
2.  **GitHub Personal Access Token**
    *   Go to GitHub → Settings → Developer settings → [Personal access tokens](https://github.com/settings/tokens).
    *   Generate a **classic** token with the `gist` scope enabled. This is required for the app to read and write to its database.

### Deployment

The easiest way to use Chrisidian is to deploy it to GitHub Pages.

1.  **Fork this repository** to your own GitHub account.
2.  Go to your new repository's **Settings** tab.
3.  Navigate to the **Pages** section.
4.  Under "Build and deployment", select the source as **Deploy from a branch**.
5.  Choose the `main` branch and the `/ (root)` folder. Click **Save**.
6.  Your app will be live in a few minutes at `https://<Your-Username>.github.io/<repository-name>/`.

### Configuration

1.  **First-time Login**: Open your deployed app URL. You will be prompted for:
    *   **Password**: The default is `chrisidian2024`.
    *   **Gemini API Key**: The key you generated.
    *   **GitHub Token**: The token you generated.
2.  **Change the Password (Important!)**: For security, you must change the default password.
    *   Open the **Developer Console** in your browser (usually `F12` or `Ctrl+Shift+I`).
    *   Paste and run the following command, replacing `'your-new-password'` with your actual desired password:
        ```javascript
        (async () => { const msgUint8 = new TextEncoder().encode('your-new-password'); const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8); const hashArray = Array.from(new Uint8Array(hashBuffer)); const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); console.log(hashHex); })();
        ```
    *   The console will output a long string (a SHA-256 hash). Copy this hash.
    *   In your repository, edit the `script.js` file. On line 2, replace the value of `passwordHash` with the new hash you copied.
    *   Commit the change. Your password is now updated.

## Roadmap

-   [ ] Full-text search for all notes.
-   [ ] Support for tags in addition to folders.
-   [ ] Offline mode with PWA capabilities.
-   [ ] Voice-to-text input for commands.
-   [ ] Data import/export functionality.

See the [open issues](https://github.com/chrisidian/chrisidian/issues) for a full list of proposed features (and known issues).

## License

Distributed under the MIT License. See `LICENSE` for more information.
