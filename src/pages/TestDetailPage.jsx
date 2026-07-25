import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowRight,
  FlaskConical,
  CheckCircle,
  XCircle,
  Edit3,
  Lightbulb,
  Copy,
  Download,
  Info,
} from 'lucide-react'
import PageContainer from '../components/common/PageContainer.jsx'
import Badge from '../components/common/Badge.jsx'
import Button from '../components/common/Button.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import LoadingState from '../components/common/LoadingState.jsx'
import { getProjectById, getGeneratedTestById } from '../services/api.js'
import { formatRelativeTime } from '../utils/format.js'

const STATUS_TONE = { ready: 'success', draft: 'warning', rejected: 'error' }

export default function TestDetailPage() {
  const { projectId, testId } = useParams()
  const [pageStatus, setPageStatus] = useState('loading')
  const [project, setProject] = useState(null)
  const [test, setTest] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getProjectById(projectId), getGeneratedTestById(projectId, testId)]).then(
      ([proj, t]) => {
        if (cancelled) return
        if (!proj || !t) { setPageStatus('not-found'); return }
        setProject(proj)
        setTest(t)
        setFeedbackGiven(t.status !== 'draft' ? t.status : null)
        setPageStatus('loaded')
      },
    )
    return () => { cancelled = true }
  }, [projectId, testId])

  async function handleCopy() {
    if (!test?.testCode) return
    await navigator.clipboard.writeText(test.testCode)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  function handleFeedback(action) {
    // Week 1 wireframe — no API call yet. Week 2: POST /feedback
    setFeedbackGiven(action)
  }

  if (pageStatus === 'loading') return <PageContainer><LoadingState label="Loading test…" /></PageContainer>
  if (pageStatus === 'not-found') {
    return (
      <PageContainer>
        <EmptyState
          title="Test not found"
          description="This generated test may no longer exist."
          action={<Button as={Link} to={`/projects/${projectId}/generated-tests`}>Back to Generated Tests</Button>}
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* Breadcrumb */}
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/projects" className="hover:text-slate-700">Projects</Link>
        <ArrowRight size={12} aria-hidden="true" />
        <Link to={`/projects/${projectId}`} className="hover:text-slate-700">{project.name}</Link>
        <ArrowRight size={12} aria-hidden="true" />
        <Link to={`/projects/${projectId}/generated-tests`} className="hover:text-slate-700">Generated Tests</Link>
        <ArrowRight size={12} aria-hidden="true" />
        <span className="font-medium text-slate-900 font-mono truncate max-w-xs">{test.id}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <FlaskConical size={18} className="text-indigo-500 shrink-0" aria-hidden="true" />
            <Badge tone={STATUS_TONE[feedbackGiven ?? test.status]}>{feedbackGiven ?? test.status}</Badge>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 font-mono">{test.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Linked to <Link to={`/projects/${projectId}/pull-requests/${test.linkedPrId}`} className="font-mono text-indigo-600 hover:underline">{test.linkedPr}</Link>
            {test.generatedAt && <> · generated {formatRelativeTime(test.generatedAt)}</>}
          </p>
        </div>
      </div>

      {/* Demo notice */}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>Week 1 wireframe — accept/reject/modify are UI-only. Week 2: feedback is persisted via the feedback API.</span>
      </div>

      {/* Why this test */}
      {test.reasoning && (
        <div className="mt-6 rounded-lg border border-indigo-100 bg-indigo-50/60 px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={15} className="text-indigo-500" aria-hidden="true" />
            <span className="text-sm font-semibold text-indigo-800">Why this test?</span>
          </div>
          <p className="text-sm text-indigo-900 leading-relaxed">{test.reasoning}</p>
        </div>
      )}

      {/* Test code */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-900">Test code</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Copy size={12} aria-hidden="true" />
              {copySuccess ? 'Copied!' : 'Copy'}
            </button>
            <a
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(test.testCode ?? '')}`}
              download={`${test.id}.test`}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Download size={12} aria-hidden="true" />
              Download
            </a>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="bg-slate-800 px-4 py-2">
            <span className="text-xs font-mono text-slate-300">{test.title}</span>
          </div>
          <pre className="overflow-x-auto bg-slate-900 p-4 text-xs leading-relaxed text-emerald-300">
            {test.testCode ?? '// Test code will appear here once the generation Lambda runs.'}
          </pre>
        </div>
      </div>

      {/* Accept / Modify / Reject */}
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-900 mb-3">Review this test</p>

        {feedbackGiven ? (
          <div className="flex items-center gap-3">
            <CheckCircle size={16} className="text-emerald-500" aria-hidden="true" />
            <span className="text-sm text-slate-700">
              You marked this test as <strong>{feedbackGiven}</strong>.
            </span>
            <button type="button" onClick={() => setFeedbackGiven(null)} className="ml-auto text-xs text-slate-400 hover:text-slate-600 underline">
              Undo
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => handleFeedback('ready')} size="sm">
              <CheckCircle size={14} aria-hidden="true" />
              Accept
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleFeedback('modified')}>
              <Edit3 size={14} aria-hidden="true" />
              Modify
            </Button>
            <Button variant="danger" size="sm" onClick={() => handleFeedback('rejected')}>
              <XCircle size={14} aria-hidden="true" />
              Reject
            </Button>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
