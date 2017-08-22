import Datastore from 'nedb'
import path from 'path'
import dbDefaults from './db-defaults'
import log from 'electron-log'

async function load (userData) {
  const db = new Datastore({
    autoload: false
    // filename: path.join(userData, '/artable/data.db')
  })

  log.info('Loading existing db from ' + path.join(userData, '/artable/data.db'))

  // attach some promised versions
  function findPromise (...args) {
    return new Promise((resolve, reject) => {
      db.find(...args, (err, docs) => {
        if (err)
          reject(err)
        else
          resolve(docs)
      })
    })
  }

  function insertPromise (...args) {
    return new Promise((resolve, reject) => {
      db.insert(...args, (err, docs) => {
        if (err)
          reject(err)
        else
          resolve(docs)
      })
    })
  }

  db.findPromise = findPromise
  db.insertPromise = insertPromise

  // load defaults but do not override

  for (let r of dbDefaults) {
    try {
      await db.insertPromise(r) // will not load if key exists
      log.info(`Added default ${r._id}`)
    } catch (err) {
      log.info(`Did not override loaded ${r._id}`)
      continue
    }
  }

  return db
}

export default load
