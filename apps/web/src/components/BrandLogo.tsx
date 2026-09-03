// Every on-screen usage of the logo is ≤56px (see AppShell/AuthLayout/
// AdminLayout/LoadingScreen), but the canonical brand asset
// (public/brand/bee-logo.png) is a 361x361 source kept full-res on purpose —
// it's the reference AGENTS.md points at for re-sampling brand colors, never
// resize/recompress it in place. These are pre-generated small display
// copies (192x192, well over 3x the largest on-screen size for retina) with
// a WebP source and a PNG fallback for the rare browser without WebP
// support — a Lighthouse pass during PWA polish flagged the full-size PNG
// costing ~140KB of wasted bytes on every page that shows the logo.
export function BrandLogo({ className, alt = "" }: { className?: string; alt?: string }) {
  return (
    <picture className="inline-block shrink-0 leading-none">
      <source srcSet="/brand/bee-logo-sm.webp" type="image/webp" />
      <img
        src="/brand/bee-logo-sm.png"
        alt={alt}
        width={192}
        height={192}
        className={`shrink-0 object-contain ${className ?? ""}`}
      />
    </picture>
  );
}
