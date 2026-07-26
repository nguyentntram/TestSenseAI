import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  GitBranch,
  GitPullRequest,
  Database,
  FlaskConical,
  Settings,
  Info,
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

const TABS = ['Overview', 'Pull Requests', 'Memory', 'Generated Tests', 'Settings']

export default function ProjectWorkspacePage() {
  const { projectId } = useParams()
  const [status, setStatus] = useState('loading')
  const [project, setProject] = useState(null)
  const [activeTab, setActiveTab] = useState('Overview')

  useEffect(() => {
    let cancelled = false

    getProjectById(projectId)
      .then((data) => {
        if (cancelled) return
        if (data) {
          setProject(data)
          setStatus('loaded')
        } else {
          setStatus('not-found')
        }
      })
      .catch((err) => {
        if (cancelled) return
        setStatus(err instanceof ApiError && err.status === 401 ? 'unauthenticated' : 'error')
      })

    return () => {
      cancelled = true
    }
  }, [projectId])

  if (status === 'loading') {
    return (
      <PageContainer>
        <LoadingState label="Loading project…" />
      </PageContainer>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <PageContainer>
        <EmptyState
          icon={LogIn}
          title="Sign in to view this project"
          description="This project is tied to your GitHub account. Sign in to continue."
          action={
            <Button onClick={() => beginGitHubLogin(`/projects/${projectId}`)}>
              Sign in with GitHub
            </Button>
          }
        />
      </PageContainer>
    )
  }

  if (status === 'error') {
    return (
      <PageContainer>
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load this project"
          description="Something went wrong while contacting the backend. Please try again."
          action={<Button onClick={() => window.location.reload()}>Retry</Button>}
        />
      </PageContainer>
    )
  }

  if (status === 'not-found') {
    return (
      <PageContainer>
        <EmptyState
          title="Project not found"
          description={`We couldn't find a project matching "${projectId}". It may have been removed or never existed.`}
          action={
            <Button as={Link} to="/projects">
              Back to Projects
            </Button>
          }
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{project.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{project.description}</p>
        </div>
        <Badge tone={SYNC_STATUS_TONE[project.syncStatus] ?? 'neutral'}>
          {SYNC_STATUS_LABEL[project.syncStatus] ?? project.syncStatus}
        </Badge>
      </div>

      <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Repository</dt>
          <dd>{project.repositoryFullName}</dd>
        </div>
        {project.language && (
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Language</dt>
            <dd>{project.language}</dd>
          </div>
        )}
        {project.testFramework && (
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Test framework</dt>
            <dd>{project.testFramework}</dd>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <GitBranch size={14} className="text-slate-400" aria-hidden="true" />
          <dt className="sr-only">Default branch</dt>
          <dd>{project.defaultBranch}</dd>
        </div>
      </dl>

      <div className="mt-8 border-b border-slate-200">
        <nav className="-mb-px flex gap-4 overflow-x-auto" aria-label="Project sections">
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
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'Overview' && <OverviewTab project={project} />}
        {activeTab === 'Pull Requests' && <PullRequestsTab project={project} />}
        {activeTab === 'Memory' && <MemoryTab project={project} />}
        {activeTab === 'Generated Tests' && <GeneratedTestsTab project={project} />}
        {activeTab === 'Settings' && <SettingsTab project={project} onProjectChange={setProject} />}
      </div>
    </PageContainer>
  )
}

function DemoDataNotice() {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
      <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>These metrics are demo data, not live results.</span>
    </div>
  )
}

function OverviewTab({ project }) {
  const hasMockMetrics = Boolean(project.metrics)

  return (
    <div>
      {hasMockMetrics && (
        <>
          <DemoDataNotice />
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              icon={FlaskConical}
              label="Tests generated"
              value={project.metrics.testsGenerated}
            />
            <MetricCard
              icon={GitPullRequest}
              label="Pull requests analyzed"
              value={project.metrics.pullRequestsAnalyzed}
            />
            <MetricCard
              icon={Database}
              label="Estimated coverage"
              value={project.metrics.coverageEstimate}
            />
          </div>
        </>
      )}

      <h3 className="mt-8 text-sm font-semibold text-slate-900">Recent activity</h3>
      {project.recentActivity?.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {project.recentActivity.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <span className="text-slate-700">{entry.message}</span>
              <span className="shrink-0 text-xs text-slate-400">
                {formatRelativeTime(entry.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3">
          <EmptyState
            title="No activity yet"
            description="Repository indexing and sync activity will appear here once it begins."
          />
        </div>
      )}
    </div>
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
        <Button as={Link} to={`/projects/${project.id}/pull-requests`} variant="secondary" size="sm">
          View all
        </Button>
      </div>
      <ul className="space-y-3">
        {pullRequests.map((pr) => (
          <li key={pr.id}>
            <Link
              to={`/projects/${project.id}/pull-requests/${pr.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  #{pr.number ?? pr.id} — {pr.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  by {pr.author} · updated {formatRelativeTime(pr.updatedAt ?? pr.updated_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={PR_STATUS_TONE[pr.status]}>{pr.status}</Badge>
                <ArrowRight size={14} className="text-slate-400" aria-hidden="true" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

// `project.memoryEntries` only exists in the mock dataset — real memory
// indexing/retrieval is Trung's assigned work and isn't wired up yet.
function MemoryTab({ project }) {
  const memoryEntries = project.memoryEntries ?? []

  if (memoryEntries.length === 0) {
    return (
      <EmptyState
        title="Repository memory isn't connected yet"
        description="Memory indexing and retrieval is being built separately. Once available, relevant history for this project will show up here."
      />
    )
  }

  return (
    <ul className="space-y-3">
      {memoryEntries.map((entry) => (
        <li key={entry.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <Badge tone="neutral">{entry.type}</Badge>
          <p className="mt-2 text-sm text-slate-700">{entry.summary}</p>
          <p className="mt-1 text-xs text-slate-400">Source: {entry.source}</p>
        </li>
      ))}
    </ul>
  )
}

const TEST_STATUS_TONE = { ready: 'success', draft: 'warning' }

function GeneratedTestsTab({ project }) {
  const generatedTests = project.generatedTests ?? []

  if (generatedTests.length === 0) {
    return (
      <EmptyState
        title="No tests generated yet"
        description="Generated tests will appear here once test generation is built."
      />
    )
  }

  return (
    <ul className="space-y-3">
      {generatedTests.map((test) => (
        <li
          key={test.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-slate-900">{test.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">Linked to {test.linkedPr}</p>
          </div>
          <Badge tone={TEST_STATUS_TONE[test.status]}>{test.status}</Badge>
        </li>
      ))}
    </ul>
  )
}

function SettingsTab({ project, onProjectChange }) {
  const navigate = useNavigate()

  const [name, setName] = useState(project.name)
  const [defaultBranch, setDefaultBranch] = useState(project.defaultBranch)
  const [testFramework, setTestFramework] = useState(project.testFramework ?? '')
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const [saveError, setSaveError] = useState('')
  const [deleteState, setDeleteState] = useState('idle') // idle | confirming | deleting | error
  const [deleteError, setDeleteError] = useState('')

  async function handleSave(event) {
    event.preventDefault()
    setSaveState('saving')
    setSaveError('')
    try {
      const updated = await updateProject(project.id, {
        name,
        defaultBranch,
        testFramework: testFramework || undefined,
      })
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
    <div className="max-w-lg space-y-6">
      <form onSubmit={handleSave} className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-slate-400">
          <Settings size={16} aria-hidden="true" />
          <span className="text-xs font-medium uppercase tracking-wide">Project settings</span>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="settings-name" className="block text-sm font-medium text-slate-700">
              Project name
            </label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setSaveState('idle')
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-indigo-600"
            />
          </div>

          <div>
            <label htmlFor="settings-branch" className="block text-sm font-medium text-slate-700">
              Default branch
            </label>
            <input
              id="settings-branch"
              type="text"
              value={defaultBranch}
              onChange={(event) => {
                setDefaultBranch(event.target.value)
                setSaveState('idle')
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-indigo-600"
            />
          </div>

          <div>
            <label htmlFor="settings-framework" className="block text-sm font-medium text-slate-700">
              Test framework
            </label>
            <input
              id="settings-framework"
              type="text"
              value={testFramework}
              onChange={(event) => {
                setTestFramework(event.target.value)
                setSaveState('idle')
              }}
              placeholder="e.g. Jest, Pytest, Go test"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-indigo-600"
            />
          </div>
        </div>

        {saveState === 'error' && (
          <p className="mt-3 text-xs text-red-600">{saveError}</p>
        )}
        {saveState === 'saved' && (
          <p className="mt-3 text-xs text-emerald-600">Saved.</p>
        )}

        <div className="mt-4">
          <Button type="submit" size="sm" disabled={saveState === 'saving' || !name.trim() || !defaultBranch.trim()}>
            {saveState === 'saving' ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>

      <div className="rounded-lg border border-red-200 bg-white p-5">
        <span className="text-xs font-medium uppercase tracking-wide text-red-500">
          Danger zone
        </span>
        <p className="mt-2 text-sm text-slate-600">
          Disconnecting removes this project from TestSense AI. Your GitHub repository itself is
          not affected.
        </p>

        {deleteError && <p className="mt-2 text-xs text-red-600">{deleteError}</p>}

        {deleteState !== 'confirming' ? (
          <Button
            variant="danger"
            size="sm"
            className="mt-4"
            onClick={() => setDeleteState('confirming')}
          >
            Disconnect project
          </Button>
        ) : (
          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={deleteState === 'deleting'}
            >
              {deleteState === 'deleting' ? 'Disconnecting…' : 'Confirm disconnect'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setDeleteState('idle')}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
