import { useEffect, useRef } from 'react';
import { useSettings } from './use-settings';
import { useLogout } from './use-auth';

export function useInactivityTimeout() {
  const { data: settings = [] } = useSettings('security');
  const { mutate: logout } = useLogout();
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    const timeoutSetting = settings.find(s => s.key === 'sessionTimeout');
    // Default to 30 minutes if not set in DB
    const timeoutMinutes = timeoutSetting ? parseInt(timeoutSetting.value, 10) : 30;
    
    if (!timeoutMinutes || timeoutMinutes <= 0) return;

    const timeoutMs = timeoutMinutes * 60 * 1000;

    const updateLastActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Check periodically if we have passed the timeout threshold
    const intervalId = setInterval(() => {
      if (Date.now() - lastActivityRef.current > timeoutMs) {
        logout();
      }
    }, 10000); // Check every 10 seconds

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    
    // Throttle the event listener for performance so we don't spam state/refs
    let throttleTimer;
    const handleActivity = () => {
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          updateLastActivity();
          throttleTimer = null;
        }, 1000); // Throttle to max 1 update per second
      }
    };

    events.forEach(event => document.addEventListener(event, handleActivity, { passive: true }));
    updateLastActivity(); // Initialize

    return () => {
      clearInterval(intervalId);
      if (throttleTimer) clearTimeout(throttleTimer);
      events.forEach(event => document.removeEventListener(event, handleActivity));
    };
  }, [settings, logout]);
}
