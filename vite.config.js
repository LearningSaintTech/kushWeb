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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const pixelId = env.VITE_META_PIXEL_ID || ''
  const metaPixelPlugin = metaPixelHtmlPlugin(pixelId)

  return {
    plugins: [tailwindcss(), react(), metaPixelPlugin].filter(Boolean),
    server: {
      host: '0.0.0.0',
      port: 5174,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 5174,
    },
  }
})
