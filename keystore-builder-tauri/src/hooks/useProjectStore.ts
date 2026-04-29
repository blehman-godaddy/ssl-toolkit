import { useState, useEffect } from 'react';
import { Project } from '../types';

// Simple localStorage-based persistence for the renderer process
// In a production app, you'd use electron-store via IPC

const STORAGE_KEY = 'keystore-builder-project';

export function useProjectStore(initialProject: Project) {
  const [project, setProject] = useState<Project>(() => {
    // Load saved project on mount
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate pre-flattened format: { keystoreFormat: 'P12', p12Extension: 'pfx' } -> 'PFX'
        if (parsed.keystoreFormat === 'P12' && parsed.p12Extension === 'pfx') {
          parsed.keystoreFormat = 'PFX';
        }
        delete parsed.p12Extension;
        return { ...initialProject, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load saved project:', error);
    }
    return initialProject;
  });

  // Save project whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  }, [project]);

  const updateProject = (updates: Partial<Project>) => {
    setProject(prev => ({ ...prev, ...updates }));
  };

  const resetProject = () => {
    setProject(initialProject);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { project, updateProject, resetProject, setProject };
}
