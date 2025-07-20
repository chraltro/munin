function getTemplates() {
    return [
        {
            title: 'Meeting Minutes Template',
            tags: ['Work', 'Meeting'],
            content: `# Meeting: {{Meeting Title}}\n\n**Date:** ${new Date().toISOString().split('T')[0]}\n**Time:** \n**Location:** \n\n## Attendees\n- \n\n## Agenda\n1. \n\n## Discussion\n\n\n## Action Items\n- [ ] Task for @name due by YYYY-MM-DD\n\n## Decisions Made\n\n`
        },
        {
            title: 'Daily Journal Template',
            tags: ['Personal', 'Journal'],
            content: `# Daily Journal - ${new Date().toISOString().split('T')[0]}\n\n## How I'm Feeling Today\n- Rate your day (1-5): \n- Mood: \n\n## Three Things I'm Grateful For\n1. \n2. \n3. \n\n## Today's Highlights\n\n\n## Challenges & Learnings\n\n\n## Goals for Tomorrow\n- [ ] `
        },
        {
            title: 'Recipe Template',
            tags: ['Recipe'],
            content: `# {{Recipe Title}}\n\n> A short description of the recipe.\n\n**Prep time:** \n**Cook time:** \n\n## Ingredients\n- 1 cup Flour\n- 2 large Eggs\n\n## Instructions\n1. First step...\n2. Second step...\n`
        }
    ];
}
