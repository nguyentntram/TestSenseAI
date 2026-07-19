import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, CheckCircle2, Loader2 } from 'lucide-react'
import PageContainer from '../components/common/PageContainer.jsx'
import Button from '../components/common/Button.jsx'
import LoadingState from '../components/common/LoadingState.jsx'
import StepIndicator from '../components/common/StepIndicator.jsx'
import RepositoryCard from '../components/repositories/RepositoryCard.jsx'
import { getRepositories, connectRepository } from '../services/api.js'

const STEPS = [
  'Authorize GitHub',
  'Select repository',
  'Configure project',
  'Review configuration',
  'Success',
]

// This flow only demonstrates the UI. No real GitHub OAuth or API calls happen here.
const DEMO_WORKSPACE_PROJECT_ID = 'payment-service'

export default function ConnectRepositoryPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [authorized, setAuthorized] = useState(false)

  const [repositories, setRepositories] = useState([])
  const [reposLoading, setReposLoading] = useState(true)
  const [selectedRepo, setSelectedRepo] = useState(null)

  const [projectName, setProjectName] = useState('')
  const [defaultBranch, setDefaultBranch] = useState('')
  const [touched, setTouched] = useState({ projectName: false, defaultBranch: false })

  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    let cancelled = false
    getRepositories().then((data) => {
      if (!cancelled) {
        setRepositories(data)
        setReposLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  function handleSelectRepository(repository) {
    setSelectedRepo(repository)
    if (!projectName) setProjectName(repository.name)
    if (!defaultBranch) setDefaultBranch(repository.defaultBranch)
  }

  const projectNameError =
    touched.projectName && !projectName.trim() ? 'Project name is required.' : ''
  const defaultBranchError =
    touched.defaultBranch && !defaultBranch.trim() ? 'Default branch is required.' : ''

  const canGoNext =
    (step === 1 && authorized) ||
    (step === 2 && selectedRepo !== null) ||
    (step === 3 && projectName.trim() !== '' && defaultBranch.trim() !== '') ||
    step === 4

  function goBack() {
    setStep((current) => Math.max(1, current - 1))
  }

  async function goNext() {
    if (step === 3) {
      setTouched({ projectName: true, defaultBranch: true })
      if (!projectName.trim() || !defaultBranch.trim()) return
    }

    if (step === 4) {
      setConnecting(true)
      await connectRepository({
        repository: selectedRepo,
        projectName,
        defaultBranch,
      })
      setConnecting(false)
      setStep(5)
      return
    }

    setStep((current) => Math.min(STEPS.length, current + 1))
  }

  function handleCancel() {
    navigate('/projects')
  }

  return (
    <PageContainer className="max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Connect Repository</h1>
          <p className="mt-1 text-sm text-slate-500">
            Connect a GitHub repository so TestSense AI can start building memory for it.
          </p>
        </div>
        {step < 5 && (
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
        )}
      </div>

      <div className="mt-6">
        <StepIndicator steps={STEPS} currentStep={step} />
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {step === 1 && (
          <div>
            <h2 className="text-base font-semibold text-slate-900">Authorize GitHub</h2>
            <p className="mt-1 text-sm text-slate-500">
              This is a demo authorization step. No real GitHub account is contacted.
            </p>
            <button
              type="button"
              onClick={() => setAuthorized(true)}
              aria-pressed={authorized}
              className={`mt-5 flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:w-auto ${
                authorized
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-300 bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {authorized ? (
                <>
                  <CheckCircle2 size={16} aria-hidden="true" /> Authorized as demo-user
                </>
              ) : (
                <>
                  <KeyRound size={16} aria-hidden="true" /> Authorize with GitHub (mock)
                </>
              )}
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-base font-semibold text-slate-900">Select a repository</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose one repository to connect. You can change this later.
            </p>
            <div className="mt-5">
              {reposLoading ? (
                <LoadingState label="Loading repositories…" />
              ) : (
                <div className="space-y-3">
                  {repositories.map((repository) => (
                    <RepositoryCard
                      key={repository.id}
                      repository={repository}
                      selected={selectedRepo?.id === repository.id}
                      onSelect={handleSelectRepository}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-base font-semibold text-slate-900">Configure project</h2>
            <p className="mt-1 text-sm text-slate-500">
              Give this project a name and confirm the branch TestSense AI should track.
            </p>
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="project-name" className="block text-sm font-medium text-slate-700">
                  Project name
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, projectName: true }))}
                  aria-invalid={Boolean(projectNameError)}
                  aria-describedby={projectNameError ? 'project-name-error' : undefined}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-indigo-600"
                />
                {projectNameError && (
                  <p id="project-name-error" className="mt-1 text-xs text-red-600">
                    {projectNameError}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="default-branch" className="block text-sm font-medium text-slate-700">
                  Default branch
                </label>
                <input
                  id="default-branch"
                  type="text"
                  value={defaultBranch}
                  onChange={(event) => setDefaultBranch(event.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, defaultBranch: true }))}
                  aria-invalid={Boolean(defaultBranchError)}
                  aria-describedby={defaultBranchError ? 'default-branch-error' : undefined}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-indigo-600"
                />
                {defaultBranchError && (
                  <p id="default-branch-error" className="mt-1 text-xs text-red-600">
                    {defaultBranchError}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-base font-semibold text-slate-900">Review configuration</h2>
            <p className="mt-1 text-sm text-slate-500">
              Confirm everything looks right before connecting.
            </p>
            <dl className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-200">
              <ReviewRow label="Repository" value={selectedRepo?.fullName} />
              <ReviewRow label="Project name" value={projectName} />
              <ReviewRow label="Default branch" value={defaultBranch} />
              <ReviewRow label="Language" value={selectedRepo?.language} />
            </dl>
          </div>
        )}

        {step === 5 && (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={24} aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-900">
              Repository connected
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {projectName} is connected. TestSense AI will begin building repository memory
              from {selectedRepo?.fullName}.
            </p>
            <div className="mt-6">
              <Button onClick={() => navigate(`/projects/${DEMO_WORKSPACE_PROJECT_ID}`)}>
                Go to Project Workspace
              </Button>
            </div>
          </div>
        )}
      </div>

      {step < 5 && (
        <div className="mt-6 flex items-center justify-between">
          <Button variant="secondary" onClick={goBack} disabled={step === 1}>
            Back
          </Button>
          <Button onClick={goNext} disabled={!canGoNext || connecting}>
            {connecting ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Connecting…
              </>
            ) : step === 4 ? (
              'Connect Repository'
            ) : (
              'Next'
            )}
          </Button>
        </div>
      )}
    </PageContainer>
  )
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}
