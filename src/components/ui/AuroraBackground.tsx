interface AuroraBackgroundProps {
  /** 2-3 hex colors for the current section's accent glow. */
  colors: string[];
}

/**
 * Static technical backdrop for the admin shell — deliberately NOT the
 * generic "AI dashboard" trope of floating blurred gradient blobs. Instead:
 * a faint structural grid (echoing the public landing page's 12-col hero
 * grid) plus a single, quiet radial glow tied to the section's accent
 * color. No motion, no glow-on-hover theatrics — the personality comes
 * from typography and layout, not from an animated background.
 */
export const AuroraBackground = ({ colors }: AuroraBackgroundProps) => {
  const accent = colors[0] ?? '#89cff0';

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" style={{ background: 'var(--adm-bg, #0A0C10)' }}>
      {/* Single quiet accent glow, top-right — static, no drift */}
      <div
        className="absolute w-[900px] h-[900px] rounded-full blur-[180px] opacity-[0.09] transition-colors duration-[1400ms]"
        style={{ top: '-20%', right: '-15%', backgroundColor: accent }}
      />
      {/* Faint structural grid for depth and the site's editorial-technical voice */}
      <div className="adm-tech-grid absolute inset-0" />
      {/* Vignette to keep panels readable */}
      <div className="adm-aurora-vignette absolute inset-0" />
      {/* Fine grain for a non-flat print finish */}
      <div className="adm-aurora-grain absolute inset-0" />
    </div>
  );
};
