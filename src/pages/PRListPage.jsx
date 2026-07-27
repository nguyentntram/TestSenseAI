import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GitPullRequest, ArrowRight, Search, GitBranch } from 'lucide-react'
import PageContainer from '../components/common/PageContainer.jsx'
import Badge from '../components/common/Badge.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
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
const FILTERS = ['All', 'Open', 'Merged', 'Closed']

export default function PRListPage() {
  const { projectId } = useParams()
  const [pageStatus, setPageStatus] = useState('loading')
  const [project, setProject] = useState(null)
  const [pullRequests, setPullRequests] = useState([])
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  usePageTitle(project ? `Pull Requests — ${project.name}` : null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getProjectById(projectId), getPullRequestsByProjectId(projectId)]).then(
      ([proj, prs]) => {
        if (cancelled) return
        if (!proj || !prs) { setPageStatus('not-found'); return }
        setProject(proj)
        setPullRequests(prs)
        setPageStatus('loaded')
      },
    )
    return () => { cancelled = true }
  }, [projectId])

  if (pageStatus === 'loading') return <PageContainer><LoadingState label="Loading pull requests…" /></PageContainer>
  if (pageStatus === 'not-found') return (
    <PageContainer>
      <EmptyState title="Project not found" description="We couldn't find this project."
        action={<Button as={Link} to="/projects">Back to Projects</Button>} />
    </PageContainer>
  )

  const counts = pullRequests.reduce((acc, pr) => { acc[pr.status] = (acc[pr.status] ?? 0) + 1; return acc }, {})
  const filtered = pullRequests.filter((pr) => {
    const matchesFilter = filter === 'All' || pr.status === filter.toLowerCase()
    const matchesSearch = search.trim() === '' ||
      pr.title.toLowerCase().includes(search.toLowerCase()) ||
      pr.id.toLowerCase().includes(search.toLowerCase()) ||
      pr.author.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <PageContainer>
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
        <Link to="/projects" className="text-slate-500 hover:text-slate-300 transition-colors">Projects</Link>
        <ArrowRight size={12} className="text-slate-700" aria-hidden="true" />
        <Link to={`/projects/${projectId}`} className="text-slate-500 hover:text-slate-300 transition-colors">{project.name}</Link>
        <ArrowRight size={12} className="text-slate-700" aria-hidden="true" />
        <span className="text-slate-300">Pull Requests</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20">
              <GitPullRequest size={18} className="text-indigo-400" aria-hidden="true" />
            </span>
            Pull Requests
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">{project.repositoryFullName}</p>
        </div>
      </div>

      {/* Summary counts */}
      <div className="mt-5 flex flex-wrap gap-5 text-sm text-slate-500">
        <span><strong className="text-white font-semibold">{counts.open ?? 0}</strong> open</span>
        <span><strong className="text-white font-semibold">{counts.merged ?? 0}</strong> merged</span>
        {counts.closed ? <span><strong className="text-white font-semibold">{counts.closed}</strong> closed</span> : null}
      </div>

      {/* Filters + search */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5" role="group" aria-label="Filter pull requests">
          {FILTERS.map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none ${
                filter === f
                  ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300'
                  : 'border border-white/8 bg-white/4 text-slate-400 hover:text-slate-200 hover:bg-white/8'
              }`}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" aria-hidden="true" />
          <input type="search" placeholder="Search pull requests…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 w-56" />
        </div>
      </div>

      {/* PR list */}
      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState title="No pull requests match" description="Try a different filter or search term." />
        ) : (
          <ul className="space-y-2">
            {filtered.map((pr) => <PRCard key={pr.id} pr={pr} projectId={projectId} />)}
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
      <Link to={`/projects/${projectId}/pull-requests/${pr.id}`}
        className="flex flex-col gap-3 rounded-lg border border-white/8 bg-white/3 px-4 py-3.5 transition-all hover:border-white/15 hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-slate-600">{pr.id}</span>
            <Badge tone={STATUS_TONE[pr.status]}>{pr.status}</Badge>
            {pr.labels?.map((label) => <Badge key={label} tone="neutral">{label}</Badge>)}
          </div>
          <p className="mt-1 text-sm font-medium text-white truncate">{pr.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>by {pr.author}</span>
            <span className="flex items-center gap-1">
              <GitBranch size={11} aria-hidden="true" />
              <span className="font-mono">{pr.branch.head}</span>
              <ArrowRight size={10} aria-hidden="true" />
              <span className="font-mono">{pr.branch.base}</span>
            </span>
            <span>{totalFiles} file{totalFiles !== 1 ? 's' : ''} changed</span>
            <span className="font-medium text-emerald-500">+{pr.additions}</span>
            <span className="font-medium text-red-400">−{pr.deletions}</span>
            <span>updated {formatRelativeTime(pr.updatedAt)}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Badge tone={ws.tone}>{ws.label}</Badge>
          <ArrowRight size={14} className="text-slate-600" aria-hidden="true" />
        </div>
      </Link>
    </li>
  )
}
