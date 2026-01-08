/**
 * VibeCI Backend - Artifacts Service
 * Artifact storage and management
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Artifact, TestResult, Patch } from '../types/index.js';
import { createArtifact as dbCreateArtifact, getArtifacts as dbGetArtifacts } from '../database/index.js';

// Artifacts directory
const artifactsDir = process.env.ARTIFACTS_PATH || path.join(process.cwd(), 'artifacts');

// Ensure artifacts directory exists
if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
}

/**
 * Get task artifacts directory
 */
function getTaskDir(taskId: string): string {
    const taskDir = path.join(artifactsDir, taskId);
    if (!fs.existsSync(taskDir)) {
        fs.mkdirSync(taskDir, { recursive: true });
    }
    return taskDir;
}

/**
 * Save log artifact
 */
export function saveLog(taskId: string, name: string, content: string): Artifact {
    const taskDir = getTaskDir(taskId);
    const filename = `${name}-${Date.now()}.log`;
    const filePath = path.join(taskDir, filename);

    fs.writeFileSync(filePath, content, 'utf-8');

    return dbCreateArtifact(taskId, 'log', name, filePath);
}

/**
 * Save test result artifact
 */
export function saveTestResult(taskId: string, iteration: number, result: TestResult): Artifact {
    const taskDir = getTaskDir(taskId);
    const filename = `test-result-iter${iteration}-${Date.now()}.json`;
    const filePath = path.join(taskDir, filename);

    const content = JSON.stringify(result, null, 2);
    fs.writeFileSync(filePath, content, 'utf-8');

    return dbCreateArtifact(taskId, 'log', `Test Result (Iteration ${iteration})`, filePath);
}

/**
 * Save diff artifact
 */
export function saveDiff(taskId: string, patches: Patch[], iteration: number): Artifact {
    const taskDir = getTaskDir(taskId);
    const filename = `patches-iter${iteration}-${Date.now()}.diff`;
    const filePath = path.join(taskDir, filename);

    const content = patches.map(p =>
        `=== ${p.file} ===\n${p.diff}`
    ).join('\n\n');

    fs.writeFileSync(filePath, content, 'utf-8');

    return dbCreateArtifact(taskId, 'diff', `Patches (Iteration ${iteration})`, filePath);
}

/**
 * Save screenshot artifact
 */
export function saveScreenshot(taskId: string, name: string, imagePath: string): Artifact {
    const taskDir = getTaskDir(taskId);
    const filename = `screenshot-${name}-${Date.now()}.png`;
    const destPath = path.join(taskDir, filename);

    // Copy the image to artifacts directory
    fs.copyFileSync(imagePath, destPath);

    return dbCreateArtifact(taskId, 'screenshot', name, destPath);
}

/**
 * Save report artifact
 */
export function saveReport(taskId: string, name: string, content: string): Artifact {
    const taskDir = getTaskDir(taskId);
    const filename = `report-${name}-${Date.now()}.md`;
    const filePath = path.join(taskDir, filename);

    fs.writeFileSync(filePath, content, 'utf-8');

    return dbCreateArtifact(taskId, 'report', name, filePath);
}

/**
 * Get all artifacts for a task
 */
export function getArtifacts(taskId: string): Artifact[] {
    return dbGetArtifacts(taskId);
}

/**
 * Read artifact content
 */
export function readArtifact(artifact: Artifact): string | Buffer {
    if (artifact.type === 'screenshot') {
        return fs.readFileSync(artifact.path);
    }
    return fs.readFileSync(artifact.path, 'utf-8');
}

/**
 * Create a ZIP package of all artifacts for a task
 */
export async function createArtifactPackage(taskId: string): Promise<string> {
    const taskDir = getTaskDir(taskId);
    const zipPath = path.join(artifactsDir, `${taskId}.zip`);

    // For simplicity, we'll create a JSON manifest instead of a ZIP
    // In production, you'd use a library like archiver
    const artifacts = getArtifacts(taskId);
    const manifest = {
        taskId,
        createdAt: new Date().toISOString(),
        artifacts: artifacts.map(a => ({
            id: a.id,
            type: a.type,
            name: a.name,
            path: path.basename(a.path),
        })),
    };

    const manifestPath = path.join(taskDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    return taskDir;
}

/**
 * Clean up old artifacts (older than 7 days)
 */
export function cleanupOldArtifacts(): void {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const now = Date.now();

    const entries = fs.readdirSync(artifactsDir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const dirPath = path.join(artifactsDir, entry.name);
            const stat = fs.statSync(dirPath);

            if (now - stat.mtimeMs > maxAge) {
                fs.rmSync(dirPath, { recursive: true, force: true });
                console.log(`Cleaned up old artifacts: ${entry.name}`);
            }
        }
    }
}

/**
 * Get artifact file path for serving
 */
export function getArtifactPath(taskId: string, filename: string): string | null {
    const filePath = path.join(getTaskDir(taskId), filename);

    if (fs.existsSync(filePath)) {
        return filePath;
    }

    return null;
}
