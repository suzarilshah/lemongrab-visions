/**
 * Authentication System
 * Replaces Appwrite Auth with custom JWT-based authentication
 * Supports both bcrypt (new users) and argon2 (migrated from Appwrite)
 */
/**
 * Authentication System
 * Custom JWT-based authentication backed by Neon
 * Supports both bcrypt (new users) and argon2 (migrated from Appwrite)
 */
import { sql } from './db';
import bcrypt from 'bcryptjs';
import { argon2Verify } from 'hash-wasm';
import { SignJWT, jwtVerify } from 'jose';

// JWT Configuration
const JWT_SECRET = new TextEncoder().encode(
  import.meta.env.VITE_JWT_SECRET || 'octo-super-secret-key-change-in-production'
);
const JWT_ISSUER = 'octo';
const JWT_AUDIENCE = 'octo-app';
const TOKEN_EXPIRY = '7d'; // 7 days
const SESSION_KEY = 'octo_session';

// Password reset configuration
const RESET_TOKEN_EXPIRY_MINUTES = 30;
const RESET_SESSION_MARKER = 'password-reset';

// User type
export interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Database row types
interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

// JWT Payload type
interface JWTPayload {
  userId: string;
  email: string;
  exp?: number;
}

interface ResetSessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
}

/**
 * Hash a password using bcrypt (for new users)
 */
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 * Supports both bcrypt ($2) and argon2 ($argon2) hashes
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Detect hash type and verify accordingly
  if (hash.startsWith('$argon2')) {
    // Argon2 hash from Appwrite migration
    try {
      return await argon2Verify({
        password: password,
        hash: hash,
      });
    } catch (error) {
      console.error('[Auth] Argon2 verification error:', error);
      return false;
    }
  } else if (hash.startsWith('$2')) {
    // Bcrypt hash
    return bcrypt.compare(password, hash);
  } else {
    console.error('[Auth] Unknown password hash format');
    return false;
  }
}

/**
 * Generate a JWT token
 */
async function generateToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT token
 */
async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return payload as unknown as JWTPayload;
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    return null;
  }
}

/**
 * Create a new user account
 */
