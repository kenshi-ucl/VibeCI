/**
 * VibeCI Antigravity - Screenshot Utilities
 * Capture screenshots and DOM snapshots for verification
 */

import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Default output directory
const OUTPUT_DIR = process.env.SCREENSHOT_DIR || './screenshots';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Capture a full-page screenshot
 */
export async function captureScreenshot(
    page: Page,
    name: string,
    options?: {
        fullPage?: boolean;
        clip?: { x: number; y: number; width: number; height: number };
    }
): Promise<string> {
    const filename = `${name}-${Date.now()}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);

    await page.screenshot({
        path: filepath,
        fullPage: options?.fullPage ?? true,
        clip: options?.clip,
    });

    console.log(`Screenshot saved: ${filepath}`);
    return filepath;
}

/**
 * Capture DOM snapshot as HTML
 */
export async function captureDOMSnapshot(
    page: Page,
    name: string
): Promise<string> {
    const filename = `${name}-${Date.now()}.html`;
    const filepath = path.join(OUTPUT_DIR, filename);

    const html = await page.content();
    fs.writeFileSync(filepath, html, 'utf-8');

    console.log(`DOM snapshot saved: ${filepath}`);
    return filepath;
}

/**
 * Capture element screenshot
 */
export async function captureElement(
    page: Page,
    selector: string,
    name: string
): Promise<string | null> {
    const element = page.locator(selector);

    if (!(await element.isVisible())) {
        console.warn(`Element not visible: ${selector}`);
        return null;
    }

    const filename = `${name}-${Date.now()}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);

    await element.screenshot({ path: filepath });

    console.log(`Element screenshot saved: ${filepath}`);
    return filepath;
}

/**
 * Capture console logs
 */
export function setupConsoleCapture(page: Page): { getLogs: () => string[] } {
    const logs: string[] = [];

    page.on('console', (msg) => {
        logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', (error) => {
        logs.push(`[error] ${error.message}`);
    });

    return {
        getLogs: () => [...logs],
    };
}

/**
 * Save console logs to file
 */
export function saveConsoleLogs(taskId: string, logs: string[]): string {
    const filename = `console-${taskId}-${Date.now()}.log`;
    const filepath = path.join(OUTPUT_DIR, filename);

    fs.writeFileSync(filepath, logs.join('\n'), 'utf-8');

    console.log(`Console logs saved: ${filepath}`);
    return filepath;
}

/**
 * Capture network requests
 */
export function setupNetworkCapture(page: Page): { getRequests: () => { url: string; method: string; status?: number }[] } {
    const requests: { url: string; method: string; status?: number }[] = [];

    page.on('request', (request) => {
        requests.push({
            url: request.url(),
            method: request.method(),
        });
    });

    page.on('response', (response) => {
        const request = requests.find(r => r.url === response.url());
        if (request) {
            request.status = response.status();
        }
    });

    return {
        getRequests: () => [...requests],
    };
}

/**
 * Create a verification report
 */
export function createVerificationReport(
    taskId: string,
    results: {
        screenshots: string[];
        domSnapshots: string[];
        consoleLogs: string[];
        passed: boolean;
        errors: string[];
    }
): string {
    const report = {
        taskId,
        timestamp: new Date().toISOString(),
        ...results,
    };

    const filename = `verification-report-${taskId}-${Date.now()}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');

    console.log(`Verification report saved: ${filepath}`);
    return filepath;
}
