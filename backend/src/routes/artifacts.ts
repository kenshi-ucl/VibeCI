/**
 * VibeCI Backend - Artifact Routes
 * API endpoints for artifact retrieval
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import * as artifacts from '../services/artifacts.js';
import type { ApiResponse, Artifact } from '../types/index.js';

const router = Router();

/**
 * GET /artifacts/:taskId - Get all artifacts for a task
 */
router.get('/:taskId', (req: Request, res: Response) => {
    try {
        const { taskId } = req.params;
        const taskArtifacts = artifacts.getArtifacts(taskId);

        const response: ApiResponse<Artifact[]> = {
            success: true,
            data: taskArtifacts,
        };

        res.json(response);
    } catch (error) {
        console.error('Error getting artifacts:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
        res.status(500).json(response);
    }
});

/**
 * GET /artifacts/:taskId/:filename - Get artifact file content
 */
router.get('/:taskId/:filename', (req: Request, res: Response) => {
    try {
        const { taskId, filename } = req.params;
        const filePath = artifacts.getArtifactPath(taskId, filename);

        if (!filePath) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Artifact not found',
            };
            return res.status(404).json(response);
        }

        // Determine content type
        const ext = path.extname(filename).toLowerCase();
        const contentTypes: Record<string, string> = {
            '.json': 'application/json',
            '.log': 'text/plain',
            '.diff': 'text/plain',
            '.md': 'text/markdown',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
        };

        const contentType = contentTypes[ext] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);

        if (contentType.startsWith('image/')) {
            res.sendFile(filePath);
        } else {
            const content = fs.readFileSync(filePath, 'utf-8');
            res.send(content);
        }
    } catch (error) {
        console.error('Error getting artifact file:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
        res.status(500).json(response);
    }
});

/**
 * GET /artifacts/:taskId/download - Download all artifacts as package
 */
router.get('/:taskId/download', async (req: Request, res: Response) => {
    try {
        const { taskId } = req.params;
        const packagePath = await artifacts.createArtifactPackage(taskId);

        res.json({
            success: true,
            data: {
                path: packagePath,
                message: 'Artifacts packaged successfully',
            },
        });
    } catch (error) {
        console.error('Error creating artifact package:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
        res.status(500).json(response);
    }
});

export default router;
