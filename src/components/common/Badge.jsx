const TONE_CLASSES = {
  neutral: 'bg-white/8 text-slate-300',
  success: 'bg-emerald-500/15 text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-400',
  error: 'bg-red-500/15 text-red-400',
  info: 'bg-indigo-500/15 text-indigo-400',
}

export default function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium
        ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
