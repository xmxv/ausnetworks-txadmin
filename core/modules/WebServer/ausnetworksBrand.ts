/*
 * AusNetworks brand styling for the txAdmin panel.
 *
 * txAdmin's own theme system (tmpCustomThemes) only carries colour tokens.
 * Everything beyond colour - typography, radius, gradients, surface treatment,
 * the sidebar rail - lives here and is injected into the page head alongside
 * those variables.
 *
 * Kept as one stylesheet rather than edits scattered through the panel
 * components, because this has to be replayed onto every upstream txAdmin
 * release and a single file rebases cleanly.
 *
 * Values are transcribed from the AusNetworks admin control panel theme
 * reference. Where a rule targets a txAdmin class rather than the reference's
 * own class name, the reference selector is noted so the two can be diffed.
 */
export const ausnetworksBrandCss = `

/* NOTE ON SCOPING
   Rules for our own .ausnet-* classes are deliberately NOT scoped behind
   .theme-ausnetworks. Those class names exist only in this fork, so they
   cannot collide with upstream or leak into another theme - and scoping them
   only created a failure mode: when the theme class went missing, the sidebar
   lost its flex layout and the avatar lost its size box, which looked like
   the components were broken rather than merely unstyled.
   Generic element selectors below stay scoped, since those would leak. */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root, .theme-ausnetworks {
  --ausnet-surface: #0a0a0a;
  --ausnet-line: #1f1f1f;
  --ausnet-line-2: #2a2a2a;
  --ausnet-fg: #f5f5f5;
  --ausnet-muted: #8b8b8b;
  --ausnet-muted-2: #5c5c5c;
  --ausnet-teal: #00d2b4;

  --font-sans: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Consolas, monospace;

  --ausnet-grad: linear-gradient(92deg, #00d2b4 0%, #2ee08a 35%, #ff2d92 75%, #ff8a1f 100%);
  --ausnet-grad-text: linear-gradient(92deg, #00d2b4 0%, #2ee08a 30%, #c6ef2e 50%, #ff2d92 78%, #ff8a1f 100%);
  --ausnet-rule: linear-gradient(90deg, transparent, #00d2b4 20%, #2ee08a 40%, #ff2d92 70%, #ff8a1f 85%, transparent);
}

.theme-ausnetworks body {
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
.theme-ausnetworks code,
.theme-ausnetworks pre,
.theme-ausnetworks kbd,
.theme-ausnetworks .font-mono,
.theme-ausnetworks .mono { font-family: var(--font-mono); }

/* Reference: :focus-visible */
.theme-ausnetworks :focus-visible {
  outline: 2px solid var(--ausnet-teal);
  outline-offset: 2px;
  border-radius: 6px;
}

/* ---------- Ambient texture ----------
   Reference: .grid-bg and .glow. A 64px grid masked to fade downward over the
   first 360px, plus a blurred teal glow behind the header. Both fixed and
   non-interactive so they cannot affect layout or intercept clicks. */
.theme-ausnetworks body::before {
  content: ''; position: fixed; inset: 0 0 auto 0; height: 360px;
  z-index: 0; pointer-events: none; opacity: .6;
  background-image:
    linear-gradient(to right, rgba(255,255,255,.045) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,.045) 1px, transparent 1px);
  background-size: 64px 64px;
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 100%);
  mask-image: radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 100%);
}
.theme-ausnetworks body::after {
  content: ''; position: fixed; top: -8rem; left: 50%; transform: translateX(-50%);
  width: 720px; height: 360px; z-index: 0; pointer-events: none; filter: blur(40px);
  background: radial-gradient(closest-side, rgba(0,210,180,.12), transparent);
}
.theme-ausnetworks #root { position: relative; z-index: 1; }

/* ---------- Sidebar rail ----------
   Reference: .sidebar / .brandbar / .nav / .navgroup / .navitem */
.theme-ausnetworks .tx-sidebar {
  background: rgba(0,0,0,.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-right: 1px solid var(--ausnet-line);
  border-radius: 0;
  padding-right: .75rem;
}
.ausnet-brandbar {
  height: 4rem; display: flex; align-items: center; gap: .75rem;
  padding: 0 1.25rem 0 .25rem; margin-bottom: .5rem;
  border-bottom: 1px solid var(--ausnet-line);
}
.ausnet-brandname {
  font-size: 14px; font-weight: 600; letter-spacing: -.01em;
  color: #fff; line-height: 1.2;
}
.ausnet-brandrole {
  font-size: 10.5px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .18em; color: var(--ausnet-teal); margin-top: 1px;
}
.ausnet-nav { padding: 0 0 .25rem; }
.ausnet-navgroup {
  margin: 1.25rem 0 .375rem; padding: 0 .75rem;
  font-size: 10.5px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .2em; color: #525252;
}
.ausnet-navgroup:first-of-type { margin-top: 0; }

.ausnet-navitem {
  position: relative; display: flex; align-items: center; gap: .625rem;
  padding: .5rem .75rem; margin-bottom: .125rem;
  border-radius: .75rem; font-size: 13.5px; color: var(--ausnet-muted);
  transition: background .15s, color .15s;
}
.ausnet-navitem:hover { background: rgba(255,255,255,.035); color: #fff; }
.ausnet-navitem.is-active { background: rgba(255,255,255,.06); color: #fff; }
.ausnet-navitem.is-disabled { opacity: .5; pointer-events: none; }
.ausnet-navicon { width: 16px; height: 16px; flex-shrink: 0; transition: color .15s; }
.ausnet-navitem.is-active .ausnet-navicon { color: var(--ausnet-teal); }

/* Reference uses ::before on the active row. Kept as an element toggled by
   opacity so rows do not reflow on navigation. Height is a fixed 20px, per the
   reference, not a percentage of the row. */
.ausnet-navbar-indicator {
  position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 3px; height: 20px; border-radius: 0 999px 999px 0;
  background-image: var(--ausnet-grad);
  opacity: 0; transition: opacity .15s;
}
.ausnet-navitem.is-active .ausnet-navbar-indicator { opacity: 1; }

/* Reference: .sidefoot / .usercard / .avatar / .brand-ring */
.ausnet-sidefoot {
  border-top: 1px solid var(--ausnet-line);
  padding: .75rem .25rem 0;
  margin-top: 1.25rem;
}
.ausnet-usercard {
  position: relative;
  display: flex; align-items: center; gap: .625rem;
  background: var(--ausnet-surface); border-radius: .75rem; padding: .5rem .75rem;
}
/* 1px gradient border via a masked pseudo-element, so the card keeps a solid
   background instead of the gradient showing through a padded wrapper. */
.ausnet-usercard::before {
  content: ''; position: absolute; inset: -1px; border-radius: inherit; padding: 1px;
  background: linear-gradient(120deg, rgba(0,210,180,.7), rgba(46,224,138,.4) 35%, rgba(255,45,146,.5) 75%, rgba(255,138,31,.7));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  pointer-events: none;
}
.ausnet-avatar {
  width: 28px; height: 28px; border-radius: 999px; flex-shrink: 0;
  background-image: var(--ausnet-grad); color: #000;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; overflow: hidden;
}
.ausnet-avatar img { width: 100%; height: 100%; object-fit: cover; }
.ausnet-username { font-size: 13px; color: #fff; line-height: 1.2; }
.ausnet-userrole { font-size: 11px; color: var(--ausnet-teal); }

/* ---------- Cards ----------
   Reference: .card / .card-hover. The reference card radius is 1.25rem, larger
   than the 0.75rem shadcn uses for controls, so it is set on the card selector
   rather than on --radius globally. */
.theme-ausnetworks .bg-card {
  background-image: linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.012));
  border-color: var(--ausnet-line);
  border-radius: 1.25rem;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.02);
  transition: border-color .25s, transform .25s, box-shadow .25s;
}
.theme-ausnetworks .bg-card:hover { border-color: var(--ausnet-line-2); }
/* The lift is reserved for cards that are themselves links or buttons - a
   whole dashboard shifting on hover reads as noise. */
.theme-ausnetworks a > .bg-card:hover,
.theme-ausnetworks button > .bg-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 60px -30px rgba(0,210,180,.25);
}

/* ---------- Page headers ----------
   Reference: h1. Scoped to routed content so it cannot restyle headings
   inside dialogs, cards and the sidebar. */
.theme-ausnetworks main h1 {
  font-size: 34px; font-weight: 600; letter-spacing: -.02em;
  color: #fff; text-wrap: balance;
}

/* ---------- Tables ----------
   Reference: thead th / tbody tr / tbody td */
.theme-ausnetworks thead th {
  font-size: 10.5px; letter-spacing: .18em; text-transform: uppercase;
  color: #6b6b6b; font-weight: 600; text-align: left;
  padding: .85rem .75rem; border-bottom: 1px solid var(--ausnet-line);
  background: transparent;
}
.theme-ausnetworks tbody tr { transition: background .15s; }
.theme-ausnetworks tbody tr:hover { background: rgba(255,255,255,.025); }
.theme-ausnetworks tbody td {
  color: #d4d4d4; padding: .7rem .75rem; font-size: 13.5px;
  border-bottom: 1px solid rgba(31,31,31,.6);
}

/* ---------- Buttons ----------
   Reference: .btn.brand - the brand gradient with BLACK text, never white. */
.theme-ausnetworks .bg-primary {
  background-image: var(--ausnet-grad);
  color: #000;
  font-weight: 600;
  border-color: transparent;
}
.theme-ausnetworks .bg-primary:hover { filter: brightness(1.08); }
.theme-ausnetworks .bg-destructive {
  background-color: rgba(255,77,79,.12);
  color: #ff4d4f;
  border: 1px solid rgba(255,77,79,.35);
}
.theme-ausnetworks .bg-destructive:hover { background-color: rgba(255,77,79,.2); }

/* ---------- Inputs ----------
   Reference: input[type=text], select */
.theme-ausnetworks input,
.theme-ausnetworks textarea,
.theme-ausnetworks select {
  background: rgba(0,0,0,.4);
  border: 1px solid var(--ausnet-line);
  border-radius: .625rem;
  color: var(--ausnet-fg);
  font-size: 13.5px;
  transition: border-color .15s, box-shadow .15s;
}
.theme-ausnetworks input::placeholder,
.theme-ausnetworks textarea::placeholder { color: var(--ausnet-muted-2); }
.theme-ausnetworks input:focus,
.theme-ausnetworks textarea:focus,
.theme-ausnetworks select:focus,
.theme-ausnetworks input:focus-visible,
.theme-ausnetworks textarea:focus-visible {
  outline: none;
  border-color: rgba(0,210,180,.55);
  box-shadow: 0 0 0 3px rgba(0,210,180,.1);
}

/* ---------- Utilities ---------- */
.ausnet-rule { height: 1px; opacity: .4; background: var(--ausnet-rule); }
.ausnet-gradient-text {
  background: var(--ausnet-grad-text);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.ausnet-eyebrow {
  display: flex; align-items: center; gap: .5rem;
  font-size: 11.5px; font-weight: 600; letter-spacing: .2em;
  text-transform: uppercase; color: var(--ausnet-teal);
}

/* ---------- Scrollbars ---------- */
.theme-ausnetworks * { scrollbar-color: var(--ausnet-line-2) transparent; scrollbar-width: thin; }
.theme-ausnetworks ::-webkit-scrollbar { width: 10px; height: 10px; }
.theme-ausnetworks ::-webkit-scrollbar-track { background: transparent; }
.theme-ausnetworks ::-webkit-scrollbar-thumb {
  background-color: var(--ausnet-line-2); border-radius: 999px;
  border: 2px solid transparent; background-clip: content-box;
}
.theme-ausnetworks ::-webkit-scrollbar-thumb:hover { background-color: #3a3a3a; background-clip: content-box; }

/* The reference honours reduced motion. */
@media (prefers-reduced-motion: reduce) {
  .theme-ausnetworks * { transition: none !important; }
}
`;
