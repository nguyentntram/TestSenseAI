import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  GitBranch,
  GitPullRequest,
  Database,
  FlaskConical,
  Settings,
  AlertTriangle,
  LogIn,
  ArrowRight,
} from 'lucide-react'
import PageContainer from '../components/common/PageContainer.jsx'
import Badge from '../components/common/Badge.jsx'
import Button from '../components/common/Button.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import LoadingState from '../components/common/LoadingState.jsx'
import {
  getProjectById,
  updateProject,
  deleteProject,
  beginGitHubLogin,
  getPullRequestsByProjectId,
} from '../services/api.js'
import { ApiError } from '../services/ApiError.js'
import { formatRelativeTime } from '../utils/format.js'
import { usePageTitle } from '../hooks/usePageTitle.js'

const SYNC_STATUS_TONE = {
  pending: 'neutral',
  synced: 'success',
  syncing: 'info',
  error: 'error',
}

const SYNC_STATUS_LABEL = {
  pending: 'Pending',
  synced: 'Synced',
  syncing: 'Syncing…',
  error: 'Sync error',
}

const TABS = ['Overview', 'Pull Requests', 'Memory', 'Generated Tests', 'Analytics', 'Settings']

const INPUT_CLASS = 'mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/40'
const LABEL_CLASS = 'block text-sm font-medium text-slate-400'

export default function ProjectWorkspacePage() {
  const { projectId } = useParams()
  const [status, setStatus] = useState('loading')
  const [project, setProject] = useState(null)
  const [activeTab, setActiveTab] = useState('Overview')
  usePageTitle(project?.name ?? null)

  useEffect(() => {
    let cancelled = false
    getProjectById(projectId)
      .then((data) => {
        if (cancelled) return
        if (data) { setProject(data); setStatus('loaded') }
        else setStatus('not-found')
      })
      .catch((err) => {
        if (cancelled) return
        setStatus(err instanceof ApiError && err.status === 401 ? 'unauthenticated' : 'error')
      })
    return () => { cancelled = true }
  }, [projectId])

  if (status === 'loading') return <PageContainer><LoadingState label="Loading project…" /></PageContainer>

  if (status === 'unauthenticated') return (
    <PageContainer>
      <EmptyState icon={LogIn} title="Sign in to view this project"
        description="This project is tied to your GitHub account. Sign in to continue."
        action={<Button onClick={() => beginGitHubLogin(`/projects/${projectId}`)}>Sign in with GitHub</Button>} />
    </PageContainer>
  )

  if (status === 'error') return (
    <PageContainer>
      <EmptyState icon={AlertTriangle} title="Couldn't load this project"
        description="Something went wrong while contacting the backend. Please try again."
        action={<Button onClick={() => window.location.reload()}>Retry</Button>} />
    </PageContainer>
  )

  if (status === 'not-found') return (
    <PageContainer>
      <EmptyState title="Project not found"
        description={`We couldn't find a project matching "${projectId}".`}
        action={<Button as={Link} to="/projects">Back to Projects</Button>} />
    </PageContainer>
  )

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          {project.description && <p className="mt-1 text-sm text-slate-500">{project.description}</p>}
        </div>
        <Badge tone={SYNC_STATUS_TONE[project.syncStatus] ?? 'neutral'}>
          {SYNC_STATUS_LABEL[project.syncStatus] ?? project.syncStatus}
        </Badge>
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-500">
        <dd>{project.repositoryFullName}</dd>
        {project.language && <dd>{project.language}</dd>}
        {project.testFramework && <dd>{project.testFramework}</dd>}
        <dd className="flex items-center gap-1">
          <GitBranch size={13} className="text-slate-600" aria-hidden="true" />
          {project.defaultBranch}
        </dd>
      </dl>

      {/* Tabs */}
      <div className="mt-8 border-b border-white/8">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Project sections">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? 'page' : undefined}
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none ${
                activeTab === tab
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'Overview' && <OverviewTab project={project} />}
        {activeTab === 'Pull Requests' && <PullRequestsTab project={project} />}
        {activeTab === 'Memory' && <MemoryTab project={project} />}
        {activeTab === 'Generated Tests' && <GeneratedTestsTab project={project} />}
        {activeTab === 'Analytics' && <AnalyticsRedirect projectId={project.id} />}
        {activeTab === 'Settings' && <SettingsTab project={project} onProjectChange={setProject} />}
      </div>
    </PageContainer>
  )
}

