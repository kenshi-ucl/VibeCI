/**
 * VibeCI Backend - Patcher Service
 * Unified diff application and file modification
 */

import * as diff from 'diff';
import fs from 'fs';
import path from 'path';
import type { Patch } from '../types/index.js';

/**
 * Apply a unified diff to file content
 */
export function applyUnifiedDiff(originalContent: string, diffText: string): string {
    // Parse the unified diff
    const patches = diff.parsePatch(diffText);

    if (patches.length === 0) {
        console.warn('No patches found in diff');
        return originalContent;
    }

    // Apply the first patch
    const result = diff.applyPatch(originalContent, patches[0]);

    if (result === false) {
        throw new Error('Failed to apply patch - content mismatch');
    }

    return result;
}

/**
 * Apply a patch to a file in the repository
 */
export function applyPatchToFile(repoPath: string, patch: Patch): void {
    const filePath = path.join(repoPath, patch.file);
    const dir = path.dirname(filePath);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Read existing content or start empty for new files
    let originalContent = '';
    if (fs.existsSync(filePath)) {
        originalContent = fs.readFileSync(filePath, 'utf-8');
    }

    try {
        // Try to apply as unified diff
        const newContent = applyUnifiedDiff(originalContent, patch.diff);
        fs.writeFileSync(filePath, newContent, 'utf-8');
    } catch (error) {
        // If diff application fails, try to extract content directly
        console.warn(`Diff application failed for ${patch.file}, attempting direct extraction`);
        const extractedContent = extractNewContent(patch.diff, originalContent);
        fs.writeFileSync(filePath, extractedContent, 'utf-8');
    }
}

/**
 * Extract new content from diff when unified diff parsing fails
 * This handles cases where the AI generates pseudo-diffs
 */
function extractNewContent(diffText: string, originalContent: string): string {
    const lines = diffText.split('\n');
    const newLines: string[] = [];
    let inDiff = false;

    for (const line of lines) {
        // Skip diff headers
        if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) {
            inDiff = true;
            continue;
        }

        if (!inDiff) continue;

        // Handle diff lines
        if (line.startsWith('+') && !line.startsWith('+++')) {
            // Added line
            newLines.push(line.slice(1));
        } else if (line.startsWith('-') && !line.startsWith('---')) {
            // Removed line - skip
            continue;
        } else if (line.startsWith(' ')) {
            // Context line
            newLines.push(line.slice(1));
        } else {
            // Regular line (no prefix)
            newLines.push(line);
        }
    }

    // If we couldn't extract anything, return original
    if (newLines.length === 0) {
        return originalContent;
    }

    return newLines.join('\n');
}

/**
 * Apply multiple patches to a repository
 */
export function applyPatches(repoPath: string, patches: Patch[]): { applied: string[]; failed: string[] } {
    const applied: string[] = [];
    const failed: string[] = [];

    for (const patch of patches) {
        try {
            applyPatchToFile(repoPath, patch);
            applied.push(patch.file);
            console.log(`Applied patch to: ${patch.file}`);
        } catch (error) {
            failed.push(patch.file);
            console.error(`Failed to apply patch to ${patch.file}:`, error);
        }
    }

    return { applied, failed };
}

/**
 * Generate a unified diff between two strings
 */
export function createUnifiedDiff(
    oldContent: string,
    newContent: string,
    oldFileName: string,
    newFileName: string
): string {
    return diff.createPatch(
        oldFileName,
        oldContent,
        newContent,
        'old',
        'new'
    );
}

/**
 * Create a patch from old and new file contents
 */
export function createPatch(
    filePath: string,
    oldContent: string,
    newContent: string
): Patch {
    const diffText = createUnifiedDiff(
        oldContent,
        newContent,
        `a/${filePath}`,
        `b/${filePath}`
    );

    return {
        file: filePath,
        diff: diffText,
    };
}

/**
 * Write file content directly (for new files or complete replacements)
 */
export function writeFileContent(repoPath: string, filePath: string, content: string): void {
    const fullPath = path.join(repoPath, filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, 'utf-8');
}

/**
 * Read file content
 */
export function readFileContent(repoPath: string, filePath: string): string {
    const fullPath = path.join(repoPath, filePath);

    if (!fs.existsSync(fullPath)) {
        return '';
    }

    return fs.readFileSync(fullPath, 'utf-8');
}
