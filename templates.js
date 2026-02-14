/**
 * Returns the list of available note templates.
 * Each template provides a pre-filled structure for common note types.
 * @returns {Array<{title: string, tags: string[], content: string, servings?: number}>}
 */
function getTemplates() {
    const today = new Date().toISOString().split('T')[0];

    return [
        {
            title: 'Meeting Minutes Template',
            tags: ['Work', 'Meeting'],
            content: `# Meeting: {{Meeting Title}}\n\n**Date:** ${today}\n**Time:** \n**Location:** \n\n## Attendees\n- \n\n## Agenda\n1. \n\n## Discussion\n\n\n## Action Items\n- [ ] Task for @name due by YYYY-MM-DD\n\n## Decisions Made\n\n`
        },
        {
            title: 'Daily Journal Template',
            tags: ['Personal', 'Journal'],
            content: `# Daily Journal - ${today}\n\n## How I'm Feeling Today\n- Rate your day (1-5): \n- Mood: \n\n## Three Things I'm Grateful For\n1. \n2. \n3. \n\n## Today's Highlights\n\n\n## Challenges & Learnings\n\n\n## Goals for Tomorrow\n- [ ] `
        },
        {
            title: 'Recipe Template',
            tags: ['Recipe'],
            servings: 4,
            content: `# {{Recipe Title}}\n\n> A short description of the recipe.\n\n**Prep time:** \n**Cook time:** \n\n## Ingredients\n- 1 cup Flour\n- 2 large Eggs\n\n## Instructions\n1. First step...\n2. Second step...\n`
        },
        {
            title: 'Project Brief Template',
            tags: ['Work', 'Project'],
            content: `# {{Project Name}}\n\n## Overview\nBrief description of the project and its goals.\n\n## Objectives\n- [ ] Objective 1\n- [ ] Objective 2\n\n## Key Stakeholders\n- **Owner:** \n- **Team:** \n\n## Timeline\n- **Start:** ${today}\n- **Milestones:** \n- **Deadline:** \n\n## Resources\n\n\n## Notes\n\n`
        },
        {
            title: 'Book Notes Template',
            tags: ['Personal', 'Reading'],
            content: `# {{Book Title}}\n\n**Author:** \n**Genre:** \n**Started:** ${today}\n**Finished:** \n**Rating:** /5\n\n## Summary\n\n\n## Key Takeaways\n1. \n2. \n3. \n\n## Favorite Quotes\n> \n\n## How It Changed My Thinking\n\n`
        },
    ];
}
