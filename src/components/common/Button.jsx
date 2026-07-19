const VARIANT_CLASSES = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-600',
  secondary:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:outline-indigo-600',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:outline-indigo-600',
  danger:
    'bg-white text-red-600 border border-red-200 hover:bg-red-50 focus-visible:outline-red-600',
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
        transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      disabled={Component === 'button' ? disabled : undefined}
      aria-disabled={Component !== 'button' ? disabled : undefined}
      {...props}
    >
      {children}
    </Component>
  )
}
