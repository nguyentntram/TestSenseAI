# TestSense AI (Coco)

## 1. Project Overview

TestSense AI (internally nicknamed **Coco**) is an AI-powered testing assistant.
It is designed to learn from a repository's historical tests, bug fixes, pull
requests, and testing conventions, and to eventually use that history as
context for generating meaningful unit and integration tests for new pull
requests.

This repository currently contains the **Week 1 frontend prototype**: a
React + Vite + Tailwind CSS application that demonstrates the core user
flows with mock data. No backend, database, or AI services exist yet.

## 2. Problem Being Solved

Generic AI test generators only look at the diff in front of them. They
don't know:

- which edge cases your team has already been bitten by,
- what testing conventions and helper utilities your repository already uses,
- or which parts of the codebase are historically fragile.

TestSense AI aims to close that gap by building a "memory" of a
repository's testing history and bug fixes, then using that memory as
context when generating tests for new pull requests — producing tests that
are relevant to *this* codebase, not a generic one.

## 3. Main Planned Features

- Connect a GitHub repository and continuously index its history.
- Build a searchable "repository memory" from past bug fixes, PRs, and test
  patterns (using vector embeddings for retrieval).
- Automatically generate context-aware unit/integration tests for new pull
  requests, informed by that memory.
- Surface generated tests, memory entries, and pull request activity in a
  per-project workspace.
- Secure, permissioned access to connected repositories.

## 4. Week 1 Implemented Scope (This Repository)

This branch (`feature/frontend-scaffold`) implements the **frontend-only**
scaffold for the project:

- Landing page
- Projects list page
- Connect Repository mock flow (multi-step, local state only)
- Project workspace placeholder page
- 404 / Not Found page
- Shared component library (buttons, badges, cards, empty/loading states, etc.)
- Mock data + a placeholder service layer (`src/services/api.js`) designed to
  be swapped for real REST calls later

Nothing in this branch talks to GitHub, AWS, a database, or an AI model —
everything is mock data and local React state, by design.

## 5. Current Frontend Stack

