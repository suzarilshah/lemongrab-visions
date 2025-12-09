/**
 * Neon Database Client
 * Replaces Appwrite for database operations
 * 
 * Uses @neondatabase/serverless for HTTP-based PostgreSQL connections
 */
import { neon, NeonQueryFunction } from '@neondatabase/serverless';

// Database connection string from environment or hardcoded for development
const DATABASE_URL = import.meta.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_HzwxYc0l7bUG@ep-rough-base-a8o696s7-pooler.eastus2.azure.neon.tech/neondb?sslmode=require';

// Create SQL tagged template function
// neon() returns a function for tagged template queries
export const sql: NeonQueryFunction<false, false> = neon(DATABASE_URL);

// Helper type for database row
export interface DbRow {
  [key: string]: unknown;
}

/**
 * Execute a raw SQL query using tagged template
 * Usage: const result = await rawQuery`SELECT * FROM users WHERE id = ${userId}`;
 */
export const rawQuery = sql;

// Export database URL for debugging (masked)
export const getDatabaseUrl = () => DATABASE_URL.replace(/:[^:@]+@/, ':****@');
