import { Lock, Globe } from 'lucide-react'
import Badge from '../common/Badge.jsx'
import { formatRelativeTime } from '../../utils/format.js'

export default function RepositoryCard({ repository, selected, onSelect }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-indigo-500 ${
        selected
          ? 'border-indigo-500/50 bg-indigo-500/10 shadow-lg shadow-indigo-900/20'
          : 'border-white/8 bg-white/4 hover:border-white/15 hover:bg-white/6'
      }`}
    >
      <input
        type="radio"
        name="repository"
        className="mt-1 h-4 w-4 accent-indigo-500"
        checked={selected}
        onChange={() => onSelect(repository)}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-white">{repository.fullName}</span>
          <Badge tone="neutral">
            {repository.private ? (
              <>
                <Lock size={12} aria-hidden="true" /> Private
              </>
            ) : (
              <>
                <Globe size={12} aria-hidden="true" /> Public
              </>
            )}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">{repository.description}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
          <span>{repository.language}</span>
          <span>Default branch: {repository.defaultBranch}</span>
          <span>Updated {formatRelativeTime(repository.updatedAt)}</span>
        </div>
      </div>
    </label>
  )
}
