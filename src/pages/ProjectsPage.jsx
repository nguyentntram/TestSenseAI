import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, FolderGit2, AlertTriangle, LogIn } from 'lucide-react'
import PageContainer from '../components/common/PageContainer.jsx'
import Button from '../components/common/Button.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import LoadingState from '../components/common/LoadingState.jsx'
import ProjectCard from '../components/projects/ProjectCard.jsx'
import { getProjects, beginGitHubLogin } from '../services/api.js'
import { ApiError } from '../services/ApiError.js'

export default function ProjectsPage() {
  const [status, setStatus] = useState('loading')
  const [projects, setProjects] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProjects() {
      setStatus('loading')
      try {
        const data = await getProjects()
        if (cancelled) return
        setProjects(data)
        setStatus('loaded')
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) {
          setStatus('unauthenticated')
        } else {
          setStatus('error')
        }
      }
    }

    loadProjects()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return projects
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(term) ||
        project.repositoryFullName.toLowerCase().includes(term) ||
        (project.language ?? '').toLowerCase().includes(term),
    )
  }, [projects, searchTerm])

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            Repositories TestSense AI is connected to and building memory for.
          </p>
        </div>
        <Button as={Link} to="/connect-repository">
          Connect Repository
        </Button>
      </div>

      <div className="mt-6">
        <label htmlFor="project-search" className="sr-only">
          Search projects
        </label>
        <div className="relative max-w-sm">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
            aria-hidden="true"
          />
          <input
            id="project-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, repository, or language"
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
          />
        </div>
      </div>

      <div className="mt-8">
        {status === 'loading' && <LoadingState label="Loading projects…" />}

        {status === 'unauthenticated' && (
          <EmptyState
            icon={LogIn}
            title="Sign in to see your projects"
            description="Your projects are tied to your GitHub account. Sign in to load them."
            action={
              <Button onClick={() => beginGitHubLogin('/projects')}>Sign in with GitHub</Button>
            }
          />
        )}

        {status === 'error' && (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load projects"
            description="Something went wrong while fetching your projects. Please try again."
            action={<Button onClick={() => window.location.reload()}>Retry</Button>}
          />
        )}

        {status === 'loaded' && projects.length === 0 && (
          <EmptyState
            icon={FolderGit2}
            title="No projects yet"
            description="Connect a GitHub repository to start building repository memory."
            action={
              <Button as={Link} to="/connect-repository">
                Connect Repository
              </Button>
            }
          />
        )}

        {status === 'loaded' && projects.length > 0 && filteredProjects.length === 0 && (
          <EmptyState
            icon={Search}
            title="No matching projects"
            description={`No projects match "${searchTerm}". Try a different search term.`}
            action={
              <Button variant="secondary" onClick={() => setSearchTerm('')}>
                Clear search
              </Button>
            }
          />
        )}

        {status === 'loaded' && filteredProjects.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
