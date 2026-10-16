// Data Persistence Layer for BioNexus Studio
// Synchronizes with backend REST API when available, with resilient localStorage cache

const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location.port === '5000' ? '' : isLocalhost ? 'http://localhost:5000' : '');

function getUserStoragePrefix(userId) {
  if (!userId) return 'bionexus_guest_';
  return `bionexus_user_${userId}_`;
}

// -----------------------------------------------------------
// Projects
// -----------------------------------------------------------
export function getUserProjects(userId) {
  try {
    const key = `${getUserStoragePrefix(userId)}projects`;
    const stored = localStorage.getItem(key);
    if (!stored) {
      const defaultProj = [
        { id: `proj_def_${userId || 'guest'}`, name: 'My Research Project', description: 'Primary bioinformatics project workspace', createdAt: new Date().toISOString() }
      ];
      localStorage.setItem(key, JSON.stringify(defaultProj));
      return defaultProj;
    }
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveUserProjects(userId, projects) {
  try {
    const key = `${getUserStoragePrefix(userId)}projects`;
    localStorage.setItem(key, JSON.stringify(projects));

    // Async sync with backend
    fetch(`${API_BASE}/api/workspace/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projects)
    }).catch(() => {
      // Backend offline — safe local fallback
    });
  } catch (err) {
    console.error('Failed to save projects:', err);
  }
}

// -----------------------------------------------------------
// Sequences
// -----------------------------------------------------------
export function getUserSequences(userId) {
  try {
    const key = `${getUserStoragePrefix(userId)}sequences`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveUserSequences(userId, sequences) {
  try {
    const key = `${getUserStoragePrefix(userId)}sequences`;
    localStorage.setItem(key, JSON.stringify(sequences));

    // Async sync with backend
    fetch(`${API_BASE}/api/workspace/sequences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sequences)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save user sequences:', err);
  }
}

// -----------------------------------------------------------
// Primers
// -----------------------------------------------------------
export function getUserPrimers(userId) {
  try {
    const key = `${getUserStoragePrefix(userId)}primers`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveUserPrimers(userId, primers) {
  try {
    const key = `${getUserStoragePrefix(userId)}primers`;
    localStorage.setItem(key, JSON.stringify(primers));

    // Async sync with backend
    fetch(`${API_BASE}/api/workspace/primers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(primers)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save user primers:', err);
  }
}

// -----------------------------------------------------------
// Analyses
// -----------------------------------------------------------
export function getUserAnalyses(userId) {
  try {
    const key = `${getUserStoragePrefix(userId)}analyses`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveUserAnalyses(userId, analyses) {
  try {
    const key = `${getUserStoragePrefix(userId)}analyses`;
    localStorage.setItem(key, JSON.stringify(analyses));

    // Async sync with backend
    fetch(`${API_BASE}/api/workspace/analyses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(analyses)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save user analyses:', err);
  }
}
