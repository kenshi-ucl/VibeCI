/**
 * VibeCI Backend - Type Definitions
 */

// Task Status
export type TaskStatus =
    | 'pending'
    | 'planning'
    | 'generating'
    | 'testing'
    | 'analyzing'
    | 'fixing'
    | 'completed'
    | 'failed';

// Task Definition
export interface Task {
    id: string;
    description: string;
    repoPath: string;
    status: TaskStatus;
    currentIteration: number;
    maxIterations: number;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}

// Thought Signature (reasoning checkpoint)
export interface ThoughtSignature {
    id: string;
    taskId: string;
    iteration: number;
    summary: string;
    status: TaskStatus;
    artifacts: string[];
    timestamp: string;
}

// Agent Plan
export interface AgentPlan {
    plan: string[];
}

// Patch Definition
export interface Patch {
    file: string;
    diff: string;
}

// Patches Response
export interface PatchesResponse {
    patches: Patch[];
}

// Test Definition
export interface TestFile {
    file: string;
    content: string;
}

// Tests Response
export interface TestsResponse {
    tests: TestFile[];
}

// Failure Analysis
export interface FailureAnalysis {
    analysis: string;
    next_steps: string[];
}

// Test Result
export interface TestResult {
    passed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    duration: number;
    output: string;
    errors: string[];
}

// Agent Response (combined)
export interface AgentResponse {
    plan?: string[];
    patches?: Patch[];
    tests?: TestFile[];
    explanation?: string;
    thought_signature?: {
        iteration: number;
        reasoning_summary: string;
    };
}

// File Summary
export interface FileSummary {
    path: string;
    content: string;
    language: string;
}

// Repository Summary
export interface RepoSummary {
    files: FileSummary[];
    testFiles: FileSummary[];
    packageJson?: object;
}

// Artifact
export interface Artifact {
    id: string;
    taskId: string;
    type: 'log' | 'diff' | 'screenshot' | 'report';
    name: string;
    path: string;
    createdAt: string;
}

// WebSocket Message
export interface WSMessage {
    type: 'status' | 'log' | 'artifact' | 'complete' | 'error';
    taskId: string;
    data: unknown;
    timestamp: string;
}

// API Response
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// Task Create Request
export interface CreateTaskRequest {
    description: string;
    repoPath?: string;
    maxIterations?: number;
}

// Task Events
export interface TaskEvent {
    id: string;
    taskId: string;
    type: string;
    message: string;
    data?: unknown;
    timestamp: string;
}
