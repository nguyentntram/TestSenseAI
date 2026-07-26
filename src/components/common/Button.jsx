const VARIANT_CLASSES = {
  primary:
    'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-900/40 hover:opacity-90 focus-visible:outline-indigo-500',
  secondary:
    'bg-white/8 text-slate-200 border border-white/10 hover:bg-white/12 hover:border-white/20 focus-visible:outline-indigo-500',
  ghost:
    'bg-transparent text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline-indigo-500',
  danger:
    'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/15 hover:border-red-500/30 focus-visible:outline-red-500',
}

const SIZE_CLASSES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  children,
  ...props
}) {
  return (
    <Component
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
        disabled:cursor-not-allowed disabled:opacity-40
        ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      disabled={Component === 'button' ? disabled : undefined}
      aria-disabled={Component !== 'button' ? disabled : undefined}
      {...props}
    >
      {children}
    </Component>
  )
}
