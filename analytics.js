// Analytics module for Munin
// Provides insights and statistics about notes

/**
 * Calculate analytics for notes
 * @param {Array} notes - Array of note objects
 * @returns {Object} Analytics data
 */
export function calculateAnalytics(notes) {
    if (!notes || notes.length === 0) {
        return getEmptyAnalytics();
    }

    const analytics = {
        totalNotes: notes.length,
        totalWords: 0,
        totalCharacters: 0,
        folders: {},
        tags: {},
        recentActivity: [],
        oldestNote: null,
        newestNote: null,
        longestNote: null,
        shortestNote: null,
        averageNoteLength: 0,
        notesThisWeek: 0,
        notesThisMonth: 0,
        topTags: [],
        topFolders: [],
        activityByDay: {},
        writingStreak: 0
    };

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let oldestDate = new Date();
    let newestDate = new Date(0);
    let longestLength = 0;
    let shortestLength = Infinity;

    // Process each note
    notes.forEach(note => {
        const wordCount = countWords(note.content);
        const charCount = note.content.length;

        analytics.totalWords += wordCount;
        analytics.totalCharacters += charCount;

        // Track folders
        const folder = note.folder || 'Uncategorized';
        if (!analytics.folders[folder]) {
            analytics.folders[folder] = { count: 0, words: 0 };
        }
        analytics.folders[folder].count++;
        analytics.folders[folder].words += wordCount;

        // Track tags
        if (note.tags && Array.isArray(note.tags)) {
            note.tags.forEach(tag => {
                if (!analytics.tags[tag]) {
                    analytics.tags[tag] = 0;
                }
                analytics.tags[tag]++;
            });
        }

        // Track dates
        const created = new Date(note.created);
        const modified = new Date(note.modified);

        if (created < oldestDate) {
            oldestDate = created;
            analytics.oldestNote = note;
        }

        if (modified > newestDate) {
            newestDate = modified;
            analytics.newestNote = note;
        }

        // Track note lengths
        if (wordCount > longestLength) {
            longestLength = wordCount;
            analytics.longestNote = note;
        }

        if (wordCount < shortestLength && wordCount > 0) {
            shortestLength = wordCount;
            analytics.shortestNote = note;
        }

        // Recent activity
        if (modified >= oneWeekAgo) {
            analytics.notesThisWeek++;
        }

        if (modified >= oneMonthAgo) {
            analytics.notesThisMonth++;
        }

        // Activity by day
        const dayKey = modified.toISOString().split('T')[0];
        if (!analytics.activityByDay[dayKey]) {
            analytics.activityByDay[dayKey] = 0;
        }
        analytics.activityByDay[dayKey]++;
    });

    // Calculate averages
    analytics.averageNoteLength = Math.round(analytics.totalWords / notes.length);

    // Get top tags
    analytics.topTags = Object.entries(analytics.tags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));

    // Get top folders
    analytics.topFolders = Object.entries(analytics.folders)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([folder, data]) => ({ folder, ...data }));

    // Calculate writing streak
    analytics.writingStreak = calculateWritingStreak(analytics.activityByDay);

    // Recent activity (last 7 days)
    analytics.recentActivity = getRecentActivity(analytics.activityByDay, 7);

    return analytics;
}

/**
 * Count words in text
 * @param {string} text - Text to count
 * @returns {number} Word count
 */
function countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Get empty analytics object
 * @returns {Object} Empty analytics
 */
function getEmptyAnalytics() {
    return {
        totalNotes: 0,
        totalWords: 0,
        totalCharacters: 0,
        folders: {},
        tags: {},
        recentActivity: [],
        oldestNote: null,
        newestNote: null,
        longestNote: null,
        shortestNote: null,
        averageNoteLength: 0,
        notesThisWeek: 0,
        notesThisMonth: 0,
        topTags: [],
        topFolders: [],
        activityByDay: {},
        writingStreak: 0
    };
}

/**
 * Calculate writing streak (consecutive days with activity)
 * @param {Object} activityByDay - Activity data by day
 * @returns {number} Streak count
 */
