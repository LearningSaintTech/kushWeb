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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const pixelId = env.VITE_META_PIXEL_ID || ''
  const metaPixelPlugin = metaPixelHtmlPlugin(pixelId)
  const apiOrigin = resolveApiOrigin(env)
  const exposeDevServerOnLan = env.VITE_DEV_LAN === 'true'
  const isProdApp = resolveBuildAppEnv(env, mode) === 'prod'
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

  return {
    plugins: [tailwindcss(), react(), metaPixelPlugin].filter(Boolean),
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
