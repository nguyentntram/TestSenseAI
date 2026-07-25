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
    return () => {
      cancelled = true
    }
  }, [projectId, prId])

  if (status === 'loading') {
    return <LoadingState label="Finding similar examples…" />
  }

  if (examples.length === 0) {
    return (
      <EmptyState
        title="No similar examples found"
        description="Coco hasn't indexed any related bug fixes, tests, or conventions for this repository yet."
      />
    )
  }

  return (
    <div>
      <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
        <Sparkles size={14} className="text-indigo-500" aria-hidden="true" />
        Ranked by similarity to this pull request's diff and description
      </p>
      <ul className="space-y-3">
        {examples.map((example) => (
          <li
            key={example.id}
            className="rounded-lg border border-slate-200 bg-white px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={TYPE_TONE[example.type] ?? 'neutral'}>{example.type}</Badge>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <GitPullRequest size={12} aria-hidden="true" />
                    {example.source}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-slate-900">{example.title}</p>
              </div>
              <SimilarityScore score={example.score} />
            </div>
            <pre className="mt-2 overflow-x-auto rounded bg-slate-900 px-3 py-2 text-xs text-slate-200">
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
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-600">{pct}%</span>
    </div>
  )
}
