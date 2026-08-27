import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Rendered for any URL that matches no route.
 *
 * It lives *inside* DashboardLayout rather than standing alone, so a mistyped
 * or stale link keeps the sidebar and the user keeps a way out. Previously
 * nothing matched at all — not even the layout — and React Router rendered an
 * empty document, which reads as a crash rather than a wrong address.
 */
export default function NotFoundPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-5">
        <Compass className="w-7 h-7 text-muted-foreground" aria-hidden="true" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-2">This page doesn&apos;t exist</h1>
      <p className="text-sm text-muted-foreground max-w-md mb-1">
        Nothing is published at <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{pathname}</code>.
      </p>
      <p className="text-sm text-muted-foreground max-w-md mb-7">
        It may have been renamed, or the link that brought you here may be out of date.
      </p>

      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
          Go back
        </Button>
        <Button asChild>
          <Link to="/">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
