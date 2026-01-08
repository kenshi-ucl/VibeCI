/**
 * VibeCI Backend - Test Runner Service
 * Dockerized test execution and log capture
 */

import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import type { TestResult } from '../types/index.js';

const execAsync = promisify(exec);

// Test timeout
const TEST_TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '60000', 10);

/**
 * Run tests in a repository
 */
export async function runTests(repoPath: string): Promise<TestResult> {
    const startTime = Date.now();

    // Check if package.json exists
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        return {
            passed: false,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            duration: 0,
            output: 'No package.json found',
            errors: ['No package.json found in repository'],
        };
    }

    // Check if node_modules exists, if not run npm install
    const nodeModulesPath = path.join(repoPath, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
        try {
            console.log('Installing dependencies...');
            await execAsync('npm install', { cwd: repoPath, timeout: 120000 });
        } catch (error) {
            return {
                passed: false,
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                duration: Date.now() - startTime,
                output: `Failed to install dependencies: ${error}`,
                errors: [`npm install failed: ${error}`],
            };
        }
    }

    // Run tests
    return new Promise((resolve) => {
        const testProcess = spawn('npm', ['test'], {
            cwd: repoPath,
            shell: true,
            env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
        });

        let stdout = '';
        let stderr = '';

        testProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        testProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        const timeout = setTimeout(() => {
            testProcess.kill();
            resolve({
                passed: false,
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                duration: TEST_TIMEOUT,
                output: stdout + stderr + '\n\nTest process timed out',
                errors: ['Test process timed out'],
            });
        }, TEST_TIMEOUT);

        testProcess.on('close', (code) => {
            clearTimeout(timeout);
            const duration = Date.now() - startTime;
            const output = stdout + stderr;

            // Parse test results from Jest output
            const testStats = parseJestOutput(output);

            resolve({
                passed: code === 0,
                totalTests: testStats.total,
                passedTests: testStats.passed,
                failedTests: testStats.failed,
                duration,
                output,
                errors: code !== 0 ? extractErrors(output) : [],
            });
        });

        testProcess.on('error', (error) => {
            clearTimeout(timeout);
            resolve({
                passed: false,
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                duration: Date.now() - startTime,
                output: `Process error: ${error.message}`,
                errors: [error.message],
            });
        });
    });
}

/**
 * Parse Jest test output for statistics
 */
function parseJestOutput(output: string): { total: number; passed: number; failed: number } {
    let total = 0;
    let passed = 0;
    let failed = 0;

    // Try to parse Jest summary line
    // Example: "Tests:       2 failed, 3 passed, 5 total"
    const testsMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (testsMatch) {
        failed = parseInt(testsMatch[1], 10);
        passed = parseInt(testsMatch[2], 10);
        total = parseInt(testsMatch[3], 10);
        return { total, passed, failed };
    }

    // Try simpler pattern
    const passedMatch = output.match(/(\d+)\s+passed/);
    const failedMatch = output.match(/(\d+)\s+failed/);
    const totalMatch = output.match(/(\d+)\s+total/);

    if (passedMatch) passed = parseInt(passedMatch[1], 10);
    if (failedMatch) failed = parseInt(failedMatch[1], 10);
    if (totalMatch) {
        total = parseInt(totalMatch[1], 10);
    } else {
        total = passed + failed;
    }

    return { total, passed, failed };
}

/**
 * Extract error messages from test output
 */
function extractErrors(output: string): string[] {
    const errors: string[] = [];
    const lines = output.split('\n');

    let inError = false;
    let currentError = '';

    for (const line of lines) {
        // Jest error patterns
        if (line.includes('FAIL') || line.includes('● ')) {
            if (currentError) {
                errors.push(currentError.trim());
            }
            currentError = line;
            inError = true;
        } else if (inError) {
            if (line.trim() === '' && currentError) {
                errors.push(currentError.trim());
                currentError = '';
                inError = false;
            } else {
                currentError += '\n' + line;
            }
        }
    }

    if (currentError) {
        errors.push(currentError.trim());
    }

    // Limit to first 5 errors
    return errors.slice(0, 5);
}

/**
 * Run tests in Docker container (for isolation)
 */
export async function runTestsInDocker(repoPath: string): Promise<TestResult> {
    const startTime = Date.now();

    try {
        // Check if Docker is available
        await execAsync('docker --version');
    } catch {
        // Docker not available, fall back to local execution
        console.log('Docker not available, running tests locally');
        return runTests(repoPath);
    }

    // Build and run Docker container
    const containerName = `vibeci-test-${Date.now()}`;

    try {
        // Run tests in container
        const { stdout, stderr } = await execAsync(
            `docker run --rm --name ${containerName} -v "${repoPath}:/app" -w /app node:20-alpine sh -c "npm install && npm test"`,
            { timeout: TEST_TIMEOUT * 2 }
        );

        const duration = Date.now() - startTime;
        const output = stdout + stderr;
        const testStats = parseJestOutput(output);

        return {
            passed: true,
            totalTests: testStats.total,
            passedTests: testStats.passed,
            failedTests: testStats.failed,
            duration,
            output,
            errors: [],
        };
    } catch (error: unknown) {
        const duration = Date.now() - startTime;
        const errorObj = error as { stdout?: string; stderr?: string; message?: string };
        const output = `${errorObj.stdout || ''}\n${errorObj.stderr || ''}`;
        const testStats = parseJestOutput(output);

        return {
            passed: false,
            totalTests: testStats.total,
            passedTests: testStats.passed,
            failedTests: testStats.failed,
            duration,
            output,
            errors: extractErrors(output),
        };
    }
}

/**
 * Save test results as JSON artifact
 */
export function saveTestResults(outputPath: string, result: TestResult): void {
    const json = JSON.stringify(result, null, 2);
    fs.writeFileSync(outputPath, json, 'utf-8');
}
