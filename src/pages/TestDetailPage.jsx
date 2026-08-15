import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle.js'
import {
  ArrowRight,
  FlaskConical,
  CheckCircle,
  XCircle,
  Edit3,
  Lightbulb,
  Copy,
  Download,
  MessageCircle,
  Send,
  Sparkles,
} from 'lucide-react'
import PageContainer from '../components/common/PageContainer.jsx'
import Badge from '../components/common/Badge.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import LoadingState from '../components/common/LoadingState.jsx'
import { getProjectById, getGeneratedTestById, chatAboutTest, saveFeedback } from '../services/api.js'
import { formatRelativeTime } from '../utils/format.js'

const STATUS_TONE = { ready: 'success', draft: 'warning', rejected: 'error' }

const SUGGESTED_QUESTIONS = [
  'Why was this generated?',
  'What edge cases does it cover?',
  'How can I improve it?',
  'How do I run this test?',
]

export default function TestDetailPage() {
  const { projectId, testId } = useParams()
  const [pageStatus, setPageStatus] = useState('loading')
  const [project, setProject] = useState(null)
  const [test, setTest] = useState(null)
  usePageTitle(test ? test.title : null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getProjectById(projectId), getGeneratedTestById(projectId, testId)]).then(
      ([proj, t]) => {
        if (cancelled) return
        if (!proj || !t) { setPageStatus('not-found'); return }
        setProject(proj)
        setTest(t)
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

  const UI_TO_API_ACTION = { ready: 'accept', modified: 'modify', rejected: 'reject' }

  async function handleFeedback(displayAction) {
    setFeedbackGiven(displayAction)
    const apiAction = UI_TO_API_ACTION[displayAction]
    if (apiAction) {
      try {
        await saveFeedback(projectId, testId, { action: apiAction })
      } catch (err) {
        console.error('Failed to save feedback:', err)
      }
    }
  }

  async function handleChatSend(e) {
    e.preventDefault()
    const message = chatInput.trim()
    if (!message || chatLoading) return
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', content: message }])
    setChatLoading(true)
    try {
      const history = chatMessages.map((m) => ({ role: m.role, content: m.content }))
      const { reply } = await chatAboutTest(projectId, testId, { message, history, test })
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I could not process that question. Please try again.' },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  if (pageStatus === 'loading') return <PageContainer><LoadingState label="Loading test…" /></PageContainer>
  if (pageStatus === 'not-found') {
    return (
      <PageContainer>
        <EmptyState
          title="Test not found"
          description="This generated test may no longer exist."
          action={
            <Link
              to={`/projects/${projectId}/generated-tests`}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Back to Generated Tests
            </Link>
          }
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* Breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm" aria-label="Breadcrumb">
        <Link to="/projects" className="text-slate-400 hover:text-slate-600 transition-colors">Projects</Link>
        <ArrowRight size={12} className="text-slate-300" aria-hidden="true" />
        <Link to={`/projects/${projectId}`} className="text-slate-400 hover:text-slate-600 transition-colors">{project.name}</Link>
        <ArrowRight size={12} className="text-slate-300" aria-hidden="true" />
        <Link to={`/projects/${projectId}/generated-tests`} className="text-slate-400 hover:text-slate-600 transition-colors">Generated Tests</Link>
        <ArrowRight size={12} className="text-slate-300" aria-hidden="true" />
        <span className="font-medium text-slate-700 font-mono truncate max-w-xs">{test.id}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <FlaskConical size={16} className="text-white" aria-hidden="true" />
            </div>
            <Badge tone={STATUS_TONE[feedbackGiven ?? test.status]}>{feedbackGiven ?? test.status}</Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-mono tracking-tight leading-tight">{test.title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Linked to{' '}
            <Link
              to={`/projects/${projectId}/pull-requests/${test.linkedPrId}`}
              className="font-mono text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              {test.linkedPr}
            </Link>
            {test.generatedAt && <> · generated {formatRelativeTime(test.generatedAt)}</>}
          </p>
        </div>
      </div>

      {/* Why this test — dark glow card */}
      {test.reasoning && (
        <div className="rounded-xl bg-[#0f0f17] border border-indigo-500/20 px-5 py-5 shadow-xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-2.5 mb-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/25">
              <Lightbulb size={13} className="text-indigo-400" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold text-indigo-400 tracking-widest uppercase">Why this test?</span>
          </div>
          <p className="relative text-sm text-slate-300 leading-relaxed">{test.reasoning}</p>
        </div>
      )}

      {/* Test code */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-900">Test code</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-all"
            >
              <Copy size={12} aria-hidden="true" />
              {copySuccess ? 'Copied!' : 'Copy'}
            </button>
            <a
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(test.testCode ?? '')}`}
              download={`${test.id}.test`}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-all"
            >
              <Download size={12} aria-hidden="true" />
              Download
            </a>
          </div>
        </div>
        <div className="rounded-xl border border-white/8 overflow-hidden shadow-xl shadow-black/30">
          {/* macOS window chrome */}
          <div className="bg-[#1c1c28] px-4 py-3 flex items-center gap-3 border-b border-white/5">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-sm" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e] shadow-sm" />
              <div className="w-3 h-3 rounded-full bg-[#28c840] shadow-sm" />
            </div>
            <span className="text-xs font-mono text-slate-500 select-none">{test.title}</span>
          </div>
          <pre className="overflow-x-auto bg-[#13131f] p-5 text-xs leading-loose text-emerald-300 font-mono">
            {test.testCode ?? '// Test code will appear here once the generation Lambda runs.'}
          </pre>
        </div>
      </div>

      {/* Review */}
      <div className="mt-6 rounded-xl border border-white/8 bg-white/4 p-5">
        <p className="text-sm font-semibold text-white mb-4">Review this test</p>

        {feedbackGiven ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/15">
              <CheckCircle size={14} className="text-emerald-400" aria-hidden="true" />
            </div>
            <span className="text-sm text-slate-300">
              Marked as <strong className="text-white">{feedbackGiven}</strong>
            </span>
            <button
              type="button"
              onClick={() => setFeedbackGiven(null)}
              className="ml-auto text-xs text-slate-500 hover:text-slate-300 underline transition-colors"
            >
              Undo
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => handleFeedback('ready')}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-emerald-900/40 hover:-translate-y-px active:translate-y-0 transition-all"
            >
              <CheckCircle size={14} aria-hidden="true" />
              Accept
            </button>
            <button
              type="button"
              onClick={() => handleFeedback('modified')}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/8 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/12 hover:text-white hover:-translate-y-px active:translate-y-0 transition-all"
            >
              <Edit3 size={14} aria-hidden="true" />
              Modify
            </button>
            <button
              type="button"
              onClick={() => handleFeedback('rejected')}
              className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/8 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/15 hover:border-red-500/30 hover:-translate-y-px active:translate-y-0 transition-all"
            >
              <XCircle size={14} aria-hidden="true" />
              Reject
            </button>
          </div>
        )}
      </div>

      {/* AI Chat — Cursor-inspired dark panel */}
      <div className="mt-6 rounded-xl overflow-hidden border border-slate-800/60 shadow-2xl shadow-slate-900/25">

        {/* Chat header */}
        <div className="bg-gradient-to-r from-[#0d0d16] to-[#111120] px-5 py-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/50">
              <Sparkles size={14} className="text-white" aria-hidden="true" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 blur-sm opacity-50 -z-10" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Ask about this test</p>
            </div>
          </div>
          {chatMessages.length > 0 && (
            <button
              type="button"
              onClick={() => setChatMessages([])}
              className="text-xs text-slate-600 hover:text-slate-300 transition-colors"
            >
              Clear chat
            </button>
          )}
        </div>

        {/* Messages area */}
        <div className="bg-[#090910] flex flex-col gap-4 px-5 py-5 min-h-[140px] max-h-96 overflow-y-auto">
          {chatMessages.length === 0 && !chatLoading && (
            <div className="flex flex-col items-center justify-center py-6 gap-5">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 border border-indigo-500/20">
                  <MessageCircle size={22} className="text-indigo-400" aria-hidden="true" />
                </div>
                <p className="text-sm text-slate-500 text-center max-w-xs leading-relaxed">
                  Ask anything about this test — coverage decisions, mock strategies, or how to extend it.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setChatInput(q)}
                    className="rounded-full border border-white/10 bg-white/4 px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/8 hover:border-white/20 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white shadow-md shadow-indigo-900/50 mb-0.5">
                  AI
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-br-sm shadow-lg shadow-indigo-900/40'
                    : 'bg-white/5 border border-white/8 text-slate-300 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {chatLoading && (
            <div className="flex items-end gap-2.5">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white shadow-md shadow-indigo-900/50">
                AI
              </div>
              <div className="bg-white/5 border border-white/8 rounded-2xl rounded-bl-sm px-4 py-3.5 flex gap-1.5 items-center">
                <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input */}
        <div className="bg-[#0d0d15] border-t border-white/5 px-4 py-3.5">
          <form onSubmit={handleChatSend} className="flex items-center gap-3">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about coverage, mocking, edge cases…"
              disabled={chatLoading}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40 disabled:opacity-40 transition-all"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-900/50 hover:shadow-indigo-900/70 hover:-translate-y-px disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 transition-all"
              aria-label="Send"
            >
              <Send size={15} aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>

    </PageContainer>
  )
}
