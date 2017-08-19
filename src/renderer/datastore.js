import Datastore from 'nedb'
import path from 'path'
import { remote } from 'electron'
import dbDefaults from './db-defaults'
import log from 'electron-log'

const db = new Datastore({
  autoload: true,
  filename: path.join(remote.app.getPath('userData'), '/artable/data.db')
})

log.info('Loading existing db from ' +
    path.join(remote.app.getPath('userData'), '/artable/data.db'))

// load defaults but do not override

for (let r of dbDefaults) {
  const result = db.insert(r) // will not load if key exists
  if (result)
    log.info(`Added default ${r._id}`)
  else
    log.info(`Did not override loaded ${r._id}`)
}

function findPromisfy (...args) {
  return new Promise((resolve, reject) => {
    db.find(...args, (err, docs) => {
      if (err)
        reject(err)
      else
        resolve(docs)
    })
  })
}

db.findPromise = findPromisfy

export default db
