import './utils/configureConsole.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { HelmetProvider } from 'react-helmet-async'
import { warnIfProductionApiUrlMissing } from './services/config.js'

import { store, persistor } from './app/store'

import './index.css'
import App from './App.jsx'
import { initMarketingPixels } from './analytics/pixelBootstrap.js'

warnIfProductionApiUrlMissing()

initMarketingPixels()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <App />
        </PersistGate>
      </Provider>
    </HelmetProvider>
  </StrictMode>,
)