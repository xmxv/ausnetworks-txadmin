/*
 * AusNetworks brand styling for the txAdmin panel.
 *
 * txAdmin's own theme system (tmpCustomThemes) only carries colour tokens.
 * Everything beyond colour - typography, radius, gradients, surface treatment -
 * lives here and is injected into the page head alongside the theme variables.
 *
 * Kept as one stylesheet rather than edits scattered through the panel
 * components, because this has to be replayed onto every upstream txAdmin
 * release. A single file rebases cleanly; component edits do not.
 *
 * Values come from ausnetworks.net's admin panel so the two read as one
 * product. Only the palette is duplicated - if the brand changes, change it
 * here and in tmpCustomThemes together.
 */
export const ausnetworksBrandCss = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root, .theme-ausnetworks {
  --font-sans: Inter, ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
  --radius: 0.75rem;

  --ausnet-grad: linear-gradient(92deg, #00d2b4 0%, #2ee08a 35%, #ff2d92 75%, #ff8a1f 100%);
  --ausnet-grad-text: linear-gradient(92deg, #00d2b4 0%, #2ee08a 30%, #c6ef2e 50%, #ff2d92 78%, #ff8a1f 100%);
  --ausnet-rule: linear-gradient(90deg, transparent, #00d2b4 20%, #2ee08a 40%, #ff2d92 70%, #ff8a1f 85%, transparent);
}

.theme-ausnetworks body {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
.theme-ausnetworks code,
.theme-ausnetworks pre,
.theme-ausnetworks kbd,
.theme-ausnetworks .font-mono { font-family: var(--font-mono); }

/* Page texture: a faint 64px grid that fades out down the page, plus a soft
   teal glow behind the header. Fixed and non-interactive so it cannot affect
   layout or intercept clicks. */
.theme-ausnetworks body::before {
  content: ''; position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px);
  background-size: 64px 64px;
  -webkit-mask-image: radial-gradient(120% 60% at 50% 0%, #000 0%, transparent 75%);
  mask-image: radial-gradient(120% 60% at 50% 0%, #000 0%, transparent 75%);
}
.theme-ausnetworks body::after {
  content: ''; position: fixed; inset: 0 0 auto 0; height: 22rem; z-index: 0;
  pointer-events: none;
  background: radial-gradient(60% 100% at 50% 0%, rgba(0,210,180,.12), transparent 70%);
}
.theme-ausnetworks #root { position: relative; z-index: 1; }

/* Cards and popovers: layered translucency over pure black, not a flat grey. */
.theme-ausnetworks [class*="rounded-"][class*="border"][class*="bg-card"],
.theme-ausnetworks .bg-card {
  background-image: linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.012));
  box-shadow: 0 1px 0 rgba(255,255,255,.02) inset;
}

/* Primary actions carry the brand gradient. Text is black - white fails
   contrast against the teal end of the ramp. */
.theme-ausnetworks button.bg-primary,
.theme-ausnetworks .bg-primary:not(.text-primary-foreground--skip) {
  background-image: var(--ausnet-grad);
  color: #000;
  font-weight: 600;
  border: 0;
}
.theme-ausnetworks button.bg-primary:hover { filter: brightness(1.08); }

/* Tables */
.theme-ausnetworks thead th {
  font-size: 10.5px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .18em; color: #6b6b6b;
  background: transparent; border-bottom: 1px solid #1f1f1f;
}
.theme-ausnetworks tbody td { color: #d4d4d4; }
.theme-ausnetworks tbody tr:hover { background: rgba(255,255,255,.025); }

/* Inputs */
.theme-ausnetworks input,
.theme-ausnetworks textarea,
.theme-ausnetworks select {
  background: rgba(0,0,0,.4);
  border: 1px solid #1f1f1f;
  border-radius: .625rem;
}
.theme-ausnetworks input::placeholder,
.theme-ausnetworks textarea::placeholder { color: #5c5c5c; }
.theme-ausnetworks input:focus-visible,
.theme-ausnetworks textarea:focus-visible,
.theme-ausnetworks select:focus-visible {
  outline: none;
  border-color: rgba(0,210,180,.55);
  box-shadow: 0 0 0 3px rgba(0,210,180,.10);
}

/* Links and focus rings settle on teal, the single interactive accent. */
.theme-ausnetworks a:not([class]) { color: #00d2b4; }
.theme-ausnetworks *:focus-visible { outline-color: #00d2b4; }

/* Utility classes for anything we add ourselves later. */
.theme-ausnetworks .ausnet-rule { height: 1px; opacity: .4; background: var(--ausnet-rule); }
.theme-ausnetworks .ausnet-gradient-text {
  background: var(--ausnet-grad-text);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.theme-ausnetworks .ausnet-eyebrow {
  font-size: 11.5px; font-weight: 600; letter-spacing: .2em;
  text-transform: uppercase; color: #00d2b4;
}

/* Scrollbars, so they do not read as default-Windows next to the site. */
.theme-ausnetworks * { scrollbar-color: #2a2a2a transparent; scrollbar-width: thin; }
.theme-ausnetworks ::-webkit-scrollbar { width: 10px; height: 10px; }
.theme-ausnetworks ::-webkit-scrollbar-track { background: transparent; }
.theme-ausnetworks ::-webkit-scrollbar-thumb {
  background: #2a2a2a; border-radius: 999px; border: 2px solid transparent;
  background-clip: content-box;
}
.theme-ausnetworks ::-webkit-scrollbar-thumb:hover { background-clip: content-box; background-color: #3a3a3a; }
`;
