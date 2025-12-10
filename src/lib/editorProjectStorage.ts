/**
 * Editor Project Storage
 * CRUD operations for video timeline editor projects
 */

import { sql } from './db';
import { getCurrentUser } from './auth';
import { EditorProject } from '@/types/editor';

// Database row interface
interface EditorProjectRow {
  id: string;
  user_id: string;
  name: string;
  project_data: EditorProject;
  thumbnail_url: string | null;
  duration: string;
  fps: number;
  resolution_width: number;
  resolution_height: number;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Save a new editor project or update existing
 */
export async function saveEditorProject(project: EditorProject): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  // Check if project exists
  const existing = await sql`
    SELECT id FROM editor_projects WHERE id = ${project.id} AND user_id = ${user.id}
  `;

  if (existing.length > 0) {
    // Update existing project
    await sql`
      UPDATE editor_projects
      SET
        name = ${project.name},
        project_data = ${JSON.stringify(project)}::jsonb,
        duration = ${project.duration},
        fps = ${project.fps},
        resolution_width = ${project.resolution.width},
        resolution_height = ${project.resolution.height}
      WHERE id = ${project.id} AND user_id = ${user.id}
    `;
    return project.id;
  } else {
    // Create new project
    const result = await sql`
      INSERT INTO editor_projects (
        id, user_id, name, project_data, duration, fps, resolution_width, resolution_height
      ) VALUES (
        ${project.id},
        ${user.id},
        ${project.name},
        ${JSON.stringify(project)}::jsonb,
        ${project.duration},
        ${project.fps},
        ${project.resolution.width},
        ${project.resolution.height}
      )
      RETURNING id
    `;
    return result[0].id as string;
  }
}

/**
 * Load an editor project by ID
 */
export async function loadEditorProject(projectId: string): Promise<EditorProject | null> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const result = await sql`
    SELECT project_data FROM editor_projects
    WHERE id = ${projectId} AND user_id = ${user.id}
  `;

  if (result.length === 0) return null;

  return result[0].project_data as EditorProject;
}

/**
 * List all editor projects for the current user
 */
export async function listEditorProjects(limit = 50): Promise<{
  id: string;
  name: string;
  duration: number;
  status: string;
  thumbnailUrl: string | null;
  updatedAt: string;
  createdAt: string;
}[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const result = await sql`
    SELECT
      id, name, duration, status, thumbnail_url,
      updated_at, created_at
    FROM editor_projects
    WHERE user_id = ${user.id}
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `;

  return result.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    duration: parseFloat(row.duration as string) || 0,
    status: row.status as string,
    thumbnailUrl: row.thumbnail_url as string | null,
    updatedAt: row.updated_at as string,
    createdAt: row.created_at as string,
  }));
}

/**
 * Delete an editor project
 */
export async function deleteEditorProject(projectId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const result = await sql`
    DELETE FROM editor_projects
    WHERE id = ${projectId} AND user_id = ${user.id}
    RETURNING id
  `;

  return result.length > 0;
}

/**
 * Update project thumbnail
 */
export async function updateProjectThumbnail(projectId: string, thumbnailUrl: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  await sql`
    UPDATE editor_projects
    SET thumbnail_url = ${thumbnailUrl}
    WHERE id = ${projectId} AND user_id = ${user.id}
  `;
}

/**
 * Update project status
 */
export async function updateProjectStatus(
  projectId: string,
  status: 'draft' | 'exporting' | 'exported' | 'published'
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  await sql`
    UPDATE editor_projects
    SET status = ${status}
    WHERE id = ${projectId} AND user_id = ${user.id}
  `;
}

/**
 * Duplicate an editor project
 */
export async function duplicateEditorProject(projectId: string): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const original = await loadEditorProject(projectId);
  if (!original) throw new Error('Project not found');

  // Create a new project with a new ID
  const newProject: EditorProject = {
    ...original,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `${original.name} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return saveEditorProject(newProject);
}
