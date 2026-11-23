export default function LogoMark({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="var(--foreground)" />
      <path d="M8.5 17V7h4a3 3 0 0 1 0 6h-4" stroke="var(--background)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
