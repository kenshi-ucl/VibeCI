/**
 * Authentication Service
 * Handles user authentication operations
 * 
 * NOTE: This file is intentionally incomplete.
 * The email signup feature is NOT implemented.
 * VibeCI will be tasked with implementing it.
 */

import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { User, findUserByEmail, saveUser, emailExists, CreateUserInput } from './user';

export interface AuthResult {
    success: boolean;
    message: string;
    user?: User;
    token?: string;
}

export interface RateLimitEntry {
    count: number;
    firstAttempt: number;
}

// Rate limiting store (in-memory for demo)
const rateLimitStore: Map<string, RateLimitEntry> = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 5;

/**
 * Check rate limit for an IP address
 */
export function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitStore.get(ip);

    if (!entry) {
        rateLimitStore.set(ip, { count: 1, firstAttempt: now });
        return true;
    }

    // Reset if window has passed
    if (now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
        rateLimitStore.set(ip, { count: 1, firstAttempt: now });
        return true;
    }

    // Check if limit exceeded
    if (entry.count >= MAX_ATTEMPTS) {
        return false;
    }

    // Increment count
    entry.count++;
    return true;
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<AuthResult> {
    const user = findUserByEmail(email);

    if (!user) {
        return {
            success: false,
            message: 'Invalid email or password',
        };
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
        return {
            success: false,
            message: 'Invalid email or password',
        };
    }

    // Generate a simple token (for demo purposes)
    const token = uuidv4();

    return {
        success: true,
        message: 'Login successful',
        user,
        token,
    };
}

/**
 * Email-based signup
 * 
 * TODO: This function is NOT implemented!
 * The VibeCI agent should implement this feature with:
 * - Email validation
 * - Password hashing
 * - Rate limiting
 * - Duplicate email check
 */
export async function signup(input: CreateUserInput, ip: string): Promise<AuthResult> {
    // TODO: Implement email signup
    // This is intentionally left unimplemented for VibeCI to complete
    throw new Error('Not implemented: Email signup feature');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
    // Minimum 8 characters, at least one letter and one number
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
}

/**
 * Clear rate limit store (for testing)
 */
export function clearRateLimits(): void {
    rateLimitStore.clear();
}
