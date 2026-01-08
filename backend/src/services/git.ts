/**
 * VibeCI Backend - Git Service
 * Repository cloning, patching, and commit automation
 */

import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { RepoSummary, FileSummary } from '../types/index.js';

// Working directory for repo snapshots
const workDir = path.join(process.cwd(), 'workspaces');

// Ensure work directory exists
if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir, { recursive: true });
}

/**
 * Clone or copy a repository to a workspace
 */
export async function createSnapshot(repoPath: string): Promise<{ path: string; git: SimpleGit }> {
    const snapshotId = uuidv4();
    const snapshotPath = path.join(workDir, snapshotId);

    // Check if it's a git repo URL or local path
    if (repoPath.startsWith('http') || repoPath.startsWith('git@')) {
        // Clone remote repo
        const git = simpleGit();
        await git.clone(repoPath, snapshotPath);
        return { path: snapshotPath, git: simpleGit(snapshotPath) };
    } else {
        // Copy local directory
        await copyDirectory(repoPath, snapshotPath);

        const git = simpleGit(snapshotPath);

        // Initialize git if not already a repo
        const isRepo = fs.existsSync(path.join(snapshotPath, '.git'));
        if (!isRepo) {
            await git.init();
            await git.add('.');
            await git.commit('Initial commit');
        }

        return { path: snapshotPath, git };
    }
}

/**
 * Copy directory recursively
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
    fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        // Skip node_modules and .git
        if (entry.name === 'node_modules' || entry.name === '.git') {
            continue;
        }

        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Get file language based on extension
 */
function getLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const langMap: Record<string, string> = {
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.py': 'python',
        '.json': 'json',
        '.md': 'markdown',
        '.css': 'css',
        '.html': 'html',
        '.yaml': 'yaml',
        '.yml': 'yaml',
    };
    return langMap[ext] || 'text';
}

/**
 * Summarize repository contents
 */
export function summarizeRepo(repoPath: string): RepoSummary {
    const files: FileSummary[] = [];
    const testFiles: FileSummary[] = [];
    let packageJson: object | undefined;

    // Extensions to include
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.json'];

    function walkDir(dir: string, relativeTo: string): void {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(relativeTo, fullPath);

            // Skip unwanted directories
            if (entry.isDirectory()) {
                if (['node_modules', '.git', 'dist', 'coverage', '__pycache__'].includes(entry.name)) {
                    continue;
                }
                walkDir(fullPath, relativeTo);
                continue;
            }

            // Check if it's a code file
            const ext = path.extname(entry.name).toLowerCase();
            if (!codeExtensions.includes(ext)) {
                continue;
            }

            // Read file content
            const content = fs.readFileSync(fullPath, 'utf-8');
            const language = getLanguage(entry.name);

            const fileSummary: FileSummary = {
                path: relativePath.replace(/\\/g, '/'),
                content,
                language,
            };

            // Categorize file
            if (relativePath.includes('test') || relativePath.includes('spec')) {
                testFiles.push(fileSummary);
            } else {
                files.push(fileSummary);
            }

            // Capture package.json
            if (entry.name === 'package.json') {
                try {
                    packageJson = JSON.parse(content);
                } catch {
                    // Ignore parse errors
                }
            }
        }
    }

    walkDir(repoPath, repoPath);

    return { files, testFiles, packageJson };
}

/**
 * Create a feature branch
 */
export async function createBranch(git: SimpleGit, branchName: string): Promise<void> {
    try {
        await git.checkoutLocalBranch(branchName);
    } catch {
        // Branch might already exist
        await git.checkout(branchName);
    }
}

/**
 * Commit changes
 */
export async function commitChanges(
    git: SimpleGit,
    message: string,
    files?: string[]
): Promise<string> {
    if (files && files.length > 0) {
        await git.add(files);
    } else {
        await git.add('.');
    }

    const result = await git.commit(message);
    return result.commit;
}

/**
 * Get diff between commits or working tree
 */
export async function getDiff(git: SimpleGit, from?: string, to?: string): Promise<string> {
    if (from && to) {
        return git.diff([from, to]);
    } else if (from) {
        return git.diff([from]);
    } else {
        return git.diff();
    }
}

/**
 * Clean up a snapshot directory
 */
export function cleanupSnapshot(snapshotPath: string): void {
    if (fs.existsSync(snapshotPath)) {
        fs.rmSync(snapshotPath, { recursive: true, force: true });
    }
}

/**
 * Read file content from snapshot
 */
export function readFile(snapshotPath: string, filePath: string): string {
    const fullPath = path.join(snapshotPath, filePath);
    if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath, 'utf-8');
    }
    return '';
}

/**
 * Write file content to snapshot
 */
export function writeFile(snapshotPath: string, filePath: string, content: string): void {
    const fullPath = path.join(snapshotPath, filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, 'utf-8');
}
