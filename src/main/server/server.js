import express from 'express'
import {ipcMain} from 'electron'
import _ from 'lodash'

const app = express()
const processes = {}

app.get('/process/:name/', function (req, res) {
  res.json(_.find(processes, {name: req.params.name}))
})

ipcMain.on('process-status', (event, arg) => {
  processes[arg.id] = arg
})

export default app
