/**
 * VibeCI Backend - Database Layer
 * SQLite database for state and thought signatures
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import type { Task, ThoughtSignature, Artifact, TaskEvent, TaskStatus } from '../types/index.js';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'vibeci.db');
const db = new Database(dbPath);

// Initialize database schema
function initDatabase(): void {
    db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      repo_path TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      current_iteration INTEGER NOT NULL DEFAULT 0,
      max_iterations INTEGER NOT NULL DEFAULT 3,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      workspace_path TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS thought_signatures (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      iteration INTEGER NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL,
      artifacts TEXT NOT NULL DEFAULT '[]',
      timestamp TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS task_events (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_thought_signatures_task ON thought_signatures(task_id);
    CREATE INDEX IF NOT EXISTS idx_artifacts_task ON artifacts(task_id);
    CREATE INDEX IF NOT EXISTS idx_events_task ON task_events(task_id);
  `);
}

// Initialize on module load
initDatabase();

// Task operations
export function createTask(description: string, repoPath: string, maxIterations = 3): Task {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
    INSERT INTO tasks (id, description, repo_path, status, current_iteration, max_iterations, created_at, updated_at)
    VALUES (?, ?, ?, 'pending', 0, ?, ?, ?)
  `);

    stmt.run(id, description, repoPath, maxIterations, now, now);

    return {
        id,
        description,
        repoPath,
        status: 'pending',
        currentIteration: 0,
        maxIterations,
        createdAt: now,
        updatedAt: now,
    };
}

export function getTask(id: string): Task | undefined {
    const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;

    if (!row) return undefined;

    return {
        id: row.id as string,
        description: row.description as string,
        repoPath: row.repo_path as string,
        status: row.status as TaskStatus,
        currentIteration: row.current_iteration as number,
        maxIterations: row.max_iterations as number,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        completedAt: row.completed_at as string | undefined,
        workspacePath: row.workspace_path as string | undefined,
    };
}

export function getAllTasks(): Task[] {
    const stmt = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC');
    const rows = stmt.all() as Record<string, unknown>[];

    return rows.map(row => ({
        id: row.id as string,
        description: row.description as string,
        repoPath: row.repo_path as string,
        status: row.status as TaskStatus,
        currentIteration: row.current_iteration as number,
        maxIterations: row.max_iterations as number,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        completedAt: row.completed_at as string | undefined,
        workspacePath: row.workspace_path as string | undefined,
    }));
}

export function updateTaskStatus(id: string, status: TaskStatus, iteration?: number): void {
    const now = new Date().toISOString();
    const completedAt = status === 'completed' || status === 'failed' ? now : null;

    if (iteration !== undefined) {
        const stmt = db.prepare(`
      UPDATE tasks SET status = ?, current_iteration = ?, updated_at = ?, completed_at = COALESCE(?, completed_at)
      WHERE id = ?
    `);
        stmt.run(status, iteration, now, completedAt, id);
    } else {
        const stmt = db.prepare(`
      UPDATE tasks SET status = ?, updated_at = ?, completed_at = COALESCE(?, completed_at)
      WHERE id = ?
    `);
        stmt.run(status, now, completedAt, id);
    }
}

export function updateTaskWorkspacePath(id: string, workspacePath: string): void {
    const stmt = db.prepare(`
      UPDATE tasks SET workspace_path = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(workspacePath, new Date().toISOString(), id);
}

// Thought Signature operations
export function createThoughtSignature(
    taskId: string,
    iteration: number,
    summary: string,
    status: TaskStatus,
    artifacts: string[] = []
): ThoughtSignature {
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    const stmt = db.prepare(`
    INSERT INTO thought_signatures (id, task_id, iteration, summary, status, artifacts, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

    stmt.run(id, taskId, iteration, summary, status, JSON.stringify(artifacts), timestamp);

    return { id, taskId, iteration, summary, status, artifacts, timestamp };
}

export function getThoughtSignatures(taskId: string): ThoughtSignature[] {
    const stmt = db.prepare('SELECT * FROM thought_signatures WHERE task_id = ? ORDER BY iteration');
    const rows = stmt.all(taskId) as Record<string, unknown>[];

    return rows.map(row => ({
        id: row.id as string,
        taskId: row.task_id as string,
        iteration: row.iteration as number,
        summary: row.summary as string,
        status: row.status as TaskStatus,
        artifacts: JSON.parse(row.artifacts as string) as string[],
        timestamp: row.timestamp as string,
    }));
}

// Artifact operations
export function createArtifact(
    taskId: string,
    type: 'log' | 'diff' | 'screenshot' | 'report',
    name: string,
    filePath: string
): Artifact {
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
    INSERT INTO artifacts (id, task_id, type, name, path, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

    stmt.run(id, taskId, type, name, filePath, createdAt);

    return { id, taskId, type, name, path: filePath, createdAt };
}

export function getArtifacts(taskId: string): Artifact[] {
    const stmt = db.prepare('SELECT * FROM artifacts WHERE task_id = ? ORDER BY created_at');
    const rows = stmt.all(taskId) as Record<string, unknown>[];

    return rows.map(row => ({
        id: row.id as string,
        taskId: row.task_id as string,
        type: row.type as 'log' | 'diff' | 'screenshot' | 'report',
        name: row.name as string,
        path: row.path as string,
        createdAt: row.created_at as string,
    }));
}

// Task Event operations
export function createTaskEvent(
    taskId: string,
    type: string,
    message: string,
    data?: unknown
): TaskEvent {
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    const stmt = db.prepare(`
    INSERT INTO task_events (id, task_id, type, message, data, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

    stmt.run(id, taskId, type, message, data ? JSON.stringify(data) : null, timestamp);

    return { id, taskId, type, message, data, timestamp };
}

export function getTaskEvents(taskId: string): TaskEvent[] {
    const stmt = db.prepare('SELECT * FROM task_events WHERE task_id = ? ORDER BY timestamp');
    const rows = stmt.all(taskId) as Record<string, unknown>[];

    return rows.map(row => ({
        id: row.id as string,
        taskId: row.task_id as string,
        type: row.type as string,
        message: row.message as string,
        data: row.data ? JSON.parse(row.data as string) : undefined,
        timestamp: row.timestamp as string,
    }));
}

export { db };
