import Datastore from 'nedb'
import path from 'path'
import { remote } from 'electron'
const dbDefaults = require('./db-defaults')

const db = new Datastore({
  autoload: true,
  filename: path.join(remote.app.getPath('userData'), '/artable/data.db')
})

// load defaults but do not override
console.log(dbDefaults)
for (let r of dbDefaults)
  db.insert(r) // will not load if key exists

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
