/** Small inline badge showing a keyboard shortcut, e.g. <KeyHint>N</KeyHint>. */
export function KeyHint({ children }) {
  return (
    <kbd className="ml-1.5 hidden sm:inline-flex items-center rounded border border-current/30 px-1.5 py-0.5 text-[10px] font-mono opacity-70">
      {children}
    </kbd>
  );
}
