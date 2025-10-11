-- 001_initial_schema.up.sql (PostgreSQL version)

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'editor', 'viewer')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_workspace_id INTEGER
);

-- Create workspaces table with integrated settings
CREATE TABLE IF NOT EXISTS workspaces (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_opened_file_path TEXT,
    -- Settings fields
    theme TEXT NOT NULL DEFAULT 'light' CHECK(theme IN ('light', 'dark')),
    auto_save BOOLEAN NOT NULL DEFAULT FALSE,
    git_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    git_url TEXT,
    git_user TEXT,
    git_token TEXT,
    git_auto_commit BOOLEAN NOT NULL DEFAULT FALSE,
    git_commit_msg_template TEXT DEFAULT '${action} ${filename}',
    git_commit_name TEXT,
    git_commit_email TEXT,
    show_hidden_files BOOLEAN NOT NULL DEFAULT FALSE,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);