import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowRight, GitPullRequest, GitBranch, GitCommitHorizontal,
  FileDiff, FlaskConical, CheckCircle, XCircle, Clock, Loader, Plus, Minus, FileCode,
} from 'lucide-react'
import PageContainer from '../components/common/PageContainer.jsx'
import Badge from '../components/common/Badge.jsx'
import Button from '../components/common/Button.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import LoadingState from '../components/common/LoadingState.jsx'
import SimilarExamplesPanel from '../components/prs/SimilarExamplesPanel.jsx'
import { getProjectById, getPullRequestById } from '../services/api.js'
import { formatRelativeTime } from '../utils/format.js'

const STATUS_TONE = { open: 'info', merged: 'success', closed: 'neutral', draft: 'neutral' }
const FILE_STATUS_BADGE = {
  added: { tone: 'success', label: 'added' },
  modified: { tone: 'warning', label: 'modified' },
  deleted: { tone: 'error', label: 'deleted' },
}
const TABS = ['Changed Files', 'Diff', 'Similar Examples', 'Generated Tests']

export default function PRDetailPage() {
  const { projectId, prId } = useParams()
  const [pageStatus, setPageStatus] = useState('loading')
  const [project, setProject] = useState(null)
  const [pr, setPr] = useState(null)
  const [activeTab, setActiveTab] = useState('Changed Files')

  useEffect(() => {
    let cancelled = false
    Promise.all([getProjectById(projectId), getPullRequestById(projectId, prId)]).then(
      ([proj, pullRequest]) => {
        if (cancelled) return
        if (!proj || !pullRequest) { setPageStatus('not-found'); return }
        setProject(proj)
        setPr(pullRequest)
        setPageStatus('loaded')
      },
    )
    return () => { cancelled = true }
  }, [projectId, prId])

  if (pageStatus === 'loading') return <PageContainer><LoadingState label="Loading pull request…" /></PageContainer>
  if (pageStatus === 'not-found') return (
    <PageContainer>
      <EmptyState title="Pull request not found"
        description="This pull request may have been closed or doesn't exist."
        action={<Button as={Link} to={`/projects/${projectId}/pull-requests`}>Back to Pull Requests</Button>} />
    </PageContainer>
  )

  const linkedTests = project.generatedTests.filter((t) => (pr.generatedTestIds ?? []).includes(t.id))

  return (
    <PageContainer>
      {/* Breadcrumb */}
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm" aria-label="Breadcrumb">
        <Link to="/projects" className="text-slate-500 hover:text-slate-300 transition-colors">Projects</Link>
        <ArrowRight size={12} className="text-slate-700" aria-hidden="true" />
        <Link to={`/projects/${projectId}`} className="text-slate-500 hover:text-slate-300 transition-colors">{project.name}</Link>
        <ArrowRight size={12} className="text-slate-700" aria-hidden="true" />
        <Link to={`/projects/${projectId}/pull-requests`} className="text-slate-500 hover:text-slate-300 transition-colors">Pull Requests</Link>
        <ArrowRight size={12} className="text-slate-700" aria-hidden="true" />
        <span className="text-slate-300 font-mono truncate max-w-xs">{pr.id}</span>
      </nav>

      {/* PR Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <GitPullRequest size={17} className="text-indigo-400 shrink-0" aria-hidden="true" />
            <span className="text-sm font-mono text-slate-500">#{pr.number}</span>
            <Badge tone={STATUS_TONE[pr.status]}>{pr.status}</Badge>
            {pr.labels?.map((label) => <Badge key={label} tone="neutral">{label}</Badge>)}
          </div>
          <h1 className="text-xl font-bold text-white">{pr.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Opened by <strong className="text-slate-300">{pr.author}</strong>{' '}
            {formatRelativeTime(pr.createdAt)} · updated {formatRelativeTime(pr.updatedAt)}
          </p>
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
        <div className="flex items-center gap-1.5">
          <GitBranch size={13} className="text-slate-600" aria-hidden="true" />
          <span className="font-mono text-xs">{pr.branch.head}</span>
          <ArrowRight size={11} className="text-slate-700" aria-hidden="true" />
          <span className="font-mono text-xs">{pr.branch.base}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <GitCommitHorizontal size={13} className="text-slate-600" aria-hidden="true" />
          <span>{pr.commitsCount} commit{pr.commitsCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileDiff size={13} className="text-slate-600" aria-hidden="true" />
          <span>{pr.changedFiles.length} file{pr.changedFiles.length !== 1 ? 's' : ''} changed</span>
        </div>
        <span className="font-medium text-emerald-400">+{pr.additions}</span>
        <span className="font-medium text-red-400">−{pr.deletions}</span>
      </div>

      {/* PR description */}
      {pr.description && (
        <div className="mt-5 rounded-lg border border-white/8 bg-white/3 px-4 py-3">
          <p className="text-sm text-slate-300 leading-relaxed">{pr.description}</p>
        </div>
      )}

      {/* Webhook status */}
      <WebhookStatusBanner status={pr.webhookStatus} />

      {/* Tabs */}
      <div className="mt-6 border-b border-white/8">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Pull request sections">
          {TABS.map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? 'page' : undefined}
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none ${
                activeTab === tab ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}>
              {tab}
              {tab === 'Generated Tests' && linkedTests.length > 0 && (
                <span className="ml-1.5 rounded-full bg-indigo-500/20 px-1.5 py-0.5 text-xs text-indigo-300">
                  {linkedTests.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'Changed Files' && <ChangedFilesTab pr={pr} />}
        {activeTab === 'Diff' && <DiffTab pr={pr} />}
        {activeTab === 'Similar Examples' && <SimilarExamplesPanel projectId={projectId} prId={pr.id} />}
        {activeTab === 'Generated Tests' && <GeneratedTestsTab tests={linkedTests} />}
      </div>
    </PageContainer>
  )
}

function WebhookStatusBanner({ status }) {
  const configs = {
    analyzed: {
      icon: CheckCircle, iconClass: 'text-emerald-400',
      cls: 'bg-emerald-500/10 border-emerald-500/20',
      titleCls: 'text-emerald-300', bodyCls: 'text-emerald-400/70',
      title: 'Analysis complete',
      body: 'This PR has been analyzed. Generated tests are available in the Generated Tests tab.',
    },
    analyzing: {
      icon: Loader, iconClass: 'text-indigo-400 animate-spin',
      cls: 'bg-indigo-500/10 border-indigo-500/20',
      titleCls: 'text-indigo-300', bodyCls: 'text-indigo-400/70',
      title: 'Analyzing PR…',
      body: 'Retrieving similar examples and generating test suggestions.',
    },
    pending: {
      icon: Clock, iconClass: 'text-slate-500',
      cls: 'bg-white/4 border-white/8',
      titleCls: 'text-slate-300', bodyCls: 'text-slate-500',
      title: 'Waiting for webhook',
      body: 'No webhook event received yet. Tests will be generated when GitHub sends a pull_request event.',
    },
    failed: {
      icon: XCircle, iconClass: 'text-red-400',
      cls: 'bg-red-500/10 border-red-500/20',
      titleCls: 'text-red-300', bodyCls: 'text-red-400/70',
      title: 'Analysis failed',
      body: 'Analysis could not complete for this PR. Check webhook logs or re-trigger manually.',
    },
  }
  const c = configs[status] ?? configs.pending
  const Icon = c.icon
  return (
    <div className={`mt-5 flex items-start gap-3 rounded-lg border px-4 py-3 ${c.cls}`}>
      <Icon size={15} className={`mt-0.5 shrink-0 ${c.iconClass}`} aria-hidden="true" />
      <div>
        <p className={`text-sm font-medium ${c.titleCls}`}>{c.title}</p>
        <p className={`mt-0.5 text-xs ${c.bodyCls}`}>{c.body}</p>
      </div>
    </div>
  )
}

function ChangedFilesTab({ pr }) {
  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        {pr.changedFiles.length} file{pr.changedFiles.length !== 1 ? 's' : ''} changed · +{pr.additions} −{pr.deletions}
      </p>
      <ul className="divide-y divide-white/5 rounded-xl border border-white/8 bg-white/3 overflow-hidden">
        {pr.changedFiles.map((file) => {
          const fb = FILE_STATUS_BADGE[file.status] ?? FILE_STATUS_BADGE.modified
          return (
            <li key={file.path} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode size={13} className="text-slate-600 shrink-0" aria-hidden="true" />
                <span className="font-mono text-xs text-slate-300 break-all">{file.path}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge tone={fb.tone}>{fb.label}</Badge>
                <span className="text-xs font-medium text-emerald-400">+{file.additions}</span>
                <span className="text-xs font-medium text-red-400">−{file.deletions}</span>
                <DiffBar additions={file.additions} deletions={file.deletions} />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function DiffBar({ additions, deletions }) {
  const total = additions + deletions
  if (total === 0) return null
  const addPct = Math.round((additions / total) * 100)
  return (
    <div className="hidden sm:flex h-2 w-16 overflow-hidden rounded-full bg-white/10" title={`+${additions} −${deletions}`}>
      <div className="bg-emerald-500" style={{ width: `${addPct}%` }} />
      <div className="bg-red-500 flex-1" />
    </div>
  )
}

function DiffTab({ pr }) {
  const lines = pr.diff.split('\n')
  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      <div className="bg-[#1c1c28] px-4 py-3 flex items-center gap-3 border-b border-white/5">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-xs font-mono text-slate-500">Diff</span>
        <span className="ml-auto text-xs text-slate-600">+{pr.additions} / −{pr.deletions}</span>
      </div>
      <pre className="overflow-x-auto bg-[#0f0f1a] p-4 text-xs font-mono leading-relaxed">
        {lines.map((line, i) => <DiffLine key={i} line={line} />)}
      </pre>
    </div>
  )
}

function DiffLine({ line }) {
  let cls = 'text-slate-500'
  if (line.startsWith('+') && !line.startsWith('+++')) cls = 'text-emerald-400 bg-emerald-500/10'
  else if (line.startsWith('-') && !line.startsWith('---')) cls = 'text-red-400 bg-red-500/10'
  else if (line.startsWith('@@')) cls = 'text-indigo-400'
  else if (line.startsWith('diff ') || line.startsWith('---') || line.startsWith('+++')) cls = 'text-slate-300'
  return <span className={`block w-full ${cls}`}>{line + '\n'}</span>
}

const TEST_STATUS_TONE = { ready: 'success', draft: 'warning' }

function GeneratedTestsTab({ tests }) {
  if (tests.length === 0) return (
    <EmptyState title="No tests generated yet" description="Tests will appear here once this pull request has been analyzed." />
  )
  return (
    <ul className="space-y-2">
      {tests.map((test) => (
        <li key={test.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/3 px-4 py-3">
          <div className="flex items-start gap-2">
            <FlaskConical size={13} className="text-slate-600 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-white font-mono">{test.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">Linked to {test.linkedPr}</p>
            </div>
          </div>
          <Badge tone={TEST_STATUS_TONE[test.status]}>{test.status}</Badge>
        </li>
      ))}
    </ul>
  )
}
