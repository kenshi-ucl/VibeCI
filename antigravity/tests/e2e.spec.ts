/**
 * VibeCI Antigravity - E2E Verification Tests
 * Browser-based verification for the VibeCI UI
 */

import { test, expect } from '@playwright/test';

test.describe('VibeCI Dashboard', () => {
    test('should load the main dashboard', async ({ page }) => {
        await page.goto('/');

        // Check for main header
        await expect(page.locator('h1')).toContainText('VibeCI');

        // Take screenshot
        await page.screenshot({ path: 'screenshots/dashboard.png', fullPage: true });
    });

    test('should display task submission form', async ({ page }) => {
        await page.goto('/');

        // Check for task form elements
        const taskInput = page.locator('textarea[name="description"], input[name="description"]');
        await expect(taskInput).toBeVisible();

        const submitButton = page.locator('button[type="submit"]');
        await expect(submitButton).toBeVisible();

        await page.screenshot({ path: 'screenshots/task-form.png' });
    });

    test('should submit a task and show progress', async ({ page }) => {
        await page.goto('/');

        // Fill in task description
        const taskInput = page.locator('textarea[name="description"], input[name="description"]');
        await taskInput.fill('Add email-based signup with rate limiting');

        // Submit task
        await page.locator('button[type="submit"]').click();

        // Wait for task to be created
        await expect(page.locator('.task-status, [data-testid="task-status"]')).toBeVisible({ timeout: 10000 });

        await page.screenshot({ path: 'screenshots/task-submitted.png' });
    });
});

test.describe('Task Execution Flow', () => {
    test('should show real-time updates during task execution', async ({ page }) => {
        await page.goto('/');

        // Submit a task
        const taskInput = page.locator('textarea[name="description"], input[name="description"]');
        await taskInput.fill('Test task for verification');
        await page.locator('button[type="submit"]').click();

        // Wait for status updates
        await expect(page.locator('.trace-viewer, [data-testid="trace-viewer"]')).toBeVisible({ timeout: 15000 });

        // Check for iteration indicators
        const iterationElement = page.locator('.iteration, [data-testid="iteration"]');
        await expect(iterationElement).toBeVisible({ timeout: 30000 });

        await page.screenshot({ path: 'screenshots/task-progress.png' });
    });

    test('should display artifacts after task completion', async ({ page }) => {
        // Navigate to a completed task (assuming one exists)
        await page.goto('/');

        // Click on a task in the list (if available)
        const taskItem = page.locator('.task-item, [data-testid="task-item"]').first();

        if (await taskItem.isVisible()) {
            await taskItem.click();

            // Check for artifacts section
            await expect(page.locator('.artifacts, [data-testid="artifacts"]')).toBeVisible({ timeout: 5000 });

            await page.screenshot({ path: 'screenshots/task-artifacts.png' });
        }
    });
});

test.describe('Error Handling', () => {
    test('should show error for empty task description', async ({ page }) => {
        await page.goto('/');

        // Try to submit empty form
        await page.locator('button[type="submit"]').click();

        // Check for validation error
        const errorMessage = page.locator('.error, [data-testid="error"], .validation-error');
        await expect(errorMessage).toBeVisible();

        await page.screenshot({ path: 'screenshots/validation-error.png' });
    });
});