- [React](https://react.dev/) (functional components + hooks)
- [Vite](https://vite.dev/) as the build tool / dev server
- Plain JavaScript (no TypeScript)
- [Tailwind CSS v4](https://tailwindcss.com/) (via `@tailwindcss/vite`)
- [React Router](https://reactrouter.com/) for client-side routing
- [Lucide React](https://lucide.dev/) for icons
- npm for package management
- ESLint for linting

## 6. Planned Full Stack

**Backend (future):**
- AWS Lambda
- API Gateway
- AWS Step Functions
- REST APIs
- GitHub Webhooks

**Database (future):**
- CockroachDB
- Vector embeddings for historical-memory retrieval

**AI (future):**
- Amazon Bedrock with Claude
- Embedding models

**Security (future):**
- Authentication and authorization
- API access control
- Repository permission management
- AWS Secrets Manager

None of the above exist in this repository yet. They are documented here so
the frontend is built with the eventual integration points in mind (see
"Explanation of the placeholder API service" below).

## 7. Prerequisites

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) — version 20 or later recommended (this
  project was built and verified against Node.js 22)
- npm (comes bundled with Node.js)

## 8. Installing Node.js (If It's Missing)

Check first — you may already have it (see the version-check section below).
If not:

- **Windows / macOS:** download the LTS installer from
  [nodejs.org](https://nodejs.org/) and run it.
- **macOS (Homebrew):**
  ```bash
  brew install node
  ```
- **Windows (winget):**
  ```powershell
  winget install OpenJS.NodeJS.LTS
  ```
- **Linux (nvm, recommended so you can manage versions):**
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  nvm install --lts
  ```

## 9. Verifying Node and npm Versions

```bash
node --version
npm --version
```

You should see Node `v20.x` or later, and an npm `10.x` or later.

## 10. Cloning the Repository

```bash
git clone https://github.com/nguyentntram/TestSenseAI.git
cd TestSenseAI
```

## 11. Switching to the Correct Branch

```bash
git switch develop
git pull origin develop
git switch -c feature/your-feature-name
```

This frontend scaffold itself lives on `feature/frontend-scaffold`, branched
from `develop`. If you specifically need to check out this scaffold branch:

```bash
git fetch origin
git switch feature/frontend-scaffold
```

## 12. Installing Dependencies

```bash
npm install
```

## 13. Starting the Development Server

```bash
npm run dev
```

Vite will print a local URL (typically `http://localhost:5173`). Open it in
your browser.

## 14. Running Lint

```bash
npm run lint
```

## 15. Creating a Production Build

```bash
npm run build
```

Output is written to `dist/`. Preview the production build locally with:

```bash
npm run preview
```

## 16. Folder Structure

```
src/
├── components/
│   ├── common/        # Generic, reusable UI primitives (Button, Badge, etc.)
│   ├── layout/         # App shell pieces (Navbar, Footer, AppLayout)
│   ├── projects/        # Components specific to the Projects page (ProjectCard)
│   └── repositories/    # Components specific to repository selection (RepositoryCard)
├── data/                # Mock data (projects, repositories)
├── pages/               # One component per route
├── routes/              # Route configuration (AppRoutes.jsx)
├── services/            # Placeholder API layer (api.js)
├── utils/               # Small shared helpers (date formatting, etc.)
├── App.jsx
├── main.jsx
└── index.css
```

## 17. Route Table

| Path                    | Page                    | Description                                   |
| ------------------------ | ------------------------ | ---------------------------------------------- |
| `/`                       | `LandingPage`             | Marketing/explainer landing page                |
| `/projects`               | `ProjectsPage`            | Searchable grid of connected (mock) projects    |
| `/connect-repository`     | `ConnectRepositoryPage`   | 5-step mock "connect a repository" flow         |
| `/projects/:projectId`    | `ProjectWorkspacePage`    | Per-project workspace with tabs                 |
| `*`                       | `NotFoundPage`            | 404 fallback for any unmatched route            |

## 18. Explanation of Mock Data

All mock data lives in `src/data/`, separate from pages and components:

- `src/data/projects.js` — three seeded mock projects (Payment Service,
  Inventory API, Authentication Service), each with consistent fields
  (language, test framework, default branch, memory count, sync status,
  pull requests, memory entries, generated tests, recent activity, and
  summary metrics).
- `src/data/repositories.js` — mock repositories used by the Connect
  Repository flow's "select a repository" step.

This data intentionally never changes shape — it mirrors the fields a real
API response would eventually contain, so pages can be rewired to a real
backend without changing their rendering logic.

## 19. Explanation of the Placeholder API Service

`src/services/api.js` exports a small set of `async` functions that stand in
for future REST calls:

- `getProjects()`
- `getProjectById(projectId)`
- `getRepositories()`
- `connectRepository(configuration)`

Each function currently reads from `src/data/*.js` and resolves after a
short artificial delay (to make loading states testable). When the real
backend (API Gateway + Lambda) exists, replace the body of each function
with a `fetch` call — the function signatures and return shapes are meant
to stay the same, so no page or component should need to change.

## 20. How Another Team Member Adds a Page

1. Create a new file in `src/pages/`, e.g. `src/pages/SettingsPage.jsx`.
2. Export a default functional component.
3. Register it in `src/routes/AppRoutes.jsx` (see the next section).
4. Reuse existing components from `src/components/common/` (`PageContainer`,
   `Button`, `EmptyState`, `LoadingState`, etc.) instead of rebuilding layout
   primitives.

## 21. How Another Team Member Adds a Route

Open `src/routes/AppRoutes.jsx` and add a `<Route>` inside the `<Route
element={<AppLayout />}>` block so the new page automatically gets the
shared navbar and footer:

```jsx
<Route path="/your-path" element={<YourNewPage />} />
```

Keep the catch-all `<Route path="*" element={<NotFoundPage />} />` last.

## 22. How Another Team Member Adds a Reusable Component

- Shared, generic UI (works anywhere, knows nothing about projects or
  repositories specifically) → `src/components/common/`.
- App shell pieces (navbar, footer, page layout wrappers) →
  `src/components/layout/`.
- Feature-specific display components (e.g. anything only the Projects page
  needs) → `src/components/projects/`.
- Feature-specific components for repository selection/connection →
  `src/components/repositories/`.

Favor small, focused components with props over configuration objects, and
follow the existing style: functional components, Tailwind utility classes,
no CSS modules or styled-components.

## 23. How Another Team Member Adds Mock Data

1. Add or extend a file in `src/data/` (e.g. `src/data/pullRequests.js` if a
   dataset grows large enough to deserve its own file).
2. Keep field names consistent with existing mock objects so components stay
   reusable.
3. If the new data should be reachable through the service layer, add a
   corresponding function to `src/services/api.js` (with the same `async` +
   artificial-delay pattern used by the existing functions) rather than
   importing `src/data/*.js` directly into a page or component.

## 24. Git Branch Workflow

- `main` — stable, deployable branch.
- `develop` — integration branch where feature branches merge.
- `feature/*` — one branch per feature or task, branched from `develop`.

```bash
git switch develop
git pull origin develop
git switch -c feature/your-feature-name
```

## 25. Pull Request Workflow

1. Push your feature branch:
   ```bash
   git push -u origin feature/your-feature-name
   ```
2. Open a pull request targeting `develop` (not `main`).
3. Make sure `npm run lint` and `npm run build` both pass before requesting
   review.
4. Get at least one teammate's review/approval before merging.
5. Prefer a small, focused PR over one that bundles unrelated changes.

## 26. Features Not Implemented Yet

By design, none of the following exist in this repository yet:

- Real GitHub OAuth or GitHub API calls
- Any AWS services (Lambda, API Gateway, Step Functions, Secrets Manager)
- CockroachDB or any real database
- Amazon Bedrock or any real AI/test-generation
- Real authentication or authorization
- Real backend APIs or webhooks
- Real repository indexing or memory building

Every "connected" repository, project, pull request, memory entry, and
generated test currently on screen is mock data.

## 27. Backend Prototypes (`backend/`)

The `backend/` folder holds a standalone Node.js prototype for choosing and
testing a Bedrock embedding model, used to design the "Similar Examples"
panel on the PR detail page (`src/components/prs/SimilarExamplesPanel.jsx`,
currently backed by mock data in `src/data/similarExamples.js`). It is not
wired into the frontend and has its own `npm install`/setup — see
[`backend/README.md`](backend/README.md) for the model choice, AWS
prerequisites, and how to run it.

## 28. Future Roadmap

- Wire `src/services/api.js` up to real REST endpoints backed by API
  Gateway + Lambda.
- Implement real GitHub OAuth and repository access permissions.
- Build the repository-memory indexing pipeline (CockroachDB + vector
  embeddings).
- Integrate Amazon Bedrock (Claude) for actual test generation.
- Add authentication, authorization, and secrets management.
- Replace mock sync/status data with real webhook-driven updates.

## 29. Security Notes

- This frontend prototype does not authenticate users and does not store or
  transmit real credentials — do not add real tokens, secrets, or `.env`
  values to this branch.
- The "Authorize GitHub" step in the Connect Repository flow is a **visual
  mock only**; it does not perform an OAuth handshake or contact GitHub.
- When the real backend is introduced, secrets (API keys, GitHub App
  credentials, etc.) must be managed via AWS Secrets Manager, never
  committed to the repository or hardcoded in frontend code.
