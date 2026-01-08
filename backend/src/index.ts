/**
 * VibeCI Backend - Main Entry Point
 * Express server with API routes and WebSocket support
 */

// Load environment variables from .env file
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

import taskRoutes from './routes/tasks.js';
import artifactRoutes from './routes/artifacts.js';
import { orchestratorEvents } from './services/orchestrator.js';
import type { WSMessage } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/tasks', taskRoutes);
app.use('/api/artifacts', artifactRoutes);

// Serve static artifacts
app.use('/artifacts', express.static(path.join(process.cwd(), 'artifacts')));

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// Store connected clients by task ID
const taskClients = new Map<string, Set<WebSocket>>();

// Handle WebSocket connections
wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    let subscribedTaskId: string | null = null;

    ws.on('message', (data: Buffer) => {
        try {
            const message = JSON.parse(data.toString());

            if (message.type === 'subscribe' && message.taskId) {
                // Unsubscribe from previous task
                if (subscribedTaskId) {
                    const clients = taskClients.get(subscribedTaskId);
                    if (clients) {
                        clients.delete(ws);
                    }
                }

                // Subscribe to new task
                subscribedTaskId = message.taskId;

                if (!taskClients.has(subscribedTaskId)) {
                    taskClients.set(subscribedTaskId, new Set());
                }
                taskClients.get(subscribedTaskId)!.add(ws);

                console.log(`Client subscribed to task: ${subscribedTaskId}`);

                ws.send(JSON.stringify({
                    type: 'subscribed',
                    taskId: subscribedTaskId,
                    timestamp: new Date().toISOString(),
                }));
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');

        // Remove from task subscriptions
        if (subscribedTaskId) {
            const clients = taskClients.get(subscribedTaskId);
            if (clients) {
                clients.delete(ws);
            }
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Forward orchestrator events to WebSocket clients
orchestratorEvents.on('task-event', (event: WSMessage) => {
    const clients = taskClients.get(event.taskId);

    if (clients && clients.size > 0) {
        const message = JSON.stringify(event);

        clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
});

// Start server
server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   ██╗   ██╗██╗██████╗ ███████╗ ██████╗██╗            ║
║   ██║   ██║██║██╔══██╗██╔════╝██╔════╝██║            ║
║   ██║   ██║██║██████╔╝█████╗  ██║     ██║            ║
║   ╚██╗ ██╔╝██║██╔══██╗██╔══╝  ██║     ██║            ║
║    ╚████╔╝ ██║██████╔╝███████╗╚██████╗██║            ║
║     ╚═══╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝╚═╝            ║
║                                                       ║
║   Autonomous Code Engineer                            ║
║                                                       ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║   🚀 Server running on http://localhost:${PORT}          ║
║   📡 WebSocket available at ws://localhost:${PORT}/ws    ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

export { app, server, wss };
