// ESLint flat config — PPT Spectrum Shapes.
//
// Beyond standard TypeScript/React hygiene, this config machine-enforces the
// architectural contracts described in the AGENTS.md hierarchy so that both
// humans and LLM agents get immediate feedback when a boundary is crossed:
//
//   - src/core       → pure TypeScript: no React, no DOM/browser globals, no
//                       imports from audio/renderers/components.
//   - src/renderers  → no React or component imports (60 FPS paths stay outside
//                       the React reconciliation tree); no non-zero shadowBlur.
//   - src/audio      → no React, renderer, or component imports.
//
// Run with `npm run lint` (or `npm run check` for typecheck + lint + tests).

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

/** Browser globals that must never appear in pure domain code. */
const BROWSER_GLOBALS_BANNED_IN_CORE = [
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'AudioContext',
  'OfflineAudioContext',
  'HTMLElement',
  'HTMLCanvasElement',
  'CanvasRenderingContext2D',
  'WebGLRenderingContext',
  'WebGL2RenderingContext',
].map((name) => ({
  name,
  message: `src/core must stay free of DOM/browser dependencies (see src/core/AGENTS.md). Inject '${name}' from the calling layer instead.`,
}));

const REACT_IMPORT_BAN = {
  group: ['react', 'react-dom', 'react-dom/*', 'lucide-react'],
  message: 'React must not be imported here; keep per-frame rendering and audio decoupled from React state trees.',
};

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'public/**'],
  },

  // ── Baseline: all TypeScript sources ─────────────────────────────────────
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'off',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
    },
  },

  // ── src/core: pure domain logic ──────────────────────────────────────────
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...BROWSER_GLOBALS_BANNED_IN_CORE],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            REACT_IMPORT_BAN,
            {
              group: ['**/audio/**', '**/renderers/**', '**/components/**'],
              message: 'src/core is the dependency root; it must not import from audio, renderers, or components.',
            },
          ],
        },
      ],
    },
  },
  {
    // Documented exception: scene persistence is guarded by
    // `typeof window === 'undefined'` and is safe in Node/Vitest.
    // See "Known Exceptions" in src/core/AGENTS.md before adding more.
    files: ['src/core/config.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },

  // ── src/renderers: 60 FPS graphics ───────────────────────────────────────
  {
    files: ['src/renderers/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            REACT_IMPORT_BAN,
            {
              group: ['**/components/**'],
              message: 'Renderers must not depend on React components; components depend on renderers, never the reverse.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "AssignmentExpression[left.property.name='shadowBlur']:not([right.value=0])",
          message: 'Software blur is banned in 60 FPS paths (ctx.shadowBlur must be 0). Delegate bloom/halation to the WebGL pipeline.',
        },
      ],
    },
  },

  // ── src/audio: Web Audio + worklet ───────────────────────────────────────
  {
    files: ['src/audio/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            REACT_IMPORT_BAN,
            {
              group: ['**/renderers/**', '**/components/**'],
              message: 'src/audio may depend only on src/core; it must not import renderers or components.',
            },
          ],
        },
      ],
    },
  },

  // ── src/components: UI Presentation layer ────────────────────────────────
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Technical debt overrides for oversized legacy components (next refactor candidates).
    files: ['src/components/CellViewport.tsx'],
    rules: {
      'max-lines': ['error', { max: 800, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['src/components/RadialMenuOverlay.tsx'],
    rules: {
      'max-lines': ['error', { max: 650, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['src/components/ControlToolbar.tsx', 'src/components/CaptureModal.tsx'],
    rules: {
      'max-lines': ['error', { max: 550, skipBlankLines: true, skipComments: true }],
    },
  },

  // ── Tests ────────────────────────────────────────────────────────────────
  // Tests may cross layer boundaries (e.g. exercising a renderer's pure helper),
  // but new tests should live in the `__tests__` folder of the layer under test.
  {
    files: ['src/**/__tests__/**/*.ts', 'src/**/*.test.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-globals': 'off',
      'no-restricted-imports': 'off',
    },
  },

  // ── Node-side config files ───────────────────────────────────────────────
  {
    files: ['*.config.{js,ts}', 'vite.config.ts'],
    languageOptions: { globals: globals.node },
  },
);
