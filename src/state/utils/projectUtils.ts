/**
 * projectUtils.ts
 * ----------------
 * Small pure helpers for reading/updating the active project.
 */

import type { ProjectState } from "../../features/project/openProject";

export function findActiveProject(
  projects: ProjectState[],
  activeProjectId?: string
): ProjectState | null {
  if (!activeProjectId) return null;
  return projects.find((p) => p.id === activeProjectId) ?? null;
}

export function mapActiveProject(
  projects: ProjectState[],
  activeProjectId: string | undefined,
  updater: (p: ProjectState) => ProjectState
): ProjectState[] {
  if (!activeProjectId) return projects;
  let changed = false;
  const next = projects.map((p) => {
    if (p.id !== activeProjectId) return p;
    const updated = updater(p);
    if (updated !== p) changed = true;
    return updated;
  });
  return changed ? next : projects;
}
