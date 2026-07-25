import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Database, TrendingUp, Target, Layers, Info, Search } from 'lucide-react'
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
  if (pageStatus === 'not-found') {
    return (
      <PageContainer>
        <EmptyState title="Project not found" description="We couldn't find this project." action={<Button as={Link} to="/projects">Back to Projects</Button>} />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/projects" className="hover:text-slate-700">Projects</Link>
        <ArrowRight size={12} aria-hidden="true" />
        <Link to={`/projects/${projectId}`} className="hover:text-slate-700">{project.name}</Link>
        <ArrowRight size={12} aria-hidden="true" />
        <span className="font-medium text-slate-900">Memory & Analytics</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
          <Database size={22} className="text-indigo-500" aria-hidden="true" />
          Memory & Analytics
        </h1>
        <p className="mt-1 text-sm text-slate-500">{project.repositoryFullName}</p>
      </div>

      {/* Demo notice */}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>Week 1 wireframe — all data is mock. Real analytics come from Trung's embedding pipeline once historical tests are ingested.</span>
      </div>

      {/* Memory metrics */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Database} label="Memory entries" value={analytics.memoryCount} />
        <MetricCard icon={Search} label="Retrieval hits" value={analytics.retrievalHits} />
        <MetricCard icon={Target} label="Avg similarity" value={`${(analytics.avgSimilarity * 100).toFixed(0)}%`} />
        <MetricCard icon={TrendingUp} label="Acceptance rate" value={`${(analytics.acceptanceRate * 100).toFixed(0)}%`} />
      </div>

      {/* Similar examples panel */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={16} className="text-indigo-500" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900">Similar Historical Examples</h2>
          <span className="ml-auto text-xs text-slate-400">Used during test generation to retrieve relevant prior tests</span>
        </div>

        {analytics.similarExamples.length === 0 ? (
          <EmptyState title="No examples yet" description="Historical tests will appear here after the memory pipeline runs." />
        ) : (
          <ul className="space-y-3">
            {analytics.similarExamples.map((example) => (
              <SimilarExampleCard key={example.id} example={example} />
            ))}
          </ul>
        )}
      </div>

      {/* Memory entries */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Repository Memory</h2>
        {analytics.memoryEntries.length === 0 ? (
          <EmptyState title="No memory entries" description="Memory builds as pull requests and history are indexed." />
        ) : (
          <ul className="space-y-3">
            {analytics.memoryEntries.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge tone="neutral">{entry.type}</Badge>
                    <p className="mt-2 text-sm text-slate-700">{entry.summary}</p>
                    <p className="mt-1 text-xs text-slate-400">Source: {entry.source}</p>
                  </div>
                  {entry.indexedAt && (
                    <span className="shrink-0 text-xs text-slate-400">{formatRelativeTime(entry.indexedAt)}</span>
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
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon size={16} aria-hidden="true" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function SimilarExampleCard({ example }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-500">{example.sourceRef}</span>
            <SimilarityBar score={example.similarity} />
            <span className="text-xs font-medium text-indigo-600">
              {(example.similarity * 100).toFixed(0)}% match
            </span>
          </div>
          <p className="text-sm font-medium text-slate-900 font-mono">{example.testTitle}</p>
          <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{example.summary}</p>
        </div>
      </div>
    </li>
  )
}

function SimilarityBar({ score }) {
  const pct = Math.round(score * 100)
  const color = score >= 0.8 ? 'bg-emerald-400' : score >= 0.6 ? 'bg-amber-400' : 'bg-slate-300'
  return (
    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100" title={`${pct}% similarity`}>
      <div className={`${color} h-full`} style={{ width: `${pct}%` }} />
    </div>
  )
}
