/**
 * Munin: One-time migration from GitHub Gist to Supabase.
 *
 * HOW TO USE:
 * 1. Open Munin in your browser and sign in with Google (new Supabase auth).
 * 2. Open the browser DevTools console (F12 → Console).
 * 3. Paste this entire script and press Enter.
 * 4. When prompted, enter your GitHub Personal Access Token.
 * 5. Wait for the migration to complete.
 *
 * The script will:
 *  - Find your munin-notes.json gist
 *  - Read notes, folders, and embeddings
 *  - Insert everything into Supabase
 */

(async function migrateFromGist() {
    'use strict';

    const GIST_FILENAME = 'munin-notes.json';
    const LEGACY_FILENAME = 'chrisidian-notes.json';
    const EMBEDDING_FILENAME = 'munin-notes-embeddings.json';
    const LEGACY_EMBEDDING = 'chrisidian-notes-embeddings.json';

    // ── 1. Get GitHub token ────────────────────────────────
    const githubToken = prompt('Enter your GitHub Personal Access Token (with gist scope):');
    if (!githubToken) { console.log('Migration cancelled.'); return; }

    // ── 2. Verify Supabase session (reuse the app's existing client) ──
    const supabase = window.__supabase;
    if (!supabase) {
        console.error('❌ Supabase client not found. Make sure Munin is fully loaded and you are signed in.');
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        console.error('❌ Not signed in to Supabase. Please sign in to Munin first, then re-run this script.');
        return;
    }

    const userId = session.user.id;
    console.log(`✓ Signed in as ${session.user.email} (${userId})`);

    // ── 3. Fetch gists ─────────────────────────────────────
    console.log('Fetching gists from GitHub...');
    const gistsResp = await fetch('https://api.github.com/gists', {
        headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!gistsResp.ok) {
        console.error('❌ GitHub API error:', gistsResp.status, await gistsResp.text());
        return;
    }

    const gists = await gistsResp.json();
    const gist = gists.find(g => g.files && (g.files[GIST_FILENAME] || g.files[LEGACY_FILENAME]));

    if (!gist) {
        console.error('❌ No Munin gist found. Looked for:', GIST_FILENAME, 'or', LEGACY_FILENAME);
        return;
    }

    console.log(`✓ Found gist: ${gist.id} (${gist.description || 'no description'})`);

    // ── 4. Fetch full gist content ─────────────────────────
    const fullResp = await fetch(`https://api.github.com/gists/${gist.id}`, {
        headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    const fullGist = await fullResp.json();
    const mainFile = fullGist.files[GIST_FILENAME] || fullGist.files[LEGACY_FILENAME];
    const mainData = JSON.parse(mainFile.content);

    const notes = mainData.notes || [];
    const folders = mainData.folders || [];

    // Load embeddings
    let embeddings = {};
    const embFile = fullGist.files[EMBEDDING_FILENAME] || fullGist.files[LEGACY_EMBEDDING];
    if (embFile) {
        embeddings = JSON.parse(embFile.content);
    }

    console.log(`✓ Found ${notes.length} notes, ${folders.length} folders, ${Object.keys(embeddings).length} embeddings`);

    // ── 5. Insert folders ──────────────────────────────────
    if (folders.length > 0) {
        console.log('Inserting folders...');
        // Clear existing folders first
        await supabase.from('folders').delete().eq('user_id', userId);

        const folderRows = folders.map((name, i) => ({
            user_id: userId,
            name,
            sort_order: i
        }));

        const { error: fErr } = await supabase.from('folders').insert(folderRows);
        if (fErr) {
            console.error('❌ Folder insert error:', fErr);
        } else {
            console.log(`✓ Inserted ${folders.length} folders`);
        }
    }

    // ── 6. Insert notes (in batches of 50) ─────────────────
    console.log('Inserting notes...');
    let successCount = 0;
    let errorCount = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < notes.length; i += BATCH_SIZE) {
        const batch = notes.slice(i, i + BATCH_SIZE);
        const rows = batch.map(note => ({
            id:          Math.floor(note.id),
            user_id:     userId,
            title:       note.title || '',
            content:     note.content || '',
            folder:      note.folder || 'Prompts',
            tags:        note.tags || [],
            servings:    note.servings ?? null,
            embedding:   embeddings[note.id] || note.embedding || null,
            created_at:  note.created || new Date().toISOString(),
            modified_at: note.modified || new Date().toISOString()
        }));

        const { error } = await supabase.from('notes').upsert(rows, { onConflict: 'id' });

        if (error) {
            console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error);
            errorCount += batch.length;
        } else {
            successCount += batch.length;
            console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} notes inserted`);
        }
    }

    // ── 7. Summary ─────────────────────────────────────────
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log(`Migration complete!`);
    console.log(`  Notes:   ${successCount} migrated, ${errorCount} errors`);
    console.log(`  Folders: ${folders.length} migrated`);
    console.log('');
    console.log('Reload the page to see your migrated data.');
    console.log('═══════════════════════════════════════');
})();
