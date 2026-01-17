import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import type { ApiResponse } from '../types/index.js';
import * as db from '../database/index.js';

const router = Router();

// Workspaces directory
const WORKSPACES_DIR = path.join(process.cwd(), 'workspaces');

interface WorkspaceFile {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size?: number;
}

/**
 * Get workspace directory for a task from database
 */
function getWorkspacePath(taskId: string): string | null {
    // First try to get workspace path from task in database
    const task = db.getTask(taskId);
    if (task?.workspacePath && fs.existsSync(task.workspacePath)) {
        return task.workspacePath;
    }

    // Fallback: search workspaces directory
    if (!fs.existsSync(WORKSPACES_DIR)) {
        return null;
    }

    // Find workspace folder matching taskId
    const folders = fs.readdirSync(WORKSPACES_DIR);
    const match = folders.find(f => f.includes(taskId) || taskId.includes(f.slice(0, 8)));

    if (match) {
        return path.join(WORKSPACES_DIR, match);
    }

    // Also check by exact match
    const exactPath = path.join(WORKSPACES_DIR, taskId);
    if (fs.existsSync(exactPath)) {
        return exactPath;
    }

    return null;
}

/**
 * Recursively list files in a directory
 */
function listFilesRecursive(dir: string, basePath = ''): WorkspaceFile[] {
    const results: WorkspaceFile[] = [];

    if (!fs.existsSync(dir)) {
        return results;
    }

    const items = fs.readdirSync(dir);

    for (const item of items) {
        // Skip node_modules and hidden folders
        if (item === 'node_modules' || item.startsWith('.')) {
            continue;
        }

        const fullPath = path.join(dir, item);
        const relativePath = path.join(basePath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            results.push({
                name: item,
                path: relativePath,
                type: 'directory',
            });
            // Recursively add children
            results.push(...listFilesRecursive(fullPath, relativePath));
        } else {
            results.push({
                name: item,
                path: relativePath,
                type: 'file',
                size: stat.size,
            });
        }
    }

    return results;
}

/**
 * GET /workspace/:taskId - List workspace files for a task
 */
router.get('/:taskId', (req: Request, res: Response) => {
    try {
        const { taskId } = req.params;
        const workspacePath = getWorkspacePath(taskId);

        if (!workspacePath) {
            return res.json({
                success: true,
                data: {
                    exists: false,
                    files: [],
                    path: null,
                },
            });
        }

        const files = listFilesRecursive(workspacePath);

        res.json({
            success: true,
            data: {
                exists: true,
                files,
                path: workspacePath,
                folderName: path.basename(workspacePath),
            },
        });
    } catch (error) {
        console.error('Error listing workspace:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
        res.status(500).json(response);
    }
});

/**
 * GET /workspace/:taskId/file/:filePath - Get file content
 */
router.get('/:taskId/file/*', (req: Request, res: Response) => {
    try {
        const { taskId } = req.params;
        const filePath = req.params[0]; // Get the rest of the path

        const workspacePath = getWorkspacePath(taskId);

        if (!workspacePath) {
            return res.status(404).json({
                success: false,
                error: 'Workspace not found',
            });
        }

        const fullPath = path.join(workspacePath, filePath);

        // Security: ensure path is within workspace
        if (!fullPath.startsWith(workspacePath)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
            });
        }

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({
                success: false,
                error: 'File not found',
            });
        }

        const content = fs.readFileSync(fullPath, 'utf-8');
        res.type('text/plain').send(content);
    } catch (error) {
        console.error('Error reading workspace file:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * GET /workspace/:taskId/download - Download workspace as ZIP
 */
router.get('/:taskId/download', async (req: Request, res: Response) => {
    try {
        const { taskId } = req.params;
        const workspacePath = getWorkspacePath(taskId);

        if (!workspacePath) {
            return res.status(404).json({
                success: false,
                error: 'Workspace not found',
            });
        }

        const folderName = path.basename(workspacePath);
        const zipFileName = `workspace-${taskId.slice(0, 8)}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.on('error', (err: Error) => {
            throw err;
        });

        archive.pipe(res);

        // Add workspace files, excluding node_modules
        archive.glob('**/*', {
            cwd: workspacePath,
            ignore: ['node_modules/**', '.git/**'],
        });

        await archive.finalize();
    } catch (error) {
        console.error('Error creating workspace ZIP:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;
