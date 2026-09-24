import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * What a user sees when they reach something they hold no grant for.
 *
 * Deliberately says only that permission is missing, and never which code was
 * required: naming `PAYMENT_DELETE` on a 403 tells whoever is probing exactly
 * which grant to go after, and the person who legitimately hit this cannot act
 * on the code anyway — they have to ask an administrator either way.
 *
 * The same panel is used for a blocked route and for a blocked region inside a
 * page, so the two cannot drift apart in wording.
 */
export function AccessDenied({
  title = 'Access Denied',
  message = 'You do not have permission to view this page. Please contact your system administrator if you need access.',
  showHomeLink = true,
}) {
  return (
    <div className="p-12 text-center rounded-2xl border border-border bg-card/40 my-4">
      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{message}</p>
      {showHomeLink && (
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/">Back to Dashboard</Link>
        </Button>
      )}
    </div>
  );
}
