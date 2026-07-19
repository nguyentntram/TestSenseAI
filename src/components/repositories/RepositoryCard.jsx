import { Lock, Globe } from 'lucide-react'
import Badge from '../common/Badge.jsx'
import { formatRelativeTime } from '../../utils/format.js'

export default function RepositoryCard({ repository, selected, onSelect }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-indigo-600 ${
        selected
          ? 'border-indigo-600 bg-indigo-50/60'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <input
        type="radio"
        name="repository"
        className="mt-1 h-4 w-4 accent-indigo-600"
        checked={selected}
        onChange={() => onSelect(repository)}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-900">{repository.fullName}</span>
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
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
          <span>{repository.language}</span>
          <span>Default branch: {repository.defaultBranch}</span>
          <span>Updated {formatRelativeTime(repository.updatedAt)}</span>
        </div>
      </div>
    </label>
  )
}
