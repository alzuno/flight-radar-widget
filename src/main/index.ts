import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { loadConfig } from './config'
import { OpenSkyClient, startPolling } from './opensky'

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 400,
    height: 400,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js')
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  const win = createWindow()

  const config = loadConfig()
  const client = new OpenSkyClient(config)

  startPolling(
    client,
    config.pollIntervalSeconds,
    (flights) => {
      console.log(`[opensky] ${flights.length} aeronaves recibidas`)
      win.webContents.send('flights:update', flights)
    },
    (err) => {
      console.error('[opensky] error de polling:', err)
    }
  )
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
