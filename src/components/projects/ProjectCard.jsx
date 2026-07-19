import { Link } from 'react-router-dom'
import { GitBranch, Database, GitPullRequest } from 'lucide-react'
import Badge from '../common/Badge.jsx'
import Button from '../common/Button.jsx'
import { formatRelativeTime } from '../../utils/format.js'

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

export default function ProjectCard({ project }) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{project.name}</h3>
          <p className="mt-0.5 text-sm text-slate-500">{project.repositoryFullName}</p>
        </div>
        <Badge tone={SYNC_STATUS_TONE[project.syncStatus]}>
          {SYNC_STATUS_LABEL[project.syncStatus]}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone="neutral">{project.language}</Badge>
        <Badge tone="neutral">{project.testFramework}</Badge>
        <Badge tone="neutral">
          <GitBranch size={12} aria-hidden="true" />
          {project.defaultBranch}
        </Badge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Database size={14} className="text-slate-400" aria-hidden="true" />
          <dt className="sr-only">Memory entries</dt>
          <dd>{project.memoryCount} memories</dd>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <GitPullRequest size={14} className="text-slate-400" aria-hidden="true" />
          <dt className="sr-only">Open pull requests</dt>
          <dd>{project.openPullRequests} open PRs</dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-xs text-slate-400">
          Last synced {formatRelativeTime(project.lastSyncedAt)}
        </span>
        <Button as={Link} to={`/projects/${project.id}`} size="sm">
          Open Project
        </Button>
      </div>
    </div>
  )
}
