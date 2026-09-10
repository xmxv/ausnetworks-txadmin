/*
 * AusNetworks theme for the in-game menu.
 *
 * The in-game menu is a separate React app from the web panel and uses
 * Material UI, so none of ausnetworksBrand.ts applies here. This is the same
 * upstream theme object with the palette swapped for our brand - the layout,
 * component structure and behaviour of txAdmin's menu are deliberately left
 * alone.
 *
 * Colours are the production values from the AusNetworks admin panel
 * reference. Keep them in step with tmpCustomThemes in getReactIndex.ts and
 * with ausnetworksBrand.ts if the brand ever changes.
 */
export default {
  name: 'fivem',
  logo: 'images/txadmin.png',
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
  },
  palette: {
    mode: "dark",
    primary: {
      // Brand teal. Upstream was already a green-teal, so this keeps the same
      // visual role rather than changing what "primary" means in the menu.
      main: "#00d2b4",
      contrastText: "#000000",
    },
    success: {
      main: "#2ee08a",
      contrastText: "#000000",
    },
    warning: {
      main: "#ffb020",
      contrastText: "#000000",
    },
    error: {
      main: "#ff4d4f",
      contrastText: "#000000",
    },
    info: {
      main: "#5865f2",
    },
    background: {
      // Pure black, per the reference. Near-blacks and blue-tinted greys read
      // as a different product next to the website.
      default: "#000000",
      paper: "#0a0a0a",
    },
    action: {
      selected: "rgba(255, 255, 255, 0.06)",
      hover: "rgba(255, 255, 255, 0.035)",
    },
    secondary: {
      main: "#fff",
    },
    text: {
      primary: "#f5f5f5",
      secondary: "#8b8b8b",
      disabled: "#5c5c5c",
    },
    divider: "#1f1f1f",
  },
  components: {
    MuiListItem: {
      styleOverrides: {
        root: {
          border: "1px solid transparent",
          borderRadius: 12,
          "&.Mui-selected": {
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            border: "1px solid #2a2a2a",
          },
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.035)",
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          border: "1px solid transparent",
          borderRadius: 12,
          "&.Mui-selected": {
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            border: "1px solid #2a2a2a",
          },
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.035)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "unset",
          border: "1px solid #1f1f1f",
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: "#1f1f1f" },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(0,0,0,0.4)",
          borderRadius: 10,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#1f1f1f" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#2a2a2a" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(0,210,180,.55)",
            borderWidth: 1,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        // Primary actions carry the brand gradient with BLACK text, matching
        // the website. Never white text on this fill - it fails contrast
        // against the teal end of the ramp.
        containedPrimary: {
          backgroundImage:
            "linear-gradient(92deg, #00d2b4 0%, #2ee08a 35%, #ff2d92 75%, #ff8a1f 100%)",
          color: "#000",
          fontWeight: 600,
          "&:hover": { filter: "brightness(1.08)" },
        },
        root: { borderRadius: 10, textTransform: "none" },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontSize: 10.5,
          letterSpacing: ".18em",
          textTransform: "uppercase",
          color: "#6b6b6b",
          fontWeight: 600,
          borderBottom: "1px solid #1f1f1f",
        },
        body: {
          color: "#d4d4d4",
          borderBottom: "1px solid rgba(31,31,31,.6)",
        },
      },
    },
  },
} as const;
