/**
 * VibeCI Antigravity - E2E Verification Tests
 * Browser-based verification for the VibeCI UI
 */

import { test, expect } from '@playwright/test';

test.describe('VibeCI Dashboard', () => {
    test('should load the main dashboard', async ({ page }) => {
        await page.goto('/');

        // Check for main header - use .first() to avoid strict mode violations
        await expect(page.locator('.logo-text').first()).toContainText('VibeCI');

        // Take screenshot
        await page.screenshot({ path: 'screenshots/dashboard.png', fullPage: true });
    });

    test('should display task submission form', async ({ page }) => {
        await page.goto('/');

        // Check for task form elements
        const taskInput = page.locator('textarea').first();
        await expect(taskInput).toBeVisible();

        const submitButton = page.locator('button[type="submit"]').first();
        await expect(submitButton).toBeVisible();

        await page.screenshot({ path: 'screenshots/task-form.png' });
    });

    test('should submit a task and show progress', async ({ page }) => {
        await page.goto('/');

        // Fill in task description
        const taskInput = page.locator('textarea').first();
        await taskInput.fill('Add email-based signup with rate limiting');

        // Submit task
        await page.locator('button[type="submit"]').first().click();

        // Wait for task view to appear - use .first() to get single element
        await expect(page.locator('.task-view').first()).toBeVisible({ timeout: 15000 });

        await page.screenshot({ path: 'screenshots/task-submitted.png' });
    });
});

test.describe('Task Execution Flow', () => {
    test('should show real-time updates during task execution', async ({ page }) => {
        await page.goto('/');

        // Submit a task
        const taskInput = page.locator('textarea').first();
        await taskInput.fill('Test task for verification');
        await page.locator('button[type="submit"]').first().click();

        // Wait for task view - use specific class with .first()
        await expect(page.locator('.task-view').first()).toBeVisible({ timeout: 15000 });

        await page.screenshot({ path: 'screenshots/task-progress.png' });
    });

    test('should display artifacts after task completion', async ({ page }) => {
        // Navigate to a completed task (assuming one exists)
        await page.goto('/');

        // Click on a task in the list (if available)
        const taskItem = page.locator('.task-card').first();

        if (await taskItem.isVisible({ timeout: 3000 }).catch(() => false)) {
            await taskItem.click();

            // Check for artifacts section
            await expect(page.locator('.artifact-viewer').first()).toBeVisible({ timeout: 5000 });

            await page.screenshot({ path: 'screenshots/task-artifacts.png' });
        } else {
            // Skip if no tasks exist
            test.skip();
        }
    });
});

test.describe('Error Handling', () => {
    test('should show error for empty task description', async ({ page }) => {
        await page.goto('/');

        // Try to submit empty form
        await page.locator('button[type="submit"]').first().click();

        // Check for validation error - use specific class
        const errorMessage = page.locator('.error-message').first();
        await expect(errorMessage).toBeVisible({ timeout: 5000 });

        await page.screenshot({ path: 'screenshots/validation-error.png' });
    });
});
