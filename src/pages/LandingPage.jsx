import { Link, useSearchParams } from 'react-router-dom'
import { GitBranch, Database, FlaskConical, Check, X, AlertTriangle } from 'lucide-react'
import Button from '../components/common/Button.jsx'
import PageContainer from '../components/common/PageContainer.jsx'
import { useCurrentUser } from '../hooks/useCurrentUser.js'
import { beginGitHubLogin } from '../services/api.js'

const STEPS = [
  {
    icon: GitBranch,
    title: 'Connect a repository',
    description:
      'Point TestSense AI at a GitHub repository so it can see your code, tests, and pull request history.',
  },
  {
    icon: Database,
    title: 'Build repository memory',
    description:
      'It studies past bug fixes, PR discussions, and testing conventions to build a memory of how your team tests things.',
  },
  {
    icon: FlaskConical,
    title: 'Generate context-aware tests',
    description:
      'For every new pull request, it drafts unit and integration tests informed by that repository memory, not generic guesses.',
  },
]

const COMPARISON = [
  {
    title: 'Generic AI test generators',
    tone: 'neutral',
    points: [
      { included: false, text: 'Writes tests based only on the current diff' },
      { included: false, text: 'Repeats mistakes already fixed elsewhere in the repo' },
      { included: false, text: 'Ignores existing testing conventions and helpers' },
    ],
  },
  {
    title: 'Repository-aware tests (TestSense AI)',
    tone: 'accent',
    points: [
      { included: true, text: 'Learns from historical bug fixes and past pull requests' },
      { included: true, text: 'Follows the repository’s existing test patterns and helpers' },
      { included: true, text: 'Targets the edge cases your team has actually hit before' },
    ],
  },
]

const AUTH_ERROR_MESSAGES = {
  missing_parameters: 'GitHub sign-in did not complete — some information was missing. Please try again.',
  invalid_state: 'Your sign-in session expired or looked invalid. Please try again.',
  oauth_failed: 'We couldn’t complete GitHub sign-in. Please try again.',
}

export default function LandingPage() {
  const { status } = useCurrentUser()
  const [searchParams] = useSearchParams()
  const authError = searchParams.get('auth_error')

  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <PageContainer className="py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Generate tests that understand your codebase.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              TestSense AI is an AI testing assistant that learns from a repository&rsquo;s
              historical tests, bug fixes, and pull requests, then uses that memory to
              generate more meaningful unit and integration tests for new pull requests.
            </p>

            {authError && (
              <div className="mx-auto mt-6 flex max-w-md items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-left text-sm text-red-700">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{AUTH_ERROR_MESSAGES[authError] ?? AUTH_ERROR_MESSAGES.oauth_failed}</span>
              </div>
            )}

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {status === 'signed-in' ? (
                <Button as={Link} to="/connect-repository" size="lg">
                  Connect a Repository
                </Button>
              ) : (
                <Button onClick={() => beginGitHubLogin('/projects')} size="lg">
                  Sign in with GitHub
                </Button>
              )}
              <Button as={Link} to="/projects" variant="secondary" size="lg">
                View Projects
              </Button>
            </div>
          </div>
        </PageContainer>
      </section>

      <section aria-labelledby="how-it-works-heading">
        <PageContainer className="py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="how-it-works-heading" className="text-2xl font-semibold text-slate-900">
              How it works
            </h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div
                key={step.title}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <step.icon size={20} aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-400">
                  Step {index + 1}
                </h3>
                <p className="mt-1 text-base font-semibold text-slate-900">{step.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="border-t border-slate-200 bg-white" aria-labelledby="comparison-heading">
        <PageContainer className="py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="comparison-heading" className="text-2xl font-semibold text-slate-900">
              Not just another AI test generator
            </h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {COMPARISON.map((column) => (
              <div
                key={column.title}
                className={`rounded-xl border p-6 ${
                  column.tone === 'accent'
                    ? 'border-indigo-200 bg-indigo-50/60'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <h3 className="text-base font-semibold text-slate-900">{column.title}</h3>
                <ul className="mt-4 space-y-3">
                  {column.points.map((point) => (
                    <li key={point.text} className="flex items-start gap-2 text-sm text-slate-600">
                      {point.included ? (
                        <Check size={16} className="mt-0.5 shrink-0 text-indigo-600" aria-hidden="true" />
                      ) : (
                        <X size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                      )}
                      <span>{point.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>
    </>
  )
}
