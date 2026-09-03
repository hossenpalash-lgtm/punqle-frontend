// lucide-react has no TikTok glyph (Facebook/Youtube do exist there) —
// this fills that one gap with the same className-driven sizing API so
// it drops into the same spots those icons already appear in.
export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.5 2h-3.2v13.6a2.9 2.9 0 1 1-2.9-2.9c.2 0 .4 0 .6.05V9.6a6.1 6.1 0 1 0 5.5 6.1V8.9a7.7 7.7 0 0 0 4.6 1.5V7.2a4.5 4.5 0 0 1-4.6-4.5V2Z" />
    </svg>
  );
}