function calculateWritingStreak(activityByDay) {
    const sortedDays = Object.keys(activityByDay).sort().reverse();
    if (sortedDays.length === 0) return 0;

    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date(today);

    // Check if there's activity today or yesterday (to be lenient)
    const yesterday = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    if (!activityByDay[today] && !activityByDay[yesterday]) {
        return 0;
    }

    // Count consecutive days
    for (let i = 0; i < 365; i++) {  // Max 365 days
        const dateKey = checkDate.toISOString().split('T')[0];
        if (activityByDay[dateKey]) {
            streak++;
            checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
        } else {
            break;
        }
    }

    return streak;
}

/**
 * Get recent activity
 * @param {Object} activityByDay - Activity data by day
 * @param {number} days - Number of days to include
 * @returns {Array} Recent activity data
 */
function getRecentActivity(activityByDay, days = 7) {
    const activity = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

        activity.push({
            date: dateKey,
            day: dayName,
            count: activityByDay[dateKey] || 0
        });
    }

    return activity;
}

/**
 * Render analytics dashboard
 * @param {HTMLElement} container - Container element
 * @param {Object} analytics - Analytics data
 */
export function renderAnalyticsDashboard(container, analytics) {
    container.innerHTML = '';

    // Overview cards
    const overviewGrid = document.createElement('div');
    overviewGrid.className = 'analytics-grid';

    const cards = [
        {
            icon: 'fa-file-alt',
            value: analytics.totalNotes,
            label: 'Total Notes'
        },
        {
            icon: 'fa-spell-check',
            value: analytics.totalWords.toLocaleString(),
            label: 'Total Words'
        },
        {
            icon: 'fa-calendar-week',
            value: analytics.notesThisWeek,
            label: 'Notes This Week'
        },
        {
            icon: 'fa-fire',
            value: analytics.writingStreak,
            label: 'Day Streak'
        },
        {
            icon: 'fa-folder',
            value: Object.keys(analytics.folders).length,
            label: 'Folders'
        },
        {
            icon: 'fa-tags',
            value: Object.keys(analytics.tags).length,
            label: 'Tags'
        }
    ];

    cards.forEach(card => {
        const cardEl = createAnalyticsCard(card);
        overviewGrid.appendChild(cardEl);
    });

    container.appendChild(overviewGrid);

    // Recent activity chart
    if (analytics.recentActivity.length > 0) {
        const activityChart = createActivityChart(analytics.recentActivity);
        container.appendChild(activityChart);
    }

    // Top folders
    if (analytics.topFolders.length > 0) {
        const foldersChart = createTopFoldersChart(analytics.topFolders);
        container.appendChild(foldersChart);
    }

    // Top tags
    if (analytics.topTags.length > 0) {
        const tagsCloud = createTagCloud(analytics.topTags);
        container.appendChild(tagsCloud);
    }

    // Note highlights
    const highlights = createNoteHighlights(analytics);
    container.appendChild(highlights);
}

/**
 * Create analytics card
 * @param {Object} data - Card data
 * @returns {HTMLElement} Card element
 */
function createAnalyticsCard(data) {
    const card = document.createElement('div');
    card.className = 'analytics-card';

    card.innerHTML = `
        <div class="analytics-card-header">
            <h4>${data.label}</h4>
            <i class="fas ${data.icon}"></i>
        </div>
        <div class="analytics-card-value">${data.value}</div>
    `;

    return card;
}

/**
 * Create activity chart
 * @param {Array} activity - Activity data
 * @returns {HTMLElement} Chart element
 */
function createActivityChart(activity) {
    const chart = document.createElement('div');
    chart.className = 'analytics-chart';

    const title = document.createElement('h4');
    title.textContent = 'Recent Activity';
    chart.appendChild(title);

    const maxCount = Math.max(...activity.map(a => a.count), 1);

    const list = document.createElement('ul');
    list.className = 'analytics-list';

    activity.forEach(day => {
        const item = document.createElement('li');
        item.className = 'analytics-list-item';

        const percentage = (day.count / maxCount) * 100;

        item.innerHTML = `
            <span class="analytics-list-item-name">${day.day}</span>
            <span class="analytics-list-item-value">${day.count}</span>
        `;

        const bar = document.createElement('div');
        bar.className = 'analytics-bar';
        const fill = document.createElement('div');
        fill.className = 'analytics-bar-fill';
        fill.style.width = `${percentage}%`;
        bar.appendChild(fill);

        item.appendChild(bar);
        list.appendChild(item);
    });

    chart.appendChild(list);
    return chart;
}

