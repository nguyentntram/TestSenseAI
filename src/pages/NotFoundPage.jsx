import { Link } from 'react-router-dom'
import PageContainer from '../components/common/PageContainer.jsx'
import Button from '../components/common/Button.jsx'

export default function NotFoundPage() {
  return (
    <PageContainer className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-sm font-semibold text-indigo-600">404</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-3 max-w-md text-sm text-slate-500">
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have been moved.
      </p>
      <div className="mt-6 flex gap-3">
        <Button as={Link} to="/">
          Go Home
        </Button>
        <Button as={Link} to="/projects" variant="secondary">
          View Projects
        </Button>
      </div>
    </PageContainer>
  )
}
