// Single switch between the real backend and the offline mock dataset.
// src/services/api.js reads this and re-exports one implementation or the
// other wholesale — pages never branch on this themselves, and mock/real
// behavior is never blended within one function.
export const API_MODE = import.meta.env.VITE_API_MODE === 'mock' ? 'mock' : 'real'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'
