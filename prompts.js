function getMasterPrompt(command, folders, relevantNotes) {
    return `You are the intelligent engine for a note-taking app. Your task is to analyze a user's command and their most relevant notes to determine the single correct action to take.

You MUST respond with a single JSON object describing a "tool" to use and its "args".
The available tools are: "CREATE_NOTE", "UPDATE_NOTE", "DELETE_NOTE", "ANSWER_QUESTION".

Here is all the data you need:

1. User's Command:
"${command}"

2. Existing Folders:
${JSON.stringify(folders)}

3. Relevant Existing Notes (ID, Title, Tags, and Content):
${JSON.stringify(relevantNotes.map(n => ({ id: n.id, title: n.title, tags: n.tags || [], content: n.content })))}

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
   - **If the note is a RECIPE, you MUST use this template**:
     \`\`\`markdown
     # {{Recipe Title}}

     > A short description of the recipe.

     **Prep time:** {{Time}}
     **Cook time:** {{Time}}

     ## Ingredients
     - 1 cup Flour
     - 2 large Eggs

     ## Instructions
     1. First step...
     2. Second step...
     \`\`\`
   - When creating a recipe, you MUST set the 'folder' to "Recipes" and add a 'servings' argument to the JSON (e.g., \`"servings": 4\`). The ingredient lines in the markdown 'content' MUST start with a list marker and a quantity. **Do NOT include a 'Servings' line in the markdown content itself, as this is handled by the app's metadata.**
   - **args for a regular note**: { "title": "...", "content": "...", "folder": "...", "tags": ["Relevant", "Keywords"], "newFolder": true/false }
   - **args for a RECIPE**: { "title": "...", "content": "...", "folder": "Recipes", "tags": ["Recipe", "Dessert"], "servings": 4, "newFolder": false }

3. tool: "UPDATE_NOTE"
   - Use this to modify an existing note based on the 'Relevant Existing Notes'.
   - **CRITICAL**: The 'newContent' you generate MUST be the complete, well-formatted markdown for the entire note.
   - If you are updating a **RECIPE**, ensure the updated content still follows the recipe template structure and that all ingredient lines start with a quantity for scaling. **Do NOT include a 'Servings' line in the markdown content itself.**
   - **Also, when updating a recipe, you MUST include the 'servings' argument in the JSON.** You can usually find the correct number of servings in the original note's content if available, otherwise default to 4.
   - args: { "targetTitle": "Full Title of Note to Update", "newTitle": "Updated Title", "newContent": "Full new content...", "newTags": ["updated", "tags"], "servings": 4 }

4. tool: "DELETE_NOTE"
   - Use this to delete a note based on the 'Relevant Existing Notes'.
   - args: { "targetTitle": "Full Title of Note to Delete" }

---
Now, analyze all the provided data and return the single JSON object for the correct tool call. Do not include any other text or explanation.`;
}

function getContextualPrompt(action, tone, selectedText, noteContext) {
    switch (action) {
        case 'summarize':
            return `Summarize the following text in a concise paragraph:\n\n---\n${selectedText}`;
        case 'expand':
            return `Expand on the following points, providing more detail and explanation. Format the output as a continuation of the text:\n\n---\n${selectedText}`;
        case 'fix':
            return `Correct any spelling mistakes and fix grammatical errors in the following text. Only return the corrected text, without any explanation or preamble:\n\n---\n${selectedText}`;
        case 'tone':
            return `Rewrite the following text in a ${tone} tone. Only return the rewritten text, without any explanation or preamble:\n\n---\n${selectedText}`;
        case 'cleanup':
            if (noteContext.isRecipe) {
                return `You are a text formatting expert. A user has provided recipe text that needs to be cleaned up to match a template.
Your task is to reformat the text and also determine the number of servings.
You MUST respond with a single JSON object with two keys: "servings" (an integer) and "content" (the full, reformatted recipe in Markdown).
Infer the servings from the text if possible, otherwise make a sensible guess (e.g., 4).
The 'content' you generate MUST follow the provided recipe template. Ingredient lines MUST start with a list marker and a quantity.
Do NOT include a 'Servings' line in the markdown content itself.

---
USER-PROVIDED TEXT TO CLEAN UP:
${selectedText}

---
MARKDOWN RECIPE TEMPLATE TO MATCH:
${noteContext.recipeTemplate}
---

Now, provide the JSON object.`;
            } else {
                return `Clean up and format the following text using Markdown best practices (headings, lists, bolding, etc.) to improve its readability. Only return the improved text, without any explanation or preamble:\n\n---\n${selectedText}`;
            }
        default:
            return '';
    }
}
