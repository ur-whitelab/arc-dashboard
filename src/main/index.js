'use strict'

import { app, BrowserWindow } from 'electron'
import server from './server/server'
import forwarder from './server/forwarder'
import loadDb from '../db/datastore'

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development')
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000
  })

  mainWindow.loadURL(winURL)

  loadDb(app.getPath('userData')).then((db) => {
    // load db and start server
    db.findOne({_id: 'cnetwork'}, (err, doc) => {
      if (!err) {
        // start server
        server.listen(doc.ports.app)
        forwarder('*', doc.ports.zmqSub, doc.ports.zmqPub, mainWindow)
      }
    })
  })

  mainWindow.on('close', () => {
    mainWindow.webContents.send('kill-processes')
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin')
    app.quit()
})

app.on('activate', () => {
  if (mainWindow === null)
    createWindow()
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
