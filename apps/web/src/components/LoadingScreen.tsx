import { BrandLogo } from "./BrandLogo";

export function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-50">
      <BrandLogo className="h-10 w-10 animate-pulse" />
    </div>
  );
}
