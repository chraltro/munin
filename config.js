/**
 * Munin Application Configuration
 *
 * SECURITY NOTE: The passwordHash below is the default.
 * Users MUST change it before deploying. Generate a new hash:
 *   crypto.subtle.digest('SHA-256', new TextEncoder().encode('your-password'))
 *     .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join(''))
 */
const APP_CONFIG = {
    passwordHash: '7f72131af35c82819bb44f256e34419f381fdeb465b1727d153b58030fabbcb7',
    gistFilename: 'munin-notes.json',
    embeddingFilename: 'munin-notes-embeddings.json',
    embeddingModel: 'text-embedding-004',
    templateFolder: 'Templates',
    maxNoteSize: 100000,
    saveDebounceMs: 2000,
    searchDebounceMs: 300,
    notificationDurationMs: 3000,
};

const THEMES = [
    { name: 'Slate', className: 'theme-slate', gradient: ['#64748b', '#94a3b8'] },
    { name: 'Dusk', className: 'theme-dusk', gradient: ['#4f46e5', '#7c3aed'] },
    { name: 'Forest', className: 'theme-forest', gradient: ['#16a34a', '#65a30d'] },
    { name: 'Rose', className: 'theme-rose', gradient: ['#be185d', '#e11d48'] },
    { name: 'Ocean', className: 'theme-ocean', gradient: ['#0ea5e9', '#0891b2'] },
    { name: 'Amethyst', className: 'theme-amethyst', gradient: ['#9333ea', '#be185d'] },
    { name: 'Sunset', className: 'theme-sunset', gradient: ['#ea580c', '#ca8a04'] },
    { name: 'Mint', className: 'theme-mint', gradient: ['#10b981', '#16a34a'] },
    { name: 'Merlot', className: 'theme-merlot', gradient: ['#be185d', '#9d174d'] },
    { name: 'Olive', className: 'theme-olive', gradient: ['#65a30d', '#4d7c0f'] },
    { name: 'Cyber', className: 'theme-cyber', gradient: ['#0891b2', '#2563eb'] },
    { name: 'Espresso', className: 'theme-espresso', gradient: ['#a16207', '#854d0e'] },
    { name: 'Arctic', className: 'theme-arctic', gradient: ['#3b82f6', '#60a5fa'] },
    { name: 'Sandstone', className: 'theme-sandstone', gradient: ['#ca8a04', '#b45309'] },
    { name: 'Monochrome', className: 'theme-monochrome', gradient: ['#a1a1aa', '#71717a'] },
    { name: 'Bronze', className: 'theme-bronze', gradient: ['#b45309', '#92400e'] },
    { name: 'Night', className: 'theme-night', gradient: ['#8b5cf6', '#a78bfa'] },
    { name: 'Black', className: 'theme-black', gradient: ['#a3a3a3', '#d4d4d4'] },
    { name: 'White', className: 'theme-white', gradient: ['#3b82f6', '#60a5fa'] },
    { name: 'Light Grey', className: 'theme-light-grey', gradient: ['#475569', '#64748b'] },
    { name: 'Coral', className: 'theme-coral', gradient: ['#ef4444', '#f87171'] },
    { name: 'Indigo', className: 'theme-indigo', gradient: ['#6366f1', '#818cf8'] },
    { name: 'Emerald', className: 'theme-emerald', gradient: ['#10b981', '#34d399'] },
    { name: 'Gold', className: 'theme-gold', gradient: ['#f59e0b', '#fbbf24'] },
    { name: 'Sakura', className: 'theme-sakura', gradient: ['#ff8fab', '#ff5d8f'] },
    { name: 'Tangerine', className: 'theme-tangerine', gradient: ['#fdba74', '#fb923c'] },
    { name: 'Kiwi', className: 'theme-kiwi', gradient: ['#a3e635', '#84cc16'] },
    { name: 'Sky', className: 'theme-sky', gradient: ['#7dd3fc', '#38bdf8'] },
    { name: 'Lavender', className: 'theme-lavender', gradient: ['#d8b4fe', '#c084fc'] },
    { name: 'Lemonade', className: 'theme-lemonade', gradient: ['#fde047', '#bef264'] },
];

const FONTS = [
    { name: 'Inter', family: "'Inter', sans-serif" },
    { name: 'Roboto', family: "'Roboto', sans-serif" },
    { name: 'Open Sans', family: "'Open Sans', sans-serif" },
    { name: 'Lato', family: "'Lato', sans-serif" },
    { name: 'Nunito', family: "'Nunito', sans-serif" },
    { name: 'Merriweather', family: "'Merriweather', serif" },
    { name: 'Lora', family: "'Lora', serif" },
    { name: 'Source Serif Pro', family: "'Source Serif Pro', serif" },
    { name: 'Fira Code', family: "'Fira Code', monospace" },
    { name: 'JetBrains Mono', family: "'JetBrains Mono', monospace" }
];