function OverviewTab({ project }) {
  const hasMockMetrics = Boolean(project.metrics)
  return (
    <div>
      {hasMockMetrics && (
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard icon={FlaskConical} label="Tests generated" value={project.metrics.testsGenerated} />
          <MetricCard icon={GitPullRequest} label="PRs analyzed" value={project.metrics.pullRequestsAnalyzed} />
          <MetricCard icon={Database} label="Coverage estimate" value={project.metrics.coverageEstimate} />
        </div>
      )}

      <h3 className="mt-8 text-sm font-semibold text-slate-400 uppercase tracking-wide">Recent activity</h3>
      {project.recentActivity?.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {project.recentActivity.map((entry) => (
            <li key={entry.id} className="flex items-start justify-between gap-4 rounded-lg border border-white/8 bg-white/3 px-4 py-3 text-sm">
              <span className="text-slate-300">{entry.message}</span>
              <span className="shrink-0 text-xs text-slate-600">{formatRelativeTime(entry.timestamp)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3">
          <EmptyState title="No activity yet" description="Repository indexing and sync activity will appear here." />
        </div>
      )}
    </div>
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

const PR_STATUS_TONE = { open: 'info', merged: 'success', closed: 'neutral' }

function PullRequestsTab({ project }) {
  const [pullRequests, setPullRequests] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getPullRequestsByProjectId(project.id)
      .then((data) => {
        if (cancelled) return
        setPullRequests(data ?? [])
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setPullRequests([])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [project.id])

  if (loading) return <LoadingState label="Loading pull requests…" />

  if (!pullRequests.length) {
    return (
      <EmptyState
        title="No pull requests yet"
        description="Pull requests will appear here once the webhook is connected and a PR is opened in the repository."
      />
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">{pullRequests.length} pull requests</p>
        <Button as={Link} to={`/projects/${project.id}/pull-requests`} variant="secondary" size="sm">View all</Button>
      </div>
      <ul className="space-y-2">
        {pullRequests.map((pr) => (
          <li key={pr.id}>
            <Link to={`/projects/${project.id}/pull-requests/${pr.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/3 px-4 py-3 transition-all hover:border-white/15 hover:bg-white/5">
              <div>
                <p className="text-sm font-medium text-white">
                  #{pr.number ?? pr.id} — {pr.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  by {pr.author} · updated {formatRelativeTime(pr.updatedAt ?? pr.updated_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={PR_STATUS_TONE[pr.status]}>{pr.status}</Badge>
                <ArrowRight size={14} className="text-slate-600" aria-hidden="true" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MemoryTab({ project }) {
  const memoryEntries = project.memoryEntries ?? []
  if (memoryEntries.length === 0) return (
    <EmptyState title="No memory entries yet" description="Memory indexing will appear here once historical tests are ingested." />
  )
  return (
    <ul className="space-y-2">
      {memoryEntries.map((entry) => (
        <li key={entry.id} className="rounded-lg border border-white/8 bg-white/3 px-4 py-3.5">
          <Badge tone="neutral">{entry.type}</Badge>
          <p className="mt-2 text-sm text-slate-300">{entry.summary}</p>
          <p className="mt-1 text-xs text-slate-600">Source: {entry.source}</p>
        </li>
      ))}
    </ul>
  )
}

const TEST_STATUS_TONE = { ready: 'success', draft: 'warning' }

function GeneratedTestsTab({ project }) {
  const generatedTests = project.generatedTests ?? []
  if (generatedTests.length === 0) return (
    <EmptyState title="No tests generated yet" description="Generated tests will appear here once a PR has been analyzed." />
  )
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">{generatedTests.length} generated test{generatedTests.length !== 1 ? 's' : ''}</p>
        <Button as={Link} to={`/projects/${project.id}/generated-tests`} variant="secondary" size="sm">View all</Button>
      </div>
      <ul className="space-y-2">
        {generatedTests.map((test) => (
          <li key={test.id}>
            <Link to={`/projects/${project.id}/generated-tests/${test.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/3 px-4 py-3 transition-all hover:border-white/15 hover:bg-white/5">
              <div>
                <p className="text-sm font-medium text-white font-mono">{test.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">Linked to {test.linkedPr}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={TEST_STATUS_TONE[test.status]}>{test.status}</Badge>
                <ArrowRight size={14} className="text-slate-600" aria-hidden="true" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AnalyticsRedirect({ projectId }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-sm text-slate-500">Analytics lives on its own page with similarity metrics and acceptance rate.</p>
      <Button as={Link} to={`/projects/${projectId}/analytics`}>View Analytics</Button>
    </div>
  )
}

function SettingsTab({ project, onProjectChange }) {
  const navigate = useNavigate()
  const [name, setName] = useState(project.name)
  const [defaultBranch, setDefaultBranch] = useState(project.defaultBranch)
  const [testFramework, setTestFramework] = useState(project.testFramework ?? '')
  const [saveState, setSaveState] = useState('idle')
  const [saveError, setSaveError] = useState('')
  const [deleteState, setDeleteState] = useState('idle')
  const [deleteError, setDeleteError] = useState('')

  async function handleSave(event) {
    event.preventDefault()
    setSaveState('saving')
    setSaveError('')
    try {
      const updated = await updateProject(project.id, { name, defaultBranch, testFramework: testFramework || undefined })
      onProjectChange(updated)
      setSaveState('saved')
    } catch (err) {
      setSaveState('error')
      setSaveError(err instanceof ApiError ? err.message : 'Could not save changes.')
    }
  }

  async function handleDelete() {
    setDeleteState('deleting')
    setDeleteError('')
    try {
      await deleteProject(project.id)
      navigate('/projects')
    } catch (err) {
      setDeleteState('error')
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete this project.')
    }
  }

  return (
    <div className="max-w-lg space-y-5">
      <form onSubmit={handleSave} className="rounded-xl border border-white/8 bg-white/4 p-5">
        <div className="flex items-center gap-2 text-slate-500 mb-5">
          <Settings size={15} aria-hidden="true" />
          <span className="text-xs font-medium uppercase tracking-wide">Project settings</span>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="settings-name" className={LABEL_CLASS}>Project name</label>
            <input id="settings-name" type="text" value={name}
              onChange={(e) => { setName(e.target.value); setSaveState('idle') }}
              className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="settings-branch" className={LABEL_CLASS}>Default branch</label>
            <input id="settings-branch" type="text" value={defaultBranch}
              onChange={(e) => { setDefaultBranch(e.target.value); setSaveState('idle') }}
              className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="settings-framework" className={LABEL_CLASS}>Test framework</label>
            <input id="settings-framework" type="text" value={testFramework}
              onChange={(e) => { setTestFramework(e.target.value); setSaveState('idle') }}
              placeholder="e.g. Jest, Pytest, Go test"
              className={INPUT_CLASS} />
          </div>
        </div>
        {saveState === 'error' && <p className="mt-3 text-xs text-red-400">{saveError}</p>}
        {saveState === 'saved' && <p className="mt-3 text-xs text-emerald-400">Saved.</p>}
        <div className="mt-5">
          <Button type="submit" size="sm" disabled={saveState === 'saving' || !name.trim() || !defaultBranch.trim()}>
            {saveState === 'saving' ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>

      <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-5">
        <span className="text-xs font-medium uppercase tracking-wide text-red-500">Danger zone</span>
        <p className="mt-2 text-sm text-slate-500">
          Disconnecting removes this project from TestSense AI. Your GitHub repository is not affected.
        </p>
        {deleteError && <p className="mt-2 text-xs text-red-400">{deleteError}</p>}
        {deleteState !== 'confirming' ? (
          <Button variant="danger" size="sm" className="mt-4" onClick={() => setDeleteState('confirming')}>
            Disconnect project
          </Button>
        ) : (
          <div className="mt-4 flex items-center gap-2">
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleteState === 'deleting'}>
              {deleteState === 'deleting' ? 'Disconnecting…' : 'Confirm disconnect'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setDeleteState('idle')}>Cancel</Button>
          </div>
        )}
      </div>
    </div>
  )
}
