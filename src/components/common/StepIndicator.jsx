export default function StepIndicator({ steps, currentStep }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 sm:gap-3" aria-label="Progress">
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const isComplete = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep

        return (
          <li key={step} className="flex items-center gap-2">
            <span
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold
                ${isCurrent ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-900/40' : ''}
                ${isComplete ? 'bg-indigo-500/20 text-indigo-400' : ''}
                ${!isCurrent && !isComplete ? 'bg-white/8 text-slate-600' : ''}`}
            >
              {stepNumber}
            </span>
            <span
              className={`hidden text-sm sm:inline ${
                isCurrent ? 'font-medium text-white' : isComplete ? 'text-slate-500' : 'text-slate-600'
              }`}
            >
              {step}
            </span>
            {stepNumber < steps.length && (
              <span className="mx-1 hidden h-px w-5 bg-white/10 sm:block" aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
