"use client";

import {
  ChakraProvider,
  createSystem,
  defaultConfig,
  defineConfig,
} from "@chakra-ui/react";

// Kaicho design system. Mirrors the Chakra v3 token set the design was built on:
// Inter + Noto Sans JP for text, SFMono for figures, a near-black accent for
// primary actions, and tabular numerals so money columns line up.
const config = defineConfig({
  theme: {
    // Form controls sit on the gray page background, so their outline variant
    // defaults to the white panel color like the design does.
    recipes: {
      input: { variants: { variant: { outline: { bg: "bg.panel" } } } },
    },
    slotRecipes: {
      nativeSelect: {
        slots: ["root", "field", "indicator"],
        variants: { variant: { outline: { field: { bg: "bg.panel" } } } },
      },
    },
    tokens: {
      fonts: {
        // The variables are injected by next/font in the root layout.
        heading: {
          value: "var(--font-inter), var(--font-noto-jp), system-ui, sans-serif",
        },
        body: {
          value: "var(--font-inter), var(--font-noto-jp), system-ui, sans-serif",
        },
        mono: {
          value:
            "'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
        },
      },
    },
  },
  globalCss: {
    "html, body": {
      background: "bg.subtle",
      color: "fg",
      fontFeatureSettings: "'cv11'",
    },
    // Figures set in the mono family read as tabular so columns align.
    '[style*="font-mono"], .mono, [data-numeric]': {
      fontVariantNumeric: "tabular-nums",
    },
  },
});

export const system = createSystem(defaultConfig, config);

// The color mode is fixed to light (next-themes is unused), so this stays a thin
// wrapper around ChakraProvider alone.
export function Provider({ children }: { children: React.ReactNode }) {
  return <ChakraProvider value={system}>{children}</ChakraProvider>;
}
