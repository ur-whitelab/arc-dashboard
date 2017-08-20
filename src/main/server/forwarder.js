import zmq from 'zeromq'
import _ from 'lodash'

const backend = zmq.socket('pub')
const frontend = zmq.socket('sub')
// bind a backend port for producers

const topics = {}

const sendTopics = _.throttle(function (window) {
  window.webContents.send('zmq', topics)
}, 500)

function start (hostname, subPort, pubPort, window) {
  frontend.subscribe('')
  backend.bind('tcp://' + hostname + ':' + subPort, function (err) {
    if (!err) {
      backend.on('message', function (topic, msg) {

      })
    }
  })
  frontend.bind('tcp://' + hostname + ':' + pubPort, function (err) {
    if (!err) {
      frontend.on('message', function (topic, msg) {
        if (topic in topics)
          topics[topic] += 1
        else
          topics[topic] = 0
        sendTopics(window)
        backend.send([topic, msg])
      })
    }
  })
}

export default start
