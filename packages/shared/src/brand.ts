// Design tokens sampled directly from the official UniBuzz bee logo
// (apps/web/public/brand/bee-logo.png), shared so apps/web's Tailwind config
// and (later) apps/mobile's theme use the exact same values.
export const brandColors = {
  yellow: "#F6BA24", // primary — sampled from the logo's body
  orange: "#E8960F", // primary accent/hover — derived, warmer than yellow
  purple: "#6529C9", // secondary — sampled from the logo's wings/cap
  purpleLight: "#905DDE", // secondary accent — sampled highlight tone
  ink: "#0A0A0A", // near-black — sampled from the logo's stripes
} as const;

export type BrandColorName = keyof typeof brandColors;
