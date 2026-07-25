import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowRight,
  GitPullRequest,
  GitBranch,
  GitCommitHorizontal,
  FileDiff,
  FlaskConical,
  CheckCircle,
  XCircle,
  Clock,
  Loader,
  Info,
  Plus,
  Minus,
  FileCode,
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
        if (!proj || !pullRequest) {
          setPageStatus('not-found')
          return
        }
        setProject(proj)
        setPr(pullRequest)
        setPageStatus('loaded')
      },
    )
    return () => {
      cancelled = true
    }
  }, [projectId, prId])

  if (pageStatus === 'loading') {
    return (
      <PageContainer>
        <LoadingState label="Loading pull request…" />
      </PageContainer>
    )
  }

  if (pageStatus === 'not-found') {
    return (
      <PageContainer>
        <EmptyState
          title="Pull request not found"
          description="This pull request may have been closed or doesn't exist."
          action={
            <Button as={Link} to={`/projects/${projectId}/pull-requests`}>
              Back to Pull Requests
            </Button>
          }
        />
      </PageContainer>
    )
  }

  const linkedTests = project.generatedTests.filter((t) =>
    (pr.generatedTestIds ?? []).includes(t.id),
  )

  return (
    <PageContainer>
      {/* Breadcrumb */}
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/projects" className="hover:text-slate-700">
          Projects
        </Link>
        <ArrowRight size={12} aria-hidden="true" />
        <Link to={`/projects/${projectId}`} className="hover:text-slate-700">
          {project.name}
        </Link>
        <ArrowRight size={12} aria-hidden="true" />
        <Link to={`/projects/${projectId}/pull-requests`} className="hover:text-slate-700">
          Pull Requests
        </Link>
        <ArrowRight size={12} aria-hidden="true" />
        <span className="font-medium text-slate-900 truncate max-w-xs">{pr.id}</span>
      </nav>

      {/* PR Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <GitPullRequest size={18} className="text-indigo-500 shrink-0" aria-hidden="true" />
            <span className="text-sm font-mono text-slate-400">#{pr.number}</span>
            <Badge tone={STATUS_TONE[pr.status]}>{pr.status}</Badge>
            {pr.labels?.map((label) => (
              <Badge key={label} tone="neutral">
                {label}
              </Badge>
            ))}
          </div>
          <h1 className="text-xl font-semibold text-slate-900">{pr.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Opened by <strong className="text-slate-700">{pr.author}</strong>{' '}
            {formatRelativeTime(pr.createdAt)} · updated {formatRelativeTime(pr.updatedAt)}
          </p>
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
        <div className="flex items-center gap-1.5">
          <GitBranch size={14} className="text-slate-400" aria-hidden="true" />
          <span className="font-mono text-xs">{pr.branch.head}</span>
          <ArrowRight size={12} className="text-slate-400" aria-hidden="true" />
          <span className="font-mono text-xs">{pr.branch.base}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <GitCommitHorizontal size={14} className="text-slate-400" aria-hidden="true" />
          <span>{pr.commitsCount} commit{pr.commitsCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileDiff size={14} className="text-slate-400" aria-hidden="true" />
          <span>{pr.changedFiles.length} file{pr.changedFiles.length !== 1 ? 's' : ''} changed</span>
        </div>
        <span className="font-medium text-emerald-600">+{pr.additions}</span>
        <span className="font-medium text-red-500">−{pr.deletions}</span>
      </div>

      {/* PR description */}
      {pr.description && (
        <div className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-sm text-slate-700 leading-relaxed">{pr.description}</p>
        </div>
      )}

      {/* Webhook analysis status banner */}
      <WebhookStatusBanner status={pr.webhookStatus} />

      {/* Demo notice */}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          Week 1 wireframe — diff and file changes are mock data. Real content will be fetched via
          the GitHub API when a webhook fires.
        </span>
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-slate-200">
        <nav className="-mb-px flex gap-4 overflow-x-auto" aria-label="Pull request sections">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? 'page' : undefined}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
              {tab === 'Generated Tests' && linkedTests.length > 0 && (
                <span className="ml-1.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700">
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
        {activeTab === 'Similar Examples' && (
          <SimilarExamplesPanel projectId={projectId} prId={pr.id} />
        )}
        {activeTab === 'Generated Tests' && (
          <GeneratedTestsTab tests={linkedTests} projectId={pr.id} />
        )}
      </div>
    </PageContainer>
  )
}

