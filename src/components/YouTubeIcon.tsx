// The YouTube mark is a red rounded rectangle with a white play triangle. On a red badge/tile, only the white triangle
// is needed (the tile itself is the red rectangle). lucide's Youtube icon filled with currentColor turns into a plain
// white blob, because its triangle and its outline get the same fill - so this draws just the triangle.
export function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M8.5 5.8v12.4a.8.8 0 0 0 1.2.7l10.1-6.2a.8.8 0 0 0 0-1.4L9.7 5.1a.8.8 0 0 0-1.2.7Z" fill="currentColor" />
    </svg>
  );
}
