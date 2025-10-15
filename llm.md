# AI Developer's Guide to the Munin Note-Taking App

**Objective:** This document is your primary guide. Read it carefully and completely before analyzing or modifying any other file. It provides the essential context for understanding the project's architecture, features, and conventions.

---

## 1. Project Overview

This is a sophisticated, single-page note-taking application designed to feel like a local-first app but with a powerful cloud backend. Its core feature is its deep integration with AI for both command-based actions and contextual content manipulation.

- **Core Philosophy:** AI-native interaction, clean UI, and data ownership via GitHub Gists.
- **Technology Stack:** It is a vanilla JavaScript application with no front-end frameworks. It relies on browser APIs, the GitHub Gist API, and the Google Gemini API.

---

## 2. File Architecture

The project is structured with a clear separation of concerns. Understanding these files is key to making effective changes.

- **`index.html`**: The application's single HTML entry point. It defines the entire DOM structure, including all screens, modals, buttons, and panels. *Modify this file to change the UI layout or add/remove static elements.*

- **`styles.css`**: Contains all CSS for the application. This includes layout, typography, themes, and animations. *Modify this file for any visual or styling changes.*

- **`script.js`**: **This is the brain of the application.** It contains the vast majority of the client-side logic.
  - **`state` object**: A global object at the top of the file that holds the entire application's runtime state (notes, folders, tags, authentication status, etc.).
  - **Event Handling**: Contains all `addEventListener` calls and handler functions (e.g., `handleLogin`, `processCommand`, `openNote`).
  - **API Calls**: Manages communication with the GitHub Gist API (`saveData`, `loadData`) and the Google Gemini API (`callGeminiAPI`, `callEmbeddingAPI`).
  - **DOM Manipulation & Rendering**: Contains functions like `renderNotes`, `renderFolders`, and `renderTags` that update the UI based on the current `state`.
  - **Core Feature Logic**: Implements all major features like search, editor functionality, recipe scaling, and AI actions.

- **`prompts.js`**: This file isolates all complex AI prompt engineering from the main application logic.
  - **`getMasterPrompt`**: Creates the detailed system prompt for the main command bar. It instructs the AI to act as a "tool user" and respond with structured JSON.
  - **`getContextualPrompt`**: Creates the specific prompts for the contextual AI menu in the editor (e.g., "Summarize", "Clean Up", "Add Tags").

- **`config.js`**: A simple file for static configuration variables that are unlikely to change often. This includes the app's password hash, the filenames used in the Gist, and the name of the special "Templates" folder. Treat this as read-only.

- **`templates.js`**: Defines the content for default note templates (e.g., Recipe Template, Meeting Minutes). *Modify this file to change or add new note templates.*

---

## 3. Data Flow and State Management

- **Storage Backend:** The application does not use a traditional database. Instead, all user data is stored in a single, private **GitHub Gist**.
  - `data.json`: Contains an object with `notes`, `folders`, and `lastUpdated` timestamp. The `notes` array holds all note objects (excluding their vector embeddings).
  - `embeddings.json`: Contains a JSON object mapping note IDs to their corresponding vector embeddings for semantic search.
- **State Management:** All application state is managed within the `state` object in `script.js`. When the app loads, it fetches data from the Gist and populates this `state` object. UI elements are rendered based on this object.
- **Saving Data:** Changes to notes are automatically saved after a 2-second debounce (`debouncedSave`). Major actions trigger an immediate save. Saving involves:
  1. Updating the `state` object.
  2. Calling `saveData()`, which sends the updated notes and embeddings to the GitHub Gist API via a `PATCH` or `POST` request.

---

## 4. AI Integration

The app features two primary AI interaction points:

### A. The AI Command Bar

This is the main driver for creating and managing content via natural language.
1.  **User Input**: The user types a command (e.g., "create a note about my new project").
2.  **Semantic Search**: `findSemanticallyRelevantNotes` is called. It generates an embedding for the user's command and performs a cosine similarity search against the embeddings of all existing notes to find the most relevant context.
3.  **Prompt Generation**: `getMasterPrompt` in `prompts.js` constructs a detailed prompt that includes the user's command and the full content of the relevant notes found in the previous step.
4.  **AI Tool Use**: The prompt instructs Gemini to act as a tool-using agent and return a single JSON object specifying a `tool` to use (`CREATE_NOTE`, `UPDATE_NOTE`, `DELETE_NOTE`, or `ANSWER_QUESTION`) and the `args` for that tool.
5.  **Execution**: `executeAITool` in `script.js` receives this JSON, validates it, and executes the corresponding function, updating the application state and saving the result.

### B. Contextual AI Menu

This menu appears in the note editor and operates on selected text or the entire note.
1.  **User Action**: The user selects text and chooses an action (e.g., "Fix Grammar").
2.  **Action Trigger**: `handleAiActionClick` calls `performContextualAIAction`.
3.  **Prompt Generation**: `getContextualPrompt` in `prompts.js` generates a highly specific, task-oriented prompt.
4.  **AI Execution**: The prompt is sent to Gemini. The response (either plain text or JSON for complex tasks like recipe cleanup) is then used to directly modify the text in the editor or update note metadata (like tags or servings).

---

## 5. How to Approach Changes: Your Workflow

- **To change the UI structure (HTML):** Edit `index.html`.
- **To change styles, colors, or themes:** Edit `styles.css`.
- **To add/fix behavior, event handling, or core logic:** This will almost certainly be in **`script.js`**. Identify the relevant function (e.g., `openNote`, `handleTagInput`) and make your changes there.
- **To modify AI behavior or instructions:** Edit the prompt-generating functions in **`prompts.js`**. This is where you can fine-tune how the AI responds to commands and actions.
- **To add a new note template:** Add a new object to the array in `templates.js`.
- **When adding new features:** Follow the existing patterns. Use the global `state` object, create dedicated handler functions, and use helpers like `updateSaveStatus` and `showNotification` for user feedback.
