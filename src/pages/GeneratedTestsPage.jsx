import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FlaskConical, ArrowRight, Search, CheckCircle, Clock, XCircle } from 'lucide-react'
import PageContainer from '../components/common/PageContainer.jsx'
import Badge from '../components/common/Badge.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import Button from '../components/common/Button.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import LoadingState from '../components/common/LoadingState.jsx'
import { getProjectById, getGeneratedTestsByProjectId } from '../services/api.js'
import { formatRelativeTime } from '../utils/format.js'

const STATUS_TONE = { ready: 'success', draft: 'warning', rejected: 'error' }
const STATUS_ICON = { ready: CheckCircle, draft: Clock, rejected: XCircle }
const FILTERS = ['All', 'Ready', 'Draft', 'Rejected']

export default function GeneratedTestsPage() {
  const { projectId } = useParams()
  const [pageStatus, setPageStatus] = useState('loading')
  const [project, setProject] = useState(null)
  const [tests, setTests] = useState([])
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  usePageTitle(project ? `Generated Tests — ${project.name}` : null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getProjectById(projectId), getGeneratedTestsByProjectId(projectId)]).then(
      ([proj, testList]) => {
        if (cancelled) return
        if (!proj) { setPageStatus('not-found'); return }
        setProject(proj)
        setTests(testList ?? [])
        setPageStatus('loaded')
      },
    )
    return () => { cancelled = true }
  }, [projectId])

  if (pageStatus === 'loading') return <PageContainer><LoadingState label="Loading generated tests…" /></PageContainer>
  if (pageStatus === 'not-found') return (
    <PageContainer>
      <EmptyState title="Project not found" description="We couldn't find this project."
        action={<Button as={Link} to="/projects">Back to Projects</Button>} />
    </PageContainer>
  )

  const counts = tests.reduce((acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc }, {})
  const filtered = tests.filter((t) => {
    const matchesFilter = filter === 'All' || t.status === filter.toLowerCase()
    const matchesSearch = search.trim() === '' || t.title.toLowerCase().includes(search.toLowerCase()) || t.linkedPr.toLowerCase().includes(search.toLowerCase())
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
        <span className="text-slate-300">Generated Tests</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20">
              <FlaskConical size={18} className="text-indigo-400" aria-hidden="true" />
            </span>
            Generated Tests
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">{project.repositoryFullName}</p>
        </div>
      </div>

      {/* Summary counts */}
      <div className="mt-5 flex flex-wrap gap-5 text-sm text-slate-500">
        <span><strong className="text-white font-semibold">{counts.ready ?? 0}</strong> ready</span>
        <span><strong className="text-white font-semibold">{counts.draft ?? 0}</strong> draft</span>
        {(counts.rejected ?? 0) > 0 && <span><strong className="text-white font-semibold">{counts.rejected}</strong> rejected</span>}
      </div>

      {/* Filters + search */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5" role="group" aria-label="Filter tests">
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
          <input type="search" placeholder="Search tests…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 w-56" />
        </div>
      </div>

      {/* Test list */}
      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState title="No tests match" description="Try a different filter or search term." />
        ) : (
          <ul className="space-y-2">
            {filtered.map((test) => <TestCard key={test.id} test={test} projectId={projectId} />)}
          </ul>
        )}
      </div>
    </PageContainer>
  )
}

function TestCard({ test, projectId }) {
  const Icon = STATUS_ICON[test.status] ?? Clock
  const iconColor = test.status === 'ready' ? 'text-emerald-400' : test.status === 'rejected' ? 'text-red-400' : 'text-amber-400'

  return (
    <li>
      <Link to={`/projects/${projectId}/generated-tests/${test.id}`}
        className="flex flex-col gap-3 rounded-lg border border-white/8 bg-white/3 px-4 py-3.5 transition-all hover:border-white/15 hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <Icon size={15} className={`mt-0.5 shrink-0 ${iconColor}`} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white font-mono truncate">{test.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Linked to <span className="font-mono">{test.linkedPr}</span>
              {test.generatedAt && <> · {formatRelativeTime(test.generatedAt)}</>}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Badge tone={STATUS_TONE[test.status]}>{test.status}</Badge>
          <ArrowRight size={14} className="text-slate-600" aria-hidden="true" />
        </div>
      </Link>
    </li>
  )
}
