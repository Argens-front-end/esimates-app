import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const fromRoot = (path: string) => new URL(`./${path}`, import.meta.url)

/** Vite never inlines <link rel="icon"> assets, so embed them as data URIs to keep the app in one HTML file. */
function inlineHtmlIcons(): Plugin {
  return {
    name: 'inline-html-icons',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        html.replace(/href="\/(src\/assets\/[\w.-]+\.svg)"/g, (_, path: string) => {
          return `href="data:image/svg+xml;base64,${readFileSync(fromRoot(path)).toString('base64')}"`
        }),
    },
  }
}

/** Writes dist/sw.js with a version derived from the built files, so every release invalidates the offline cache. */
function serviceWorker(): Plugin {
  return {
    name: 'service-worker',
    apply: 'build',
    closeBundle() {
      const files = ['dist/index.html', 'dist/manifest.webmanifest']
      const hash = createHash('sha256')
      files.forEach((f) => hash.update(readFileSync(fromRoot(f))))
      const version = hash.digest('hex').slice(0, 12)
      const sw = readFileSync(fromRoot('sw/sw.js'), 'utf8').replace("'__VERSION__'", JSON.stringify(version))
      writeFileSync(fromRoot('dist/sw.js'), sw)
    },
  }
}

// The app is inlined into dist/index.html; sw.js, the manifest and icons sit next to it for offline/PWA support.
export default defineConfig({
  base: './',
  plugins: [inlineHtmlIcons(), react(), tailwindcss(), viteSingleFile(), serviceWorker()],
  build: { chunkSizeWarningLimit: 2000 },
})
