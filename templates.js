function getTemplates() {
    return [
        {
            title: 'Meeting Minutes Template',
            tags: ['work', 'meeting'],
            content: `# Meeting: {{Meeting Title}}\n\n**Date:** ${new Date().toISOString().split('T')[0]}\n**Time:** \n**Location:** \n\n## Attendees\n- \n\n## Agenda\n1. \n\n## Discussion\n\n\n## Action Items\n- [ ] Task for @name due by YYYY-MM-DD\n\n## Decisions Made\n\n`
        },
        {
            title: 'Daily Journal Template',
            tags: ['personal', 'journal'],
            content: `# Daily Journal - ${new Date().toISOString().split('T')[0]}\n\n## How I'm Feeling Today\n- Rate your day (1-5): \n- Mood: \n\n## Three Things I'm Grateful For\n1. \n2. \n3. \n\n## Today's Highlights\n\n\n## Challenges & Learnings\n\n\n## Goals for Tomorrow\n- [ ] `
        },
        {
            title: 'Bug Report Template',
            tags: ['work', 'bug'],
            content: `# Bug Report: {{Brief description of bug}}\n\n**Severity:** High/Medium/Low\n**Status:** Open\n\n## Description\nA clear and concise description of what the bug is.\n\n## Steps to Reproduce\n1. Go to '...'\n2. Click on '....'\n3. Scroll down to '....'\n4. See error\n\n## Expected Behavior\nA clear and concise description of what you expected to happen.\n\n## Actual Behavior\nA clear and concise description of what actually happened.\n\n## Environment\n- **OS:** \n- **Browser:** \n- **Version:** `
        },
        {
            title: 'Recipe Template',
            tags: ['recipe'],
            content: `# {{Recipe Title}}\n\n> A short description of the recipe.\n\n**Servings:** 4\n**Prep time:** \n**Cook time:** \n\n## Ingredients\n- 1 cup Flour\n- 2 large Eggs\n\n## Instructions\n1. First step...\n2. Second step...\n`
        }
    ];
}
