// Mock repository data used by the "Connect Repository" flow.
// Represents repositories that would normally come from the GitHub API.

export const repositories = [
  {
    id: 'repo-1',
    fullName: 'acme-corp/notifications-service',
    owner: 'acme-corp',
    name: 'notifications-service',
    description: 'Sends email, SMS, and push notifications for all internal services.',
    language: 'TypeScript',
    private: true,
    defaultBranch: 'main',
    updatedAt: '2026-07-17T11:00:00Z',
  },
  {
    id: 'repo-2',
    fullName: 'acme-corp/billing-worker',
    owner: 'acme-corp',
    name: 'billing-worker',
    description: 'Background jobs for invoice generation and dunning emails.',
    language: 'Python',
    private: true,
    defaultBranch: 'main',
    updatedAt: '2026-07-16T09:40:00Z',
  },
  {
    id: 'repo-3',
    fullName: 'acme-corp/frontend-shell',
    owner: 'acme-corp',
    name: 'frontend-shell',
    description: 'Shared React shell app that hosts internal admin tools.',
    language: 'JavaScript',
    private: false,
    defaultBranch: 'develop',
    updatedAt: '2026-07-15T20:05:00Z',
  },
  {
    id: 'repo-4',
    fullName: 'acme-corp/search-indexer',
    owner: 'acme-corp',
    name: 'search-indexer',
    description: 'Builds and refreshes search indexes from the product catalog.',
    language: 'Go',
    private: true,
    defaultBranch: 'main',
    updatedAt: '2026-07-12T14:25:00Z',
  },
]
