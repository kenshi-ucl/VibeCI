/**
 * VibeCI Backend - Task Routes
 * API endpoints for task submission and status
 */

import { Router, Request, Response } from 'express';
import * as orchestrator from '../services/orchestrator.js';
import * as artifacts from '../services/artifacts.js';
import type { CreateTaskRequest, ApiResponse, Task } from '../types/index.js';

const router = Router();

/**
 * POST /tasks - Create a new task
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { description, repoPath, maxIterations } = req.body as CreateTaskRequest;

        if (!description) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Task description is required',
            };
            return res.status(400).json(response);
        }

        const task = await orchestrator.startTask(
            description,
            repoPath,
            maxIterations || 3
        );

        const response: ApiResponse<Task> = {
            success: true,
            data: task,
        };

        res.status(201).json(response);
    } catch (error) {
        console.error('Error creating task:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
        res.status(500).json(response);
    }
});

/**
 * GET /tasks - Get all tasks
 */
router.get('/', (req: Request, res: Response) => {
    try {
        const tasks = orchestrator.getAllTasks();

        const response: ApiResponse<Task[]> = {
            success: true,
            data: tasks,
        };

        res.json(response);
    } catch (error) {
        console.error('Error getting tasks:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
        res.status(500).json(response);
    }
});

/**
 * GET /tasks/:id - Get task by ID
 */
router.get('/:id', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const task = orchestrator.getTaskStatus(id);

        if (!task) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Task not found',
            };
            return res.status(404).json(response);
        }

        const response: ApiResponse<Task> = {
            success: true,
            data: task,
        };

        res.json(response);
    } catch (error) {
        console.error('Error getting task:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
        res.status(500).json(response);
    }
});

/**
 * GET /tasks/:id/events - Get task events
 */
router.get('/:id/events', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const task = orchestrator.getTaskStatus(id);

        if (!task) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Task not found',
            };
            return res.status(404).json(response);
        }

        const events = orchestrator.getTaskEvents(id);

        const response: ApiResponse<typeof events> = {
            success: true,
            data: events,
        };

        res.json(response);
    } catch (error) {
        console.error('Error getting task events:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
        res.status(500).json(response);
    }
});

/**
 * GET /tasks/:id/thoughts - Get task thought signatures
 */
router.get('/:id/thoughts', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const task = orchestrator.getTaskStatus(id);

        if (!task) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Task not found',
            };
            return res.status(404).json(response);
        }

        const thoughts = orchestrator.getThoughtSignatures(id);

        const response: ApiResponse<typeof thoughts> = {
            success: true,
            data: thoughts,
        };

        res.json(response);
    } catch (error) {
        console.error('Error getting thought signatures:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
        res.status(500).json(response);
    }
});

/**
 * GET /tasks/:id/artifacts - Get task artifacts
 */
router.get('/:id/artifacts', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const task = orchestrator.getTaskStatus(id);

        if (!task) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'Task not found',
            };
            return res.status(404).json(response);
        }

        const taskArtifacts = artifacts.getArtifacts(id);

        const response: ApiResponse<typeof taskArtifacts> = {
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

export default router;
