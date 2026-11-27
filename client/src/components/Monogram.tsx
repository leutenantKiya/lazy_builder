// product mark: an ink block and an orange block snapping into an "L".
// The ink block follows the text colour so it works on both themes; the orange is the brand colour.
export const MARK_ORANGE = '#ff5a1f';

export default function Monogram({ size = 16 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 -10 70 70"
      className="shrink-0 text-text"
    >
      <rect x="0" y="0" width="26" height="48" rx="6" fill="currentColor" />
      <rect x="30" y="30" width="40" height="20" rx="5" fill={MARK_ORANGE} />
    </svg>
  );
}
