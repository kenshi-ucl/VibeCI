/**
 * VibeCI Backend - Gemini API Service
 * Integration with Google's Gemini API for AI-powered code generation
 * Using Gemini 3 Pro (gemini-3-pro-preview) for the hackathon
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import type { AgentPlan, PatchesResponse, TestsResponse, FailureAnalysis, AgentResponse, RepoSummary } from '../types/index.js';

// Load prompts
const promptsDir = path.join(process.cwd(), '..', 'agent_prompts');

function loadPrompt(name: string): string {
    const promptPath = path.join(promptsDir, `${name}.md`);
    if (fs.existsSync(promptPath)) {
        return fs.readFileSync(promptPath, 'utf-8');
    }
    console.warn(`Prompt file not found: ${promptPath}`);
    return '';
}

// Initialize Gemini client
const apiKey = process.env.GEMINI_API_KEY;
let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

// Gemini 3 Pro model name
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-pro-preview';

function getModel(): GenerativeModel {
    if (!model) {
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }
        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({
            model: GEMINI_MODEL,
            generationConfig: {
                temperature: 0.2,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 8192,
            }
        });
        console.log(`Initialized Gemini model: ${GEMINI_MODEL}`);
    }
    return model;
}

// Retry configuration
const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 2000;

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff for rate limits
 */
async function withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            return await operation();
        } catch (error: unknown) {
            lastError = error as Error;
            const errorObj = error as { status?: number; message?: string };

            // Check if it's a rate limit error (429)
            if (errorObj.status === 429 || errorObj.message?.includes('429') || errorObj.message?.includes('quota')) {
                const delayMs = INITIAL_DELAY_MS * Math.pow(2, attempt);
                console.log(`Rate limited on ${operationName}. Attempt ${attempt + 1}/${MAX_RETRIES}. Waiting ${delayMs / 1000}s...`);
                await sleep(delayMs);
                continue;
            }

            // For other errors, rethrow immediately
            throw error;
        }
    }

    throw lastError || new Error(`${operationName} failed after ${MAX_RETRIES} retries`);
}

// System prompt
const systemPrompt = loadPrompt('system');

/**
 * Parse JSON from AI response (handles markdown code blocks)
 */
function parseJsonResponse<T>(text: string): T {
    // Remove markdown code blocks if present
    let jsonStr = text.trim();

    if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
    }

    if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
    }

    return JSON.parse(jsonStr.trim()) as T;
}

/**
 * Generate a plan for implementing a task
 */
export async function generatePlan(
    taskDescription: string,
    repoSummary: RepoSummary
): Promise<AgentPlan> {
    const plannerPrompt = loadPrompt('planner');

    const prompt = `${systemPrompt}

${plannerPrompt}

## Task Description
${taskDescription}

## Repository Summary
${JSON.stringify(repoSummary, null, 2)}

Please generate a plan to implement this task. Return your response as a JSON object with a "plan" array.`;

    return withRetry(async () => {
        const genModel = getModel();
        const result = await genModel.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        return parseJsonResponse<AgentPlan>(text);
    }, 'generatePlan');
}

/**
 * Generate patches to implement a plan
 */
