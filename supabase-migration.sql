-- Munin: Supabase Migration
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- Prerequisite: enable pgvector extension in Dashboard > Database > Extensions

-- ============================================================
-- 1. NOTES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notes (
    id          BIGINT PRIMARY KEY,
    user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL DEFAULT '',
    content     TEXT NOT NULL DEFAULT '',
    folder      TEXT NOT NULL DEFAULT 'Prompts',
    tags        TEXT[] NOT NULL DEFAULT '{}',
    servings    INT,
    embedding   vector(768),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    modified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notes"
    ON notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
    ON notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
    ON notes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
    ON notes FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(user_id, folder);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags);

-- ============================================================
-- 2. FOLDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS folders (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0
);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own folders"
    ON folders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders"
    ON folders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
    ON folders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
    ON folders FOR DELETE
    USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_folders_user_name ON folders(user_id, name);

-- ============================================================
-- 3. USER SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
    user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    gemini_key  TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settings"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
    ON user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================
-- 4. SEMANTIC SEARCH RPC FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION match_notes(
    query_embedding vector(768),
    match_threshold FLOAT DEFAULT 0.3,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id          BIGINT,
    title       TEXT,
    content     TEXT,
    folder      TEXT,
    tags        TEXT[],
    servings    INT,
    similarity  FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.title,
        n.content,
        n.folder,
        n.tags,
        n.servings,
        1 - (n.embedding <=> query_embedding) AS similarity
    FROM notes n
    WHERE n.user_id = auth.uid()
      AND n.embedding IS NOT NULL
      AND 1 - (n.embedding <=> query_embedding) > match_threshold
    ORDER BY n.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
