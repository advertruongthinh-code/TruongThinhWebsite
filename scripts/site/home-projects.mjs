// Home page project strip (page-home R8): content/home-projects.json lists project ids; the build renders them with the shared
// project-slider block, the same strip as the Residential and Commercial pages. Invalid data stops the build.
export const HOME_PROJECTS_MIN = 3;
export const HOME_PROJECTS_MAX = 8;

// Returns the error list: an array of 3-8 unique ids that exist in projects.json.
export function validateHomeProjects(ids, projectIds) {
  if (!Array.isArray(ids) || ids.length < HOME_PROJECTS_MIN || ids.length > HOME_PROJECTS_MAX) {
    return [`home-projects: need ${HOME_PROJECTS_MIN}-${HOME_PROJECTS_MAX} project ids, got ${Array.isArray(ids) ? ids.length : typeof ids}`];
  }
  const errors = [];
  const seen = new Set();
  for (const [index, id] of ids.entries()) {
    if (!projectIds.has(id)) errors.push(`home-projects[${index}]: unknown project ${id}`);
    if (seen.has(id)) errors.push(`home-projects[${index}]: duplicate project ${id}`);
    seen.add(id);
  }
  return errors;
}