export async function generatePatches(
    plan: string[],
    repoSummary: RepoSummary,
    taskDescription: string
): Promise<PatchesResponse> {
    const patchPrompt = loadPrompt('patch_generator');

    const prompt = `${systemPrompt}

${patchPrompt}

## Task Description
${taskDescription}

## Plan
${plan.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## Relevant Files
${repoSummary.files.map(f => `### ${f.path}\n\`\`\`${f.language}\n${f.content}\n\`\`\``).join('\n\n')}

Please generate the patches needed to implement this plan. Return your response as a JSON object with a "patches" array.`;

    return withRetry(async () => {
        const genModel = getModel();
        const result = await genModel.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        return parseJsonResponse<PatchesResponse>(text);
    }, 'generatePatches');
}

/**
 * Generate tests for the implemented changes
 */
export async function generateTests(
    patches: PatchesResponse,
    repoSummary: RepoSummary,
    taskDescription: string
): Promise<TestsResponse> {
    const testPrompt = loadPrompt('test_generator');

    const prompt = `${systemPrompt}

${testPrompt}

## Task Description
${taskDescription}

## Applied Patches
${patches.patches.map(p => `### ${p.file}\n\`\`\`diff\n${p.diff}\n\`\`\``).join('\n\n')}

## Existing Tests
${repoSummary.testFiles.map(f => `### ${f.path}\n\`\`\`${f.language}\n${f.content}\n\`\`\``).join('\n\n')}

Please generate tests that validate the changes. Return your response as a JSON object with a "tests" array.`;

    return withRetry(async () => {
        const genModel = getModel();
        const result = await genModel.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        return parseJsonResponse<TestsResponse>(text);
    }, 'generateTests');
}

/**
 * Analyze test failures and suggest fixes
 */
export async function analyzeFailure(
    testOutput: string,
    repoSummary: RepoSummary,
    previousPatches: PatchesResponse
): Promise<FailureAnalysis> {
    const analyzerPrompt = loadPrompt('failure_analyzer');

    const prompt = `${systemPrompt}

${analyzerPrompt}

## Test Output (Failure)
\`\`\`
${testOutput}
\`\`\`

## Previously Applied Patches
${previousPatches.patches.map(p => `### ${p.file}\n\`\`\`diff\n${p.diff}\n\`\`\``).join('\n\n')}

## Relevant Files
${repoSummary.files.map(f => `### ${f.path}\n\`\`\`${f.language}\n${f.content}\n\`\`\``).join('\n\n')}

Please analyze the failure and suggest corrective actions. Return your response as a JSON object with "analysis" and "next_steps" fields.`;

    return withRetry(async () => {
        const genModel = getModel();
        const result = await genModel.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        return parseJsonResponse<FailureAnalysis>(text);
    }, 'analyzeFailure');
}

/**
 * Generate fix patches based on failure analysis
 */
export async function generateFix(
    analysis: FailureAnalysis,
    repoSummary: RepoSummary,
    taskDescription: string
): Promise<PatchesResponse> {
    const fixPrompt = loadPrompt('fix_generator');

    const prompt = `${systemPrompt}

${fixPrompt}

## Original Task
${taskDescription}

## Failure Analysis
${analysis.analysis}

## Suggested Next Steps
${analysis.next_steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## Current Files
${repoSummary.files.map(f => `### ${f.path}\n\`\`\`${f.language}\n${f.content}\n\`\`\``).join('\n\n')}

Please generate fix patches to address the identified issues. Return your response as a JSON object with a "patches" array.`;

    return withRetry(async () => {
        const genModel = getModel();
        const result = await genModel.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        return parseJsonResponse<PatchesResponse>(text);
    }, 'generateFix');
}

/**
 * Generate a final human-readable report
 */
export async function generateReport(
    taskDescription: string,
    plan: string[],
    allPatches: PatchesResponse[],
    testResults: { passed: boolean; output: string }[],
    iterations: number
): Promise<string> {
    const reportPrompt = loadPrompt('final_report');

    const prompt = `${systemPrompt}

${reportPrompt}

## Task
${taskDescription}

## Plan Executed
${plan.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## Changes Made
${allPatches.map((p, i) => `### Iteration ${i + 1}\n${p.patches.map(patch => `- ${patch.file}`).join('\n')}`).join('\n\n')}

## Test Results
${testResults.map((r, i) => `### Iteration ${i + 1}\n- Status: ${r.passed ? 'PASSED' : 'FAILED'}\n\`\`\`\n${r.output.slice(0, 500)}\n\`\`\``).join('\n\n')}

## Summary
- Total iterations: ${iterations}
- Final status: ${testResults[testResults.length - 1]?.passed ? 'SUCCESS' : 'FAILED'}

Please generate a human-readable report summarizing what was done.`;

    return withRetry(async () => {
        const genModel = getModel();
        const result = await genModel.generateContent(prompt);
        const response = result.response;
        return response.text();
    }, 'generateReport');
}

/**
 * Combined agent call for full iteration
 */
export async function runAgentIteration(
    taskDescription: string,
    repoSummary: RepoSummary,
    previousTestOutput?: string,
    previousPatches?: PatchesResponse
): Promise<AgentResponse> {
    // If we have previous test failures, analyze and fix
    if (previousTestOutput && previousPatches) {
        const analysis = await analyzeFailure(previousTestOutput, repoSummary, previousPatches);
        const fixPatches = await generateFix(analysis, repoSummary, taskDescription);

        return {
            patches: fixPatches.patches,
            explanation: analysis.analysis,
            thought_signature: {
                iteration: 0, // Will be set by orchestrator
                reasoning_summary: `Analysis: ${analysis.analysis}. Next steps: ${analysis.next_steps.join(', ')}`,
            },
        };
    }

    // Otherwise, start fresh with planning
    const plan = await generatePlan(taskDescription, repoSummary);
    const patches = await generatePatches(plan.plan, repoSummary, taskDescription);

    return {
        plan: plan.plan,
        patches: patches.patches,
        thought_signature: {
            iteration: 0,
            reasoning_summary: `Plan: ${plan.plan.join(' -> ')}`,
        },
    };
}
