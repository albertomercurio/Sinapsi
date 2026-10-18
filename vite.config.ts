import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

/**
 * Security headers for the static host (Cloudflare reads `dist/_headers`).
 * The CSP only allows talking to our own origin and to the Supabase project,
 * so no other third party can ever receive data from the app.
 */
function securityHeaders(supabaseUrl: string | undefined): Record<string, string> {
  const supabase = supabaseUrl ? new URL(supabaseUrl) : undefined
  const connect = supabase
    ? `'self' ${supabase.origin} ${supabase.origin.replace(/^http/, 'ws')}`
    : "'self'"
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      `connect-src ${connect}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
  }
}

function headersFile(headers: Record<string, string>): Plugin {
  return {
    name: 'sinapsi:headers-file',
    apply: 'build',
    generateBundle() {
      const lines = Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`)
      this.emitFile({
        type: 'asset',
        fileName: '_headers',
        source: `/*\n${lines.join('\n')}\n`,
      })
    },
  }
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  if (command === 'build' && (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY)) {
    throw new Error(
      'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set for a build (see .env.example and docs/deployment.md).',
    )
  }
  const headers = securityHeaders(env.VITE_SUPABASE_URL)

  return {
    plugins: [
      vue(),
      tailwindcss(),
      VueI18nPlugin({
        // Every `locales/*.json` (global, per module, per activity) is precompiled,
        // so the runtime-only vue-i18n build works under a strict CSP (no eval).
        include: [fileURLToPath(new URL('./src/**/locales/*.json', import.meta.url))],
        runtimeOnly: true,
        compositionOnly: true,
        fullInstall: false,
        strictMessage: false,
      }),
      mode === 'development' ? vueDevTools() : undefined,
      headersFile(headers),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    preview: {
      headers,
    },
    build: {
      target: 'es2022',
      sourcemap: false,
      // The ECharts chunk (~640 kB) is lazy-loaded only on the results pages.
      chunkSizeWarningLimit: 700,
    },
  }
})
