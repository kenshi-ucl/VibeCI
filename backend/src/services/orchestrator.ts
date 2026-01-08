/**
 * VibeCI Backend - Orchestrator Service
 * Core orchestration logic - coordinates agent steps, manages iterations
 */

import { EventEmitter } from 'events';
import path from 'path';
import type {
    Task,
    TaskStatus,
    TestResult,
    AgentResponse,
    ThoughtSignature,
    PatchesResponse
} from '../types/index.js';
import * as db from '../database/index.js';
import * as gemini from './gemini.js';
import * as git from './git.js';
import * as patcher from './patcher.js';
import * as testRunner from './testRunner.js';
import * as artifacts from './artifacts.js';

// Event emitter for real-time updates
export const orchestratorEvents = new EventEmitter();

// Default demo repo path
const DEFAULT_REPO_PATH = path.join(process.cwd(), '..', 'demo_repo');

/**
 * Emit task event
 */
function emitEvent(taskId: string, type: string, message: string, data?: unknown): void {
    db.createTaskEvent(taskId, type, message, data);
    orchestratorEvents.emit('task-event', { taskId, type, message, data, timestamp: new Date().toISOString() });
}

/**
 * Run the full orchestration loop for a task
 */
export async function runTask(task: Task): Promise<void> {
    const maxIterations = task.maxIterations;
    let iteration = 0;
    let snapshot: { path: string; git: ReturnType<typeof git.createSnapshot> extends Promise<infer T> ? T : never } | null = null;
    let lastTestResult: TestResult | null = null;
    let lastPatches: PatchesResponse | null = null;
    const allPatches: PatchesResponse[] = [];
    const allTestResults: { passed: boolean; output: string }[] = [];

    try {
        // Create repo snapshot
        emitEvent(task.id, 'status', 'Creating repository snapshot...');
        db.updateTaskStatus(task.id, 'planning', 0);

        const repoPath = task.repoPath || DEFAULT_REPO_PATH;
        snapshot = await git.createSnapshot(repoPath);

        emitEvent(task.id, 'status', 'Repository snapshot created', { path: snapshot.path });

        // Create feature branch
        await git.createBranch(snapshot.git, `vibeci/task-${task.id.slice(0, 8)}`);

        while (iteration < maxIterations) {
            iteration++;
            emitEvent(task.id, 'iteration', `Starting iteration ${iteration} of ${maxIterations}`);
            db.updateTaskStatus(task.id, iteration === 1 ? 'planning' : 'fixing', iteration);

            // Get current repo state
            const repoSummary = git.summarizeRepo(snapshot.path);

            // Run agent iteration
            emitEvent(task.id, 'status', iteration === 1 ? 'Planning implementation...' : 'Generating fix...');

            let agentResponse: AgentResponse;

            if (iteration === 1) {
                // First iteration: plan and generate patches
                db.updateTaskStatus(task.id, 'planning', iteration);
                agentResponse = await gemini.runAgentIteration(
                    task.description,
                    repoSummary
                );

                if (agentResponse.plan) {
                    emitEvent(task.id, 'plan', 'Generated implementation plan', { plan: agentResponse.plan });

                    // Save thought signature
                    db.createThoughtSignature(
                        task.id,
                        iteration,
                        `Plan: ${agentResponse.plan.join(' → ')}`,
                        'planning',
                        []
                    );
                }
            } else {
                // Subsequent iterations: analyze failure and generate fix
                db.updateTaskStatus(task.id, 'analyzing', iteration);

                if (!lastTestResult || !lastPatches) {
                    throw new Error('No previous test result or patches to analyze');
                }

                agentResponse = await gemini.runAgentIteration(
                    task.description,
                    repoSummary,
                    lastTestResult.output,
                    lastPatches
                );

                emitEvent(task.id, 'analysis', 'Analyzed failure', {
                    explanation: agentResponse.explanation
                });
            }

            // Apply patches
            if (agentResponse.patches && agentResponse.patches.length > 0) {
                db.updateTaskStatus(task.id, 'generating', iteration);
                emitEvent(task.id, 'status', 'Applying patches...', {
                    files: agentResponse.patches.map(p => p.file)
                });

                const patchResult = patcher.applyPatches(snapshot.path, agentResponse.patches);

                emitEvent(task.id, 'patches', 'Applied patches', patchResult);

                // Save patches as artifact
                const patchesResponse: PatchesResponse = { patches: agentResponse.patches };
                allPatches.push(patchesResponse);
                lastPatches = patchesResponse;

                artifacts.saveDiff(task.id, agentResponse.patches, iteration);

                // Commit changes
                await git.commitChanges(
                    snapshot.git,
                    `VibeCI: Iteration ${iteration} - ${iteration === 1 ? 'Initial implementation' : 'Fix attempt'}`
                );
            }

            // Run tests
            db.updateTaskStatus(task.id, 'testing', iteration);
            emitEvent(task.id, 'status', 'Running tests...');

            const testResult = await testRunner.runTests(snapshot.path);
            lastTestResult = testResult;
            allTestResults.push({ passed: testResult.passed, output: testResult.output });

            // Save test result artifact
            artifacts.saveTestResult(task.id, iteration, testResult);

            emitEvent(task.id, 'test-result', `Tests ${testResult.passed ? 'PASSED' : 'FAILED'}`, {
                passed: testResult.passed,
                total: testResult.totalTests,
                passedCount: testResult.passedTests,
                failedCount: testResult.failedTests,
                duration: testResult.duration,
            });

            // Save thought signature for this iteration
            db.createThoughtSignature(
                task.id,
                iteration,
                `Tests: ${testResult.passedTests}/${testResult.totalTests} passed. ${testResult.passed ? 'SUCCESS' : 'Needs fix'}`,
                testResult.passed ? 'completed' : 'analyzing',
                [artifacts.getArtifacts(task.id).map(a => a.name).join(', ')]
            );

            // Check if tests passed
            if (testResult.passed) {
                emitEvent(task.id, 'success', 'All tests passed!');
                break;
            }

            // Log failure details
            if (testResult.errors.length > 0) {
                emitEvent(task.id, 'errors', 'Test errors', { errors: testResult.errors.slice(0, 3) });
            }
        }

        // Generate final report
        const plan = allPatches.length > 0 ? ['Implementation completed'] : ['No changes made'];
        const report = await gemini.generateReport(
            task.description,
            plan,
            allPatches,
            allTestResults,
            iteration
        );

        artifacts.saveReport(task.id, 'final', report);

        // Get final diff
        const finalDiff = await git.getDiff(snapshot.git, 'HEAD~' + iteration, 'HEAD').catch(() => '');
        if (finalDiff) {
            artifacts.saveLog(task.id, 'final-diff', finalDiff);
        }

        // Update final status
        const finalStatus: TaskStatus = lastTestResult?.passed ? 'completed' : 'failed';
        db.updateTaskStatus(task.id, finalStatus, iteration);

        emitEvent(task.id, 'complete', `Task ${finalStatus}`, {
            iterations: iteration,
            passed: lastTestResult?.passed,
            artifacts: artifacts.getArtifacts(task.id).map(a => a.name),
        });

    } catch (error) {
        console.error('Orchestration error:', error);

        const errorMessage = error instanceof Error ? error.message : String(error);
        emitEvent(task.id, 'error', `Task failed: ${errorMessage}`);
        db.updateTaskStatus(task.id, 'failed', iteration);

        artifacts.saveLog(task.id, 'error', errorMessage);

    } finally {
        // Cleanup snapshot (optional - keep for debugging)
        if (snapshot && process.env.CLEANUP_SNAPSHOTS === 'true') {
            git.cleanupSnapshot(snapshot.path);
        }
    }
}

/**
 * Start a new task
 */
export async function startTask(description: string, repoPath?: string, maxIterations = 3): Promise<Task> {
    const task = db.createTask(
        description,
        repoPath || DEFAULT_REPO_PATH,
        maxIterations
    );

    emitEvent(task.id, 'created', 'Task created', { description });

    // Run task in background
    runTask(task).catch(error => {
        console.error('Background task error:', error);
    });

    return task;
}

/**
 * Get task status
 */
export function getTaskStatus(taskId: string): Task | undefined {
    return db.getTask(taskId);
}

/**
 * Get task events
 */
export function getTaskEvents(taskId: string) {
    return db.getTaskEvents(taskId);
}

/**
 * Get task thought signatures
 */
export function getThoughtSignatures(taskId: string): ThoughtSignature[] {
    return db.getThoughtSignatures(taskId);
}

/**
 * Get all tasks
 */
export function getAllTasks(): Task[] {
    return db.getAllTasks();
}