function WebhookStatusBanner({ status }) {
  const configs = {
    analyzed: {
      icon: CheckCircle,
      iconClass: 'text-emerald-500',
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-800',
      title: 'Analysis complete',
      body: 'Coco has analyzed this PR. Generated tests are available in the Generated Tests tab.',
    },
    analyzing: {
      icon: Loader,
      iconClass: 'text-indigo-500 animate-spin',
      bg: 'bg-indigo-50 border-indigo-200',
      text: 'text-indigo-800',
      title: 'Analyzing PR…',
      body: 'Coco is retrieving similar examples and generating test suggestions.',
    },
    pending: {
      icon: Clock,
      iconClass: 'text-slate-400',
      bg: 'bg-slate-50 border-slate-200',
      text: 'text-slate-700',
      title: 'Waiting for webhook',
      body: 'No webhook event received yet. Tests will be generated when GitHub sends a pull_request event.',
    },
    failed: {
      icon: XCircle,
      iconClass: 'text-red-500',
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      title: 'Analysis failed',
      body: 'Coco could not complete analysis for this PR. Check the webhook logs or re-trigger manually.',
    },
  }

  const c = configs[status] ?? configs.pending
  const Icon = c.icon

  return (
    <div className={`mt-5 flex items-start gap-3 rounded-lg border px-4 py-3 ${c.bg}`}>
      <Icon size={16} className={`mt-0.5 shrink-0 ${c.iconClass}`} aria-hidden="true" />
      <div>
        <p className={`text-sm font-medium ${c.text}`}>{c.title}</p>
        <p className={`mt-0.5 text-xs ${c.text} opacity-80`}>{c.body}</p>
      </div>
    </div>
  )
}

function ChangedFilesTab({ pr }) {
  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        {pr.changedFiles.length} file{pr.changedFiles.length !== 1 ? 's' : ''} changed · +
        {pr.additions} −{pr.deletions}
      </p>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white overflow-hidden">
        {pr.changedFiles.map((file) => {
          const fb = FILE_STATUS_BADGE[file.status] ?? FILE_STATUS_BADGE.modified
          return (
            <li
              key={file.path}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileCode size={14} className="text-slate-400 shrink-0" aria-hidden="true" />
                <span className="font-mono text-xs text-slate-800 break-all">{file.path}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge tone={fb.tone}>{fb.label}</Badge>
                <span className="text-xs font-medium text-emerald-600">+{file.additions}</span>
                <span className="text-xs font-medium text-red-500">−{file.deletions}</span>
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
    <div className="hidden sm:flex h-2 w-16 overflow-hidden rounded-full bg-slate-200" title={`+${additions} −${deletions}`}>
      <div className="bg-emerald-400" style={{ width: `${addPct}%` }} />
      <div className="bg-red-400 flex-1" />
    </div>
  )
}

function DiffTab({ pr }) {
  const lines = pr.diff.split('\n')

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-300">Diff</span>
        <span className="text-xs text-slate-400">
          +{pr.additions} / −{pr.deletions} (mock — real diff from GitHub API)
        </span>
      </div>
      <pre className="overflow-x-auto bg-slate-900 p-4 text-xs leading-relaxed">
        {lines.map((line, i) => (
          <DiffLine key={i} line={line} />
        ))}
      </pre>
    </div>
  )
}

function DiffLine({ line }) {
  let className = 'text-slate-400'
  if (line.startsWith('+') && !line.startsWith('+++')) className = 'text-emerald-400 bg-emerald-900/30 block'
  else if (line.startsWith('-') && !line.startsWith('---')) className = 'text-red-400 bg-red-900/30 block'
  else if (line.startsWith('@@')) className = 'text-indigo-400'
  else if (line.startsWith('diff ') || line.startsWith('---') || line.startsWith('+++'))
    className = 'text-slate-300 font-semibold'

  return <span className={`${className} min-w-full inline-block`}>{line}{'\n'}</span>
}

const TEST_STATUS_TONE = { ready: 'success', draft: 'warning' }

function GeneratedTestsTab({ tests }) {
  if (tests.length === 0) {
    return (
      <EmptyState
        title="No tests generated yet"
        description="Tests will appear here once Coco has analyzed this pull request."
      />
    )
  }

  return (
    <ul className="space-y-3">
      {tests.map((test) => (
        <li
          key={test.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
        >
          <div className="flex items-start gap-2">
            <FlaskConical size={14} className="text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-slate-900 font-mono">{test.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">Linked to {test.linkedPr}</p>
            </div>
          </div>
          <Badge tone={TEST_STATUS_TONE[test.status]}>{test.status}</Badge>
        </li>
      ))}
    </ul>
  )
}
