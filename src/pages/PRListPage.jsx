import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GitPullRequest, ArrowRight, Search, GitBranch, Info } from 'lucide-react'
import PageContainer from '../components/common/PageContainer.jsx'
import Badge from '../components/common/Badge.jsx'
import Button from '../components/common/Button.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import LoadingState from '../components/common/LoadingState.jsx'
import { getProjectById, getPullRequestsByProjectId } from '../services/api.js'
import { formatRelativeTime } from '../utils/format.js'

const STATUS_TONE = { open: 'info', merged: 'success', closed: 'neutral', draft: 'neutral' }

const WEBHOOK_STATUS = {
  analyzed: { label: 'Analyzed', tone: 'success' },
  analyzing: { label: 'Analyzing…', tone: 'info' },
  pending: { label: 'Pending', tone: 'neutral' },
  failed: { label: 'Failed', tone: 'error' },
}

const FILE_STATUS_COLOR = {
  added: 'text-emerald-600',
  modified: 'text-amber-600',
  deleted: 'text-red-500',
}

const FILTERS = ['All', 'Open', 'Merged', 'Closed']

export default function PRListPage() {
  const { projectId } = useParams()
  const [pageStatus, setPageStatus] = useState('loading')
  const [project, setProject] = useState(null)
  const [pullRequests, setPullRequests] = useState([])
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([getProjectById(projectId), getPullRequestsByProjectId(projectId)]).then(
      ([proj, prs]) => {
        if (cancelled) return
        if (!proj || !prs) {
          setPageStatus('not-found')
          return
        }
        setProject(proj)
        setPullRequests(prs)
        setPageStatus('loaded')
      },
    )
    return () => {
      cancelled = true
    }
  }, [projectId])

  if (pageStatus === 'loading') {
    return (
      <PageContainer>
        <LoadingState label="Loading pull requests…" />
      </PageContainer>
    )
  }

  if (pageStatus === 'not-found') {
    return (
      <PageContainer>
        <EmptyState
          title="Project not found"
          description="We couldn't find this project."
          action={
            <Button as={Link} to="/projects">
              Back to Projects
            </Button>
          }
        />
      </PageContainer>
    )
  }

  const counts = pullRequests.reduce(
    (acc, pr) => {
      acc[pr.status] = (acc[pr.status] ?? 0) + 1
      return acc
    },
    {},
  )

  const filtered = pullRequests.filter((pr) => {
    const matchesFilter = filter === 'All' || pr.status === filter.toLowerCase()
    const matchesSearch =
      search.trim() === '' ||
      pr.title.toLowerCase().includes(search.toLowerCase()) ||
      pr.id.toLowerCase().includes(search.toLowerCase()) ||
      pr.author.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <PageContainer>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/projects" className="hover:text-slate-700">
          Projects
        </Link>
        <ArrowRight size={12} aria-hidden="true" />
        <Link to={`/projects/${projectId}`} className="hover:text-slate-700">
          {project.name}
        </Link>
        <ArrowRight size={12} aria-hidden="true" />
        <span className="text-slate-900 font-medium">Pull Requests</span>
      </nav>

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <GitPullRequest size={22} className="text-indigo-500" aria-hidden="true" />
            Pull Requests
          </h1>
          <p className="mt-1 text-sm text-slate-500">{project.repositoryFullName}</p>
        </div>
      </div>

      {/* Demo notice */}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>Week 1 wireframe — PR data is mock. Real data will come from the GitHub webhook handler.</span>
      </div>

      {/* Summary counts */}
      <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-600">
        <span>
          <strong className="text-slate-900">{counts.open ?? 0}</strong> open
        </span>
        <span>
          <strong className="text-slate-900">{counts.merged ?? 0}</strong> merged
        </span>
        {counts.closed ? (
          <span>
            <strong className="text-slate-900">{counts.closed}</strong> closed
          </span>
        ) : null}
      </div>

      {/* Filters + search */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1" role="group" aria-label="Filter pull requests">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search pull requests…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-60"
          />
        </div>
      </div>

      {/* PR list */}
      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState
            title="No pull requests match"
            description="Try a different filter or search term."
          />
        ) : (
          <ul className="space-y-2">
            {filtered.map((pr) => (
              <PRCard key={pr.id} pr={pr} projectId={projectId} />
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  )
}

function PRCard({ pr, projectId }) {
  const totalFiles = pr.changedFiles?.length ?? 0
  const ws = WEBHOOK_STATUS[pr.webhookStatus] ?? WEBHOOK_STATUS.pending

  return (
    <li>
      <Link
        to={`/projects/${projectId}/pull-requests/${pr.id}`}
        className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3.5 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-slate-400">{pr.id}</span>
            <Badge tone={STATUS_TONE[pr.status]}>{pr.status}</Badge>
            {pr.labels?.map((label) => (
              <Badge key={label} tone="neutral">
                {label}
              </Badge>
            ))}
          </div>
          <p className="mt-1 text-sm font-medium text-slate-900 truncate">{pr.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>by {pr.author}</span>
            <span className="flex items-center gap-1">
              <GitBranch size={11} aria-hidden="true" />
              <span className="font-mono">{pr.branch.head}</span>
              <ArrowRight size={10} aria-hidden="true" />
              <span className="font-mono">{pr.branch.base}</span>
            </span>
            <span>{totalFiles} file{totalFiles !== 1 ? 's' : ''} changed</span>
            <span
              className={`font-medium ${
                pr.additions > 0 ? 'text-emerald-600' : ''
              }`}
            >
              +{pr.additions}
            </span>
            <span className="font-medium text-red-500">−{pr.deletions}</span>
            <span>updated {formatRelativeTime(pr.updatedAt)}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Badge tone={ws.tone}>{ws.label}</Badge>
          <ArrowRight size={14} className="text-slate-400" aria-hidden="true" />
        </div>
      </Link>
    </li>
  )
}
