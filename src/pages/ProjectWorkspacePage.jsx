import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GitBranch, GitPullRequest, Database, FlaskConical, Settings, Info } from 'lucide-react'
import PageContainer from '../components/common/PageContainer.jsx'
import Badge from '../components/common/Badge.jsx'
import Button from '../components/common/Button.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import LoadingState from '../components/common/LoadingState.jsx'
import { getProjectById } from '../services/api.js'
import { formatRelativeTime } from '../utils/format.js'

const SYNC_STATUS_TONE = {
  synced: 'success',
  syncing: 'info',
  error: 'error',
}

const SYNC_STATUS_LABEL = {
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

    getProjectById(projectId).then((data) => {
      if (cancelled) return
      if (data) {
        setProject(data)
        setStatus('loaded')
      } else {
        setStatus('not-found')
      }
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
        <Badge tone={SYNC_STATUS_TONE[project.syncStatus]}>
          {SYNC_STATUS_LABEL[project.syncStatus]}
        </Badge>
      </div>

      <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Repository</dt>
          <dd>{project.repositoryFullName}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Language</dt>
          <dd>{project.language}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Test framework</dt>
          <dd>{project.testFramework}</dd>
        </div>
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
        {activeTab === 'Settings' && <SettingsTab project={project} />}
      </div>
    </PageContainer>
  )
}

function DemoDataNotice() {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
      <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>These metrics are demo data for the Week 1 frontend prototype, not live results.</span>
    </div>
  )
}

function OverviewTab({ project }) {
  return (
    <div>
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

      <h3 className="mt-8 text-sm font-semibold text-slate-900">Recent activity</h3>
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
  if (project.pullRequests.length === 0) {
    return <EmptyState title="No pull requests yet" description="Pull requests will show up here once analyzed." />
  }

  return (
    <ul className="space-y-3">
      {project.pullRequests.map((pr) => (
        <li
          key={pr.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-slate-900">
              {pr.id} — {pr.title}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Opened by {pr.author} · updated {formatRelativeTime(pr.updatedAt)}
            </p>
          </div>
          <Badge tone={PR_STATUS_TONE[pr.status]}>{pr.status}</Badge>
        </li>
      ))}
    </ul>
  )
}

function MemoryTab({ project }) {
  if (project.memoryEntries.length === 0) {
    return <EmptyState title="No repository memory yet" description="Memory builds up as pull requests and history are indexed." />
  }

  return (
    <ul className="space-y-3">
      {project.memoryEntries.map((entry) => (
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
  if (project.generatedTests.length === 0) {
    return <EmptyState title="No tests generated yet" description="Generated tests will appear here after a pull request is analyzed." />
  }

  return (
    <ul className="space-y-3">
      {project.generatedTests.map((test) => (
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

function SettingsTab({ project }) {
  return (
    <div className="max-w-lg rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-slate-400">
        <Settings size={16} aria-hidden="true" />
        <span className="text-xs font-medium uppercase tracking-wide">Project settings</span>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Project name</dt>
          <dd className="font-medium text-slate-900">{project.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Repository</dt>
          <dd className="font-medium text-slate-900">{project.repositoryFullName}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Default branch</dt>
          <dd className="font-medium text-slate-900">{project.defaultBranch}</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-slate-400">
        Settings are read-only in this Week 1 frontend prototype.
      </p>
    </div>
  )
}
