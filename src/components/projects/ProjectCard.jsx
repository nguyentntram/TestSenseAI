import { Link } from 'react-router-dom'
import { GitBranch, Database, GitPullRequest, ArrowRight } from 'lucide-react'
import Badge from '../common/Badge.jsx'
import { formatRelativeTime } from '../../utils/format.js'

const SYNC_STATUS_TONE = {
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

export default function ProjectCard({ project }) {
  return (
    <div className="group flex flex-col rounded-xl border border-white/8 bg-white/4 p-5 transition-all hover:border-white/15 hover:bg-white/6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-white">{project.name}</h3>
          <p className="mt-0.5 truncate text-sm text-slate-500">{project.repositoryFullName}</p>
        </div>
        <Badge tone={SYNC_STATUS_TONE[project.syncStatus] ?? 'neutral'}>
          {SYNC_STATUS_LABEL[project.syncStatus] ?? project.syncStatus}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {project.language && <Badge tone="neutral">{project.language}</Badge>}
        {project.testFramework && <Badge tone="neutral">{project.testFramework}</Badge>}
        <Badge tone="neutral">
          <GitBranch size={12} aria-hidden="true" />
          {project.defaultBranch}
        </Badge>
      </div>

      {(project.memoryCount !== undefined || project.openPullRequests !== undefined) && (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {project.memoryCount !== undefined && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <Database size={14} className="text-slate-600" aria-hidden="true" />
              <dt className="sr-only">Memory entries</dt>
              <dd>{project.memoryCount} memories</dd>
            </div>
          )}
          {project.openPullRequests !== undefined && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <GitPullRequest size={14} className="text-slate-600" aria-hidden="true" />
              <dt className="sr-only">Open pull requests</dt>
              <dd>{project.openPullRequests} open PRs</dd>
            </div>
          )}
        </dl>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-4">
        <span className="text-xs text-slate-600">
          {project.lastSyncedAt
            ? `Synced ${formatRelativeTime(project.lastSyncedAt)}`
            : 'Not synced yet'}
        </span>
        <Link
          to={`/projects/${project.id}`}
          className="flex items-center gap-1.5 rounded-lg bg-white/8 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-white/12 hover:text-white group-hover:border-white/20"
        >
          Open
          <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
