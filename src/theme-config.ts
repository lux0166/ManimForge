export interface ThemeColors {
  surface: string;
  surfaceSubtle: string;
  field: string;
  ink: string;
  inkSecondary: string;
  inkTertiary: string;
  line: string;
  lineStrong: string;
  hover: string;
  hoverStrong: string;
  accent: string;
  accentHover: string;
  brandPrimary: string;
  brandPurple?: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  colors: ThemeColors;
}

export const THEMES: Record<string, ThemeDefinition> = {
  monochromeDark: {
    id: "monochrome-dark",
    name: "Monochrome Studio (Black & White)",
    colors: {
      surface: "#121214",
      surfaceSubtle: "#09090b",
      field: "#18181b",
      ink: "#ffffff",
      inkSecondary: "#a1a1aa",
      inkTertiary: "#71717a",
      line: "#27272a",
      lineStrong: "#3f3f46",
      hover: "rgba(255, 255, 255, 0.06)",
      hoverStrong: "rgba(255, 255, 255, 0.12)",
      accent: "#ffffff",
      accentHover: "#e4e4e7",
      brandPrimary: "#ffffff",
    }
  },
  catppuccinMocha: {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    colors: {
      surface: "#11111b",
      surfaceSubtle: "#181825",
      field: "#1e1e2e",
      ink: "#cdd6f4",
      inkSecondary: "#a6adc8",
      inkTertiary: "#6c7086",
      line: "#313244",
      lineStrong: "#45475a",
      hover: "rgba(205, 214, 244, 0.07)",
      hoverStrong: "rgba(205, 214, 244, 0.12)",
      accent: "#ffffff",
      accentHover: "#e4e4e7",
      brandPrimary: "#ffffff",
    }
  }
};

export const defaultTheme = THEMES.monochromeDark;
