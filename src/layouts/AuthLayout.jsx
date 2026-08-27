import { Outlet } from 'react-router-dom';
import { InfideepLogo } from '@/components/auth/infideep-logo';

/**
 * Centred-card shell for the secondary auth screens (reset password).
 *
 * Login renders its own full-viewport split layout and does not pass through
 * here, but both share the INFIDEEP dark ground so the flow reads as one piece.
 */
export function AuthLayout() {
  return (
    <div className="infideep-auth min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-infideep-bg text-infideep-on-surface font-sans px-4 py-8 tall:py-10 selection:bg-infideep-primary selection:text-[#660026]">
      <div className="absolute inset-0 id-bg-glow z-0 pointer-events-none mix-blend-screen" />
      <div className="absolute inset-0 id-grid-lines z-0 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        <InfideepLogo glow className="h-12 tall:h-16 w-auto mb-6 tall:mb-8" />
        <Outlet />
      </div>
    </div>
  );
}
