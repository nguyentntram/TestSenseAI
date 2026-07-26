import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Database, TrendingUp, Target, Layers, Search } from 'lucide-react'
import PageContainer from '../components/common/PageContainer.jsx'
import Badge from '../components/common/Badge.jsx'
import Button from '../components/common/Button.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import LoadingState from '../components/common/LoadingState.jsx'
import { getProjectById, getAnalyticsByProjectId } from '../services/api.js'
import { formatRelativeTime } from '../utils/format.js'

export default function AnalyticsPage() {
  const { projectId } = useParams()
  const [pageStatus, setPageStatus] = useState('loading')
  const [project, setProject] = useState(null)
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getProjectById(projectId), getAnalyticsByProjectId(projectId)]).then(
      ([proj, data]) => {
        if (cancelled) return
        if (!proj) { setPageStatus('not-found'); return }
        setProject(proj)
        setAnalytics(data)
        setPageStatus('loaded')
      },
    )
    return () => { cancelled = true }
  }, [projectId])

  if (pageStatus === 'loading') return <PageContainer><LoadingState label="Loading analytics…" /></PageContainer>
  if (pageStatus === 'not-found') return (
    <PageContainer>
      <EmptyState title="Project not found" description="We couldn't find this project."
        action={<Button as={Link} to="/projects">Back to Projects</Button>} />
    </PageContainer>
  )

  return (
    <PageContainer>
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
        <Link to="/projects" className="text-slate-500 hover:text-slate-300 transition-colors">Projects</Link>
        <ArrowRight size={12} className="text-slate-700" aria-hidden="true" />
        <Link to={`/projects/${projectId}`} className="text-slate-500 hover:text-slate-300 transition-colors">{project.name}</Link>
        <ArrowRight size={12} className="text-slate-700" aria-hidden="true" />
        <span className="text-slate-300">Memory & Analytics</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20">
            <Database size={18} className="text-indigo-400" aria-hidden="true" />
          </span>
          Memory & Analytics
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">{project.repositoryFullName}</p>
      </div>

      {/* Metrics */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Database} label="Memory entries" value={analytics.memoryCount} />
        <MetricCard icon={Search} label="Retrieval hits" value={analytics.retrievalHits} />
        <MetricCard icon={Target} label="Avg similarity" value={`${(analytics.avgSimilarity * 100).toFixed(0)}%`} />
        <MetricCard icon={TrendingUp} label="Acceptance rate" value={`${(analytics.acceptanceRate * 100).toFixed(0)}%`} />
      </div>

      {/* Similar examples */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={15} className="text-indigo-400" aria-hidden="true" />
          <h2 className="text-base font-semibold text-white">Similar Historical Examples</h2>
          <span className="ml-auto text-xs text-slate-600">Used during test generation</span>
        </div>
        {analytics.similarExamples.length === 0 ? (
          <EmptyState title="No examples yet" description="Historical tests will appear here after the memory pipeline runs." />
        ) : (
          <ul className="space-y-3">
            {analytics.similarExamples.map((example) => <SimilarExampleCard key={example.id} example={example} />)}
          </ul>
        )}
      </div>

      {/* Memory entries */}
      <div className="mt-10">
        <h2 className="text-base font-semibold text-white mb-4">Repository Memory</h2>
        {analytics.memoryEntries.length === 0 ? (
          <EmptyState title="No memory entries" description="Memory builds as pull requests and history are indexed." />
        ) : (
          <ul className="space-y-2">
            {analytics.memoryEntries.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-white/8 bg-white/3 px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge tone="neutral">{entry.type}</Badge>
                    <p className="mt-2 text-sm text-slate-300">{entry.summary}</p>
                    <p className="mt-1 text-xs text-slate-600">Source: {entry.source}</p>
                  </div>
                  {entry.indexedAt && (
                    <span className="shrink-0 text-xs text-slate-600">{formatRelativeTime(entry.indexedAt)}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  )
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/4 p-5">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={15} aria-hidden="true" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

function SimilarExampleCard({ example }) {
  return (
    <li className="rounded-xl border border-white/8 bg-white/3 px-4 py-3.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono text-slate-500">{example.sourceRef}</span>
            <SimilarityBar score={example.similarity} />
            <span className="text-xs font-medium text-indigo-400">
              {(example.similarity * 100).toFixed(0)}% match
            </span>
          </div>
          <p className="text-sm font-medium text-white font-mono">{example.testTitle}</p>
          <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{example.summary}</p>
        </div>
      </div>
    </li>
  )
}

function SimilarityBar({ score }) {
  const pct = Math.round(score * 100)
  const color = score >= 0.8 ? 'bg-emerald-400' : score >= 0.6 ? 'bg-amber-400' : 'bg-slate-600'
  return (
    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10" title={`${pct}% similarity`}>
      <div className={`${color} h-full`} style={{ width: `${pct}%` }} />
    </div>
  )
}
