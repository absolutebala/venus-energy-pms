import { PROJECTS, Project } from './seedData';

export { PROJECTS };

// Legacy export for backward compatibility
export const MOCK_PROJECTS = PROJECTS.map(p => ({
  ...p,
  poValue: p.poValue,
  vendor:  p.vendor,
}));

export const ALL_PROJECTS = MOCK_PROJECTS;
