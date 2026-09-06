import { useEffect, useRef, useState } from 'react';

/**
 * Resolves an Indian PIN code to its city, state and country.
 *
 * Uses India Post's public lookup (api.postalpincode.in) directly from the
 * browser — deliberately not through our own API, which would put a hard
 * dependency on a third party inside our request path. The only thing sent is
 * the six digits the user typed.
 *
 * This is a convenience, never a gate. Every field it fills stays editable, a
 * failed or slow lookup leaves the form exactly as it was, and nothing here can
 * block a save — a PIN code the service does not know is still a valid address
 * the user can type out.
 */

const PINCODE = /^\d{6}$/;

/** The service returns every post office under the code; they share district and state. */
const readAddress = (payload) => {
  const first = Array.isArray(payload) ? payload[0] : null;
  if (!first || first.Status !== 'Success') return null;
  const office = Array.isArray(first.PostOffice) ? first.PostOffice[0] : null;
  if (!office) return null;

  return {
    // District is the closest thing the service has to a city, and is what
    // appears on addressed post.
    city: office.District || office.Division || '',
    state: office.State || '',
    country: office.Country || 'India',
  };
};

export function usePincodeLookup(pincode, { onResolved } = {}) {
  const [status, setStatus] = useState('idle'); // idle | loading | resolved | notfound | error
  const lastLookedUp = useRef(null);
  const callback = useRef(onResolved);
  callback.current = onResolved;

  useEffect(() => {
    const code = String(pincode || '').trim();

    if (!PINCODE.test(code)) {
      lastLookedUp.current = null;
      setStatus('idle');
      return undefined;
    }
    // Editing an office and re-opening the dialog must not re-fetch, and must
    // not overwrite fields the user has since corrected by hand.
    if (lastLookedUp.current === code) return undefined;

    const controller = new AbortController();
    // Typing 751007 fires on 7, 75, 751… only the settled value is looked up.
    const timer = setTimeout(async () => {
      setStatus('loading');
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${code}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Lookup failed: ${response.status}`);

        const address = readAddress(await response.json());
        if (controller.signal.aborted) return;

        lastLookedUp.current = code;
        if (!address) {
          setStatus('notfound');
          return;
        }
        setStatus('resolved');
        callback.current?.(address);
      } catch (error) {
        if (error.name === 'AbortError') return;
        // Offline, blocked, or the service is down. The user types it in.
        lastLookedUp.current = code;
        setStatus('error');
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pincode]);

  return status;
}
