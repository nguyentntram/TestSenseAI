export default function LoadingState({ label = 'Loading…' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-indigo-500" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  )
}