/**
 * Create top folders chart
 * @param {Array} folders - Folder data
 * @returns {HTMLElement} Chart element
 */
function createTopFoldersChart(folders) {
    const chart = document.createElement('div');
    chart.className = 'analytics-chart';

    const title = document.createElement('h4');
    title.textContent = 'Notes by Folder';
    chart.appendChild(title);

    const maxCount = Math.max(...folders.map(f => f.count), 1);

    const list = document.createElement('ul');
    list.className = 'analytics-list';

    folders.forEach(folder => {
        const item = document.createElement('li');
        item.className = 'analytics-list-item';

        const percentage = (folder.count / maxCount) * 100;

        item.innerHTML = `
            <span class="analytics-list-item-name">${folder.folder}</span>
            <span class="analytics-list-item-value">${folder.count} notes</span>
        `;

        const bar = document.createElement('div');
        bar.className = 'analytics-bar';
        const fill = document.createElement('div');
        fill.className = 'analytics-bar-fill';
        fill.style.width = `${percentage}%`;
        bar.appendChild(fill);

        item.appendChild(bar);
        list.appendChild(item);
    });

    chart.appendChild(list);
    return chart;
}

/**
 * Create tag cloud
 * @param {Array} tags - Tag data
 * @returns {HTMLElement} Tag cloud element
 */
function createTagCloud(tags) {
    const chart = document.createElement('div');
    chart.className = 'analytics-chart';

    const title = document.createElement('h4');
    title.textContent = 'Top Tags';
    chart.appendChild(title);

    const cloud = document.createElement('div');
    cloud.className = 'analytics-tag-cloud';

    tags.forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.className = 'analytics-tag-item';
        tagEl.innerHTML = `
            ${tag.tag}
            <span class="tag-count">${tag.count}</span>
        `;
        cloud.appendChild(tagEl);
    });

    chart.appendChild(cloud);
    return chart;
}

/**
 * Create note highlights section
 * @param {Object} analytics - Analytics data
 * @returns {HTMLElement} Highlights element
 */
function createNoteHighlights(analytics) {
    const chart = document.createElement('div');
    chart.className = 'analytics-chart';

    const title = document.createElement('h4');
    title.textContent = 'Note Highlights';
    chart.appendChild(title);

    const list = document.createElement('ul');
    list.className = 'analytics-list';

    const highlights = [];

    if (analytics.longestNote) {
        const wordCount = countWords(analytics.longestNote.content);
        highlights.push({
            label: 'Longest Note',
            value: `${analytics.longestNote.title} (${wordCount.toLocaleString()} words)`
        });
    }

    if (analytics.newestNote) {
        const date = new Date(analytics.newestNote.modified).toLocaleDateString();
        highlights.push({
            label: 'Most Recent',
            value: `${analytics.newestNote.title} (${date})`
        });
    }

    if (analytics.oldestNote) {
        const date = new Date(analytics.oldestNote.created).toLocaleDateString();
        highlights.push({
            label: 'Oldest Note',
            value: `${analytics.oldestNote.title} (${date})`
        });
    }

    highlights.push({
        label: 'Average Note Length',
        value: `${analytics.averageNoteLength} words`
    });

    highlights.forEach(highlight => {
        const item = document.createElement('li');
        item.className = 'analytics-list-item';
        item.innerHTML = `
            <span class="analytics-list-item-name">${highlight.label}</span>
            <span class="analytics-list-item-value">${highlight.value}</span>
        `;
        list.appendChild(item);
    });

    chart.appendChild(list);
    return chart;
}

/**
 * Export analytics as JSON
 * @param {Object} analytics - Analytics data
 * @returns {string} JSON string
 */
export function exportAnalytics(analytics) {
    return JSON.stringify({
        generatedAt: new Date().toISOString(),
        ...analytics
    }, null, 2);
}
