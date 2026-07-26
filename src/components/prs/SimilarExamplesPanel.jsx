import { useEffect, useState } from 'react'
import { Sparkles, GitPullRequest } from 'lucide-react'
import Badge from '../common/Badge.jsx'
import EmptyState from '../common/EmptyState.jsx'
import LoadingState from '../common/LoadingState.jsx'
import { getSimilarExamples } from '../../services/api.js'

const TYPE_TONE = { 'bug-fix': 'error', 'test-pattern': 'info', convention: 'neutral' }

export default function SimilarExamplesPanel({ projectId, prId }) {
  const [status, setStatus] = useState('loading')
  const [examples, setExamples] = useState([])

  useEffect(() => {
    let cancelled = false
    getSimilarExamples(projectId, prId).then((results) => {
      if (cancelled) return
      setExamples(results)
      setStatus('loaded')
    })
    return () => { cancelled = true }
  }, [projectId, prId])

  if (status === 'loading') return <LoadingState label="Finding similar examples…" />

  if (examples.length === 0) {
    return (
      <EmptyState
        title="No similar examples found"
        description="No related bug fixes, tests, or conventions have been indexed for this repository yet."
      />
    )
  }

  return (
    <div>
      <p className="mb-4 flex items-center gap-1.5 text-xs text-slate-500">
        <Sparkles size={13} className="text-indigo-400" aria-hidden="true" />
        Ranked by similarity to this pull request's diff
      </p>
      <ul className="space-y-3">
        {examples.map((example) => (
          <li key={example.id} className="rounded-xl border border-white/8 bg-white/4 px-4 py-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={TYPE_TONE[example.type] ?? 'neutral'}>{example.type}</Badge>
                  <span className="flex items-center gap-1 text-xs text-slate-600">
                    <GitPullRequest size={11} aria-hidden="true" />
                    {example.source}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-white">{example.title}</p>
              </div>
              <SimilarityScore score={example.score} />
            </div>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-[#0f0f1a] border border-white/5 px-3 py-2.5 text-xs text-slate-300 font-mono leading-relaxed">
              {example.snippet}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SimilarityScore({ score }) {
  const pct = Math.round(score * 100)
  return (
    <div className="flex shrink-0 items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-400">{pct}%</span>
    </div>
  )
}
