import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function metaPixelHtmlPlugin(pixelId) {
  if (!pixelId) return null

  const snippet = `
    <!-- Meta Pixel Code -->
    <script>
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('set', 'autoConfig', false, '${pixelId}');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
      window.__KHUSH_META_PIXEL_ID__ = '${pixelId}';
    </script>
    <noscript>
      <img height="1" width="1" style="display:none" alt=""
        src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />
    </noscript>
    <!-- End Meta Pixel Code -->
  `

  return {
    name: 'inject-meta-pixel',
    transformIndexHtml(html) {
      return html.replace('</head>', `${snippet}\n  </head>`)
    },
  }
}

function resolveApiOrigin(env) {
  const raw = String(env.VITE_API_URL || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw.replace(/\/api\/?$/, '') || raw);
    return url.origin;
  } catch {
    return '';
  }
}

function resolveBuildAppEnv(env, mode) {
  const v = String(env.VITE_APP_ENV ?? '').toLowerCase().trim()
  if (v === 'dev' || v === 'development') return 'dev'
  if (v === 'prod' || v === 'production') return 'prod'
  return mode === 'development' ? 'dev' : 'prod'
}

/**
 * DEV-only: proxy Browser → Vite → S3 PUT so local community uploads work when
 * the bucket CORS does not yet allow localhost (see FAST_UPLOAD_E2E Step C).
 * Client sends PUT /__dev/s3-put with header x-s3-upload-url=<presigned URL>.
 */
function s3DevPutProxyPlugin() {
  return {
    name: 's3-dev-put-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]
        if (path !== '/__dev/s3-put') return next()

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method !== 'PUT') {
          res.statusCode = 405
          res.setHeader('Allow', 'PUT, OPTIONS')
          res.end('Method Not Allowed')
          return
        }

        const target = req.headers['x-s3-upload-url']
        if (!target || typeof target !== 'string') {
          res.statusCode = 400
          res.end('Missing x-s3-upload-url')
          return
        }

        let parsed
        try {
          parsed = new URL(target)
        } catch {
          res.statusCode = 400
          res.end('Invalid x-s3-upload-url')
          return
        }

        const host = parsed.hostname
        const allowed =
          /\.amazonaws\.com$/i.test(host) ||
          /^s3[.-]/i.test(host) ||
          /\.cloudfront\.net$/i.test(host)
        if (!allowed) {
          res.statusCode = 403
          res.end('Host not allowed for S3 proxy')
          return
        }

        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        const body = Buffer.concat(chunks)

        const forwardHeaders = {}
        if (req.headers['content-type']) {
          forwardHeaders['Content-Type'] = req.headers['content-type']
        }
        if (req.headers['cache-control']) {
          forwardHeaders['Cache-Control'] = req.headers['cache-control']
        }
        for (const [key, value] of Object.entries(req.headers)) {
          if (/^x-amz-/i.test(key) && value != null) {
            forwardHeaders[key] = Array.isArray(value) ? value.join(',') : value
          }
        }

        try {
          const upstream = await fetch(target, {
            method: 'PUT',
            headers: forwardHeaders,
            body,
          })
          const etag = upstream.headers.get('etag')
          res.statusCode = upstream.status
          if (etag) res.setHeader('ETag', etag)
          const text = await upstream.text()
          res.end(text)
        } catch (err) {
          console.error('[kushWeb] S3 DEV proxy failed', err?.message || err)
          res.statusCode = 502
          res.end(String(err?.message || 'S3 proxy failed'))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const pixelId = env.VITE_META_PIXEL_ID || ''
  const metaPixelPlugin = metaPixelHtmlPlugin(pixelId)
  const apiOrigin = resolveApiOrigin(env)
  const exposeDevServerOnLan = env.VITE_DEV_LAN === 'true'
  const isProdApp = resolveBuildAppEnv(env, mode) === 'prod'
  const s3DevProxyOff =
    String(env.VITE_S3_DEV_PROXY ?? 'true').toLowerCase() === 'false'
  const devProxy = apiOrigin
    ? {
        '/api': {
          target: apiOrigin,
          changeOrigin: true,
        },
        '/socket.io': {
          target: apiOrigin,
          changeOrigin: true,
          ws: true,
        },
      }
    : undefined

  if (mode === 'development' && !apiOrigin) {
    console.warn(
      '[kushWeb] VITE_API_URL is not set — dev /api proxy disabled. Add it to .env.',
    )
  }
  if (mode === 'development' && !s3DevProxyOff) {
    console.info(
      '[kushWeb] S3 DEV PUT proxy enabled at /__dev/s3-put (set VITE_S3_DEV_PROXY=false to use direct browser→S3).',
    )
  }

  return {
    plugins: [
      tailwindcss(),
      react(),
      metaPixelPlugin,
      mode === 'development' && !s3DevProxyOff ? s3DevPutProxyPlugin() : null,
    ].filter(Boolean),
    esbuild: {
      drop: isProdApp ? ['console', 'debugger'] : [],
    },
    server: {
      host: exposeDevServerOnLan ? '0.0.0.0' : 'localhost',
      port: 5174,
      ...(devProxy ? { proxy: devProxy } : {}),
    },
    preview: {
      host: exposeDevServerOnLan ? '0.0.0.0' : 'localhost',
      port: 5174,
    },
  }
})
