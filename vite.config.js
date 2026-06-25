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

function resolveAssetOrigin(env) {
  const raw = String(env.VITE_ASSET_URL || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw.replace(/\/$/, '') || raw).origin;
  } catch {
    return '';
  }
}

function securityHeadersPlugin({ apiOrigin, assetOrigin, pixelId }) {
  return {
    name: 'khush-security-headers',
    transformIndexHtml(html) {
      if (process.env.NODE_ENV !== 'production') return html;
      const connectOrigins = ["'self'", 'ws:', 'wss:'];
      if (apiOrigin) connectOrigins.push(apiOrigin);
      if (assetOrigin) connectOrigins.push(assetOrigin);
      const scriptSrc = [
        "'self'",
        'https://connect.facebook.net',
        'https://checkout.razorpay.com',
        'https://*.razorpay.com',
        'https://maps.googleapis.com',
      ];
      const connectSrc = [
        ...connectOrigins,
        'https://*.razorpay.com',
        'https://connect.facebook.net',
        'https://maps.googleapis.com',
        'https://nominatim.openstreetmap.org',
        'https://*.nimbbl.com',
        'https://*.nimbbl.tech',
      ];
      if (pixelId) {
        connectSrc.push(
          'https://www.facebook.com',
          'https://*.facebook.com',
          'https://graph.facebook.com',
          // Meta Pixel conversion / CAPI beacons (dynamic subdomains)
          'https://*.a.run.app',
          'https://*.on.aws',
        );
      }
      const imgSrc = ["'self'", 'data:', 'blob:', 'https:'];
      if (assetOrigin) imgSrc.push(assetOrigin);
      const mediaSrc = ["'self'", 'blob:', 'https:'];
      if (assetOrigin) mediaSrc.push(assetOrigin);
      const frameSrc = [
        'https://www.google.com',
        'https://maps.google.com',
        'https://api.razorpay.com',
        'https://*.razorpay.com',
        'https://*.nimbbl.com',
      ];
      if (pixelId) {
        frameSrc.push('https://www.facebook.com');
      }
      const csp = [
        "default-src 'self'",
        `script-src ${scriptSrc.join(' ')}`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.cdnfonts.com",
        `img-src ${imgSrc.join(' ')}`,
        `media-src ${mediaSrc.join(' ')}`,
        "font-src 'self' data: https://fonts.gstatic.com https://fonts.cdnfonts.com",
        `connect-src ${connectSrc.join(' ')}`,
        `frame-src ${frameSrc.join(' ')}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ');
      return html.replace(
        '</head>',
        `\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />\n  </head>`
      );
    },
  };
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
  const assetOrigin = resolveAssetOrigin(env)
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
    plugins: [tailwindcss(), react(), metaPixelPlugin, securityHeadersPlugin({ apiOrigin, assetOrigin, pixelId })].filter(Boolean),
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
