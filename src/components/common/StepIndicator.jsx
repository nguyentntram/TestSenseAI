export default function StepIndicator({ steps, currentStep }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 sm:gap-4" aria-label="Progress">
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const isComplete = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep

        return (
          <li key={step} className="flex items-center gap-2">
            <span
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold
                ${isCurrent ? 'bg-indigo-600 text-white' : ''}
                ${isComplete ? 'bg-indigo-100 text-indigo-700' : ''}
                ${!isCurrent && !isComplete ? 'bg-slate-100 text-slate-400' : ''}`}
            >
              {stepNumber}
            </span>
            <span
              className={`hidden text-sm sm:inline ${
                isCurrent ? 'font-medium text-slate-900' : 'text-slate-500'
              }`}
            >
              {step}
            </span>
            {stepNumber < steps.length && (
              <span className="mx-1 hidden h-px w-6 bg-slate-200 sm:block" aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