export async function createAccount(
  email: string,
  password: string,
  name?: string
): Promise<User> {
  const emailLower = email.toLowerCase();
  
  // Check if user already exists
  const existing = await sql`SELECT id FROM users WHERE email = ${emailLower}`;

  if (existing.length > 0) {
    throw new Error('A user with this email already exists');
  }

  // Validate password
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // Hash password with bcrypt
  const passwordHash = await hashPassword(password);

  // Generate a unique ID
  const id = crypto.randomUUID();

  // Insert user
  const result = await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (${id}, ${emailLower}, ${passwordHash}, ${name || null})
    RETURNING id, email, name, created_at, updated_at
  `;

  if (result.length === 0) {
    throw new Error('Failed to create user');
  }

  const user = result[0] as DbUser;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: false,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

/**
 * Create a new session (login)
 */
export async function createSession(
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  const emailLower = email.toLowerCase();
  
  // Find user
  const users = await sql`
    SELECT id, email, password_hash, name, created_at, updated_at 
    FROM users WHERE email = ${emailLower}
  `;

  if (users.length === 0) {
    throw new Error('Invalid email or password');
  }

  const dbUser = users[0] as DbUser;

  // Verify password (supports both bcrypt and argon2)
  const validPassword = await verifyPassword(password, dbUser.password_hash);
  if (!validPassword) {
    throw new Error('Invalid email or password');
  }

  // Generate JWT token
  const token = await generateToken({
    userId: dbUser.id,
    email: dbUser.email,
  });

  // Store token in localStorage
  localStorage.setItem(SESSION_KEY, token);

  const user: User = {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    emailVerified: false,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
  };

  return { user, token };
}

/**
 * Get current logged-in user
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = localStorage.getItem(SESSION_KEY);
  if (!token) {
    return null;
  }

  // Verify token
  const payload = await verifyToken(token);
  if (!payload) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  // Get user data
  const users = await sql`
    SELECT id, email, name, created_at, updated_at 
    FROM users WHERE id = ${payload.userId}
  `;

  if (users.length === 0) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  const dbUser = users[0] as DbUser;
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    emailVerified: false,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
  };
}

/**
 * Delete current session (logout)
 */
export async function deleteSession(): Promise<void> {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Update user password
 * When a migrated user (argon2) updates password, it will be stored as bcrypt
 */
export async function updatePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Validate new password
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // Get current password hash
  const users = await sql`SELECT password_hash FROM users WHERE id = ${user.id}`;

  if (users.length === 0) {
    throw new Error('User not found');
  }

  const dbUser = users[0] as { password_hash: string };

  // Verify current password
  const validPassword = await verifyPassword(currentPassword, dbUser.password_hash);
  if (!validPassword) {
    throw new Error('Current password is incorrect');
  }

  // Hash and update new password (always uses bcrypt)
  const newPasswordHash = await hashPassword(newPassword);
  await sql`UPDATE users SET password_hash = ${newPasswordHash} WHERE id = ${user.id}`;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Get current user ID (throws if not authenticated)
 */
export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user.id;
}

/**
 * Request a password reset token.
 * Generates a one-time token (valid for 30 minutes) and stores a hashed copy in the sessions table.
 * The plaintext token is returned to the caller to deliver out-of-band.
 */
export async function requestPasswordReset(email: string): Promise<{ resetToken: string; expiresAt: string }> {
  const emailLower = email.trim().toLowerCase();
  if (!emailLower) {
    throw new Error('Email is required');
  }

  const users = await sql`SELECT id FROM users WHERE email = ${emailLower}`;
  if (users.length === 0) {
    throw new Error('No account found for this email');
  }

  const userId = (users[0] as { id: string }).id;

  // Clean up any existing reset tokens for this user
  await sql`DELETE FROM sessions WHERE user_id = ${userId} AND user_agent = ${RESET_SESSION_MARKER}`;

  const resetToken = crypto.randomUUID();
  const tokenHash = await bcrypt.hash(resetToken, 10);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

  await sql`
    INSERT INTO sessions (id, user_id, token_hash, expires_at, user_agent)
    VALUES (${crypto.randomUUID()}, ${userId}, ${tokenHash}, ${expiresAt.toISOString()}, ${RESET_SESSION_MARKER})
  `;

  return { resetToken, expiresAt: expiresAt.toISOString() };
}

/**
 * Complete password reset using a valid token.
 */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  if (!token.trim()) {
    throw new Error('Reset token is required');
  }
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // Fetch recent reset tokens
  const rows = await sql`
    SELECT id, user_id, token_hash, expires_at
    FROM sessions
    WHERE user_agent = ${RESET_SESSION_MARKER} AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 200
  `;

  let matched: ResetSessionRow | null = null;
  for (const row of rows as ResetSessionRow[]) {
    const isMatch = await bcrypt.compare(token, row.token_hash);
    if (isMatch) {
      matched = row;
      break;
    }
  }

  if (!matched) {
    throw new Error('Invalid or expired reset token');
  }

  const newPasswordHash = await hashPassword(newPassword);
  await sql`UPDATE users SET password_hash = ${newPasswordHash} WHERE id = ${matched.user_id}`;

  // Remove the used token (and any other pending reset tokens for this user)
  await sql`DELETE FROM sessions WHERE user_id = ${matched.user_id} AND user_agent = ${RESET_SESSION_MARKER}`;
}

// Export for compatibility with existing code
export const account = {
  get: getCurrentUser,
  create: createAccount,
  createEmailPasswordSession: createSession,
  deleteSession: async () => deleteSession(),
  updatePassword,
  requestPasswordReset,
  resetPasswordWithToken,
};
