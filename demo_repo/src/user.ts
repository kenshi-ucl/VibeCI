/**
 * User Model
 * Represents a user in the authentication system
 */

export interface User {
    id: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
    emailVerified: boolean;
}

export interface CreateUserInput {
    email: string;
    password: string;
}

export interface UserStore {
    users: Map<string, User>;
    emailIndex: Map<string, string>; // email -> id
}

/**
 * In-memory user store (for demo purposes)
 */
export const userStore: UserStore = {
    users: new Map(),
    emailIndex: new Map(),
};

/**
 * Find a user by ID
 */
export function findUserById(id: string): User | undefined {
    return userStore.users.get(id);
}

/**
 * Find a user by email
 */
export function findUserByEmail(email: string): User | undefined {
    const id = userStore.emailIndex.get(email.toLowerCase());
    if (!id) return undefined;
    return userStore.users.get(id);
}

/**
 * Check if email is already registered
 */
export function emailExists(email: string): boolean {
    return userStore.emailIndex.has(email.toLowerCase());
}

/**
 * Save a user to the store
 */
export function saveUser(user: User): void {
    userStore.users.set(user.id, user);
    userStore.emailIndex.set(user.email.toLowerCase(), user.id);
}

/**
 * Clear all users (for testing)
 */
export function clearUsers(): void {
    userStore.users.clear();
    userStore.emailIndex.clear();
}
