import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import PageContainer from '../components/common/PageContainer.jsx'
import Button from '../components/common/Button.jsx'
import LoadingState from '../components/common/LoadingState.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import StepIndicator from '../components/common/StepIndicator.jsx'
import RepositoryCard from '../components/repositories/RepositoryCard.jsx'
import { getRepositories, createProject, beginGitHubLogin } from '../services/api.js'
import { ApiError } from '../services/ApiError.js'
import { useCurrentUser } from '../hooks/useCurrentUser.js'

const STEPS = ['Authorize GitHub', 'Select repository', 'Configure project', 'Review configuration', 'Success']

const INPUT_CLASS = 'mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/40'
const LABEL_CLASS = 'block text-sm font-medium text-slate-400'

export default function ConnectRepositoryPage() {
  const navigate = useNavigate()
  const { user, status: authStatus } = useCurrentUser()

  const [step, setStep] = useState(1)
  const [repositories, setRepositories] = useState([])
  const [reposStatus, setReposStatus] = useState('idle')
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [projectName, setProjectName] = useState('')
  const [defaultBranch, setDefaultBranch] = useState('')
  const [touched, setTouched] = useState({ projectName: false, defaultBranch: false })
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState('')
  const [createdProject, setCreatedProject] = useState(null)

  useEffect(() => {
    if (step !== 2 || reposStatus !== 'idle') return
    let cancelled = false
    getRepositories()
      .then((data) => { if (cancelled) return; setRepositories(data); setReposStatus('loaded') })
      .catch((err) => { if (cancelled) return; setReposStatus(err instanceof ApiError && err.status === 401 ? 'unauthenticated' : 'error') })
    return () => { cancelled = true }
  }, [step, reposStatus])

  function handleSelectRepository(repository) {
    setSelectedRepo(repository)
    if (!projectName) setProjectName(repository.name)
    if (!defaultBranch) setDefaultBranch(repository.defaultBranch)
  }

  const projectNameError = touched.projectName && !projectName.trim() ? 'Project name is required.' : ''
  const defaultBranchError = touched.defaultBranch && !defaultBranch.trim() ? 'Default branch is required.' : ''

  const canGoNext =
    (step === 1 && authStatus === 'signed-in') ||
    (step === 2 && selectedRepo !== null) ||
    (step === 3 && projectName.trim() !== '' && defaultBranch.trim() !== '') ||
    step === 4

  function goBack() {
    setConnectError('')
    setStep((c) => Math.max(1, c - 1))
  }

  async function goNext() {
    if (step === 3) {
      setTouched({ projectName: true, defaultBranch: true })
      if (!projectName.trim() || !defaultBranch.trim()) return
    }
    if (step === 4) {
      setConnecting(true)
      setConnectError('')
      try {
        const project = await createProject({ repositoryOwner: selectedRepo.owner, repositoryName: selectedRepo.name, name: projectName, defaultBranch })
        setCreatedProject(project)
        setStep(5)
      } catch (err) {
        setConnectError(err instanceof ApiError ? err.message : 'Could not connect this repository. Please try again.')
      } finally {
        setConnecting(false)
      }
      return
    }
    setStep((c) => Math.min(STEPS.length, c + 1))
  }

  return (
    <PageContainer className="max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Connect Repository</h1>
          <p className="mt-1 text-sm text-slate-500">
            Connect a GitHub repository so TestSense AI can start building memory for it.
          </p>
        </div>
        {step < 5 && (
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>Cancel</Button>
        )}
      </div>

      <div className="mt-6">
        <StepIndicator steps={STEPS} currentStep={step} />
      </div>

      <div className="mt-8 rounded-xl border border-white/8 bg-white/4 p-6">
        {step === 1 && (
          <div>
            <h2 className="text-base font-semibold text-white">Authorize GitHub</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in with your GitHub account to continue.</p>
            {authStatus === 'loading' && <div className="mt-5"><LoadingState label="Checking sign-in status…" /></div>}
            {authStatus === 'signed-out' && (
              <button type="button" onClick={() => beginGitHubLogin('/connect-repository')}
                className="mt-5 flex items-center gap-2 rounded-lg border border-white/10 bg-white/8 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/12 hover:text-white focus-visible:outline-none">
                Sign in with GitHub
              </button>
            )}
            {authStatus === 'signed-in' && (
              <div className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">
                <CheckCircle2 size={15} aria-hidden="true" />
                Authorized as {user.githubUsername}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-base font-semibold text-white">Select a repository</h2>
            <p className="mt-1 text-sm text-slate-500">Choose one repository to connect.</p>
            <div className="mt-5">
              {reposStatus === 'idle' && <LoadingState label="Loading repositories…" />}
              {reposStatus === 'unauthenticated' && (
                <EmptyState title="Session expired" description="Please sign in again."
                  action={<Button onClick={() => beginGitHubLogin('/connect-repository')}>Sign in with GitHub</Button>} />
              )}
              {reposStatus === 'error' && (
                <EmptyState icon={AlertTriangle} title="Couldn't load repositories"
                  description="Something went wrong while fetching your GitHub repositories."
                  action={<Button variant="secondary" onClick={() => setReposStatus('idle')}>Retry</Button>} />
              )}
              {reposStatus === 'loaded' && repositories.length === 0 && (
                <EmptyState title="No repositories found" description="We couldn't find any repositories for your account." />
              )}
              {reposStatus === 'loaded' && repositories.length > 0 && (
                <div className="space-y-3">
                  {repositories.map((repository) => (
                    <RepositoryCard key={repository.id} repository={repository}
                      selected={selectedRepo?.id === repository.id} onSelect={handleSelectRepository} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-base font-semibold text-white">Configure project</h2>
            <p className="mt-1 text-sm text-slate-500">Give this project a name and confirm the branch to track.</p>
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="project-name" className={LABEL_CLASS}>Project name</label>
                <input id="project-name" type="text" value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, projectName: true }))}
                  className={INPUT_CLASS} />
                {projectNameError && <p className="mt-1 text-xs text-red-400">{projectNameError}</p>}
              </div>
              <div>
                <label htmlFor="default-branch" className={LABEL_CLASS}>Default branch</label>
                <input id="default-branch" type="text" value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, defaultBranch: true }))}
                  className={INPUT_CLASS} />
                {defaultBranchError && <p className="mt-1 text-xs text-red-400">{defaultBranchError}</p>}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-base font-semibold text-white">Review configuration</h2>
            <p className="mt-1 text-sm text-slate-500">Confirm everything looks right before connecting.</p>
            <dl className="mt-5 divide-y divide-white/5 rounded-lg border border-white/8 overflow-hidden">
              <ReviewRow label="Repository" value={selectedRepo?.fullName} />
              <ReviewRow label="Project name" value={projectName} />
              <ReviewRow label="Default branch" value={defaultBranch} />
              <ReviewRow label="Language" value={selectedRepo?.language} />
            </dl>
            {connectError && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{connectError}</span>
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="text-center py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/25 text-emerald-400">
              <CheckCircle2 size={26} aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white">Repository connected</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
              {createdProject?.name} is connected. TestSense AI will begin building repository memory from {createdProject?.repositoryFullName}.
            </p>
            <div className="mt-6">
              <Button onClick={() => navigate(`/projects/${createdProject.id}`)}>
                Go to Project Workspace
              </Button>
            </div>
          </div>
        )}
      </div>

      {step < 5 && (
        <div className="mt-5 flex items-center justify-between">
          <Button variant="secondary" onClick={goBack} disabled={step === 1}>Back</Button>
          <Button onClick={goNext} disabled={!canGoNext || connecting}>
            {connecting ? (
              <><Loader2 size={15} className="animate-spin" aria-hidden="true" /> Connecting…</>
            ) : step === 4 ? 'Connect Repository' : 'Next'}
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
      <dd className="font-medium text-slate-200">{value}</dd>
    </div>
  )
}
