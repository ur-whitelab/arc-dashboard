import Vue from 'vue'
import axios from 'axios'

import App from './App'
import router from './router'
import store from './store'
import db from './datastore'
import Docker from 'dockerode'
import log from 'electron-log'

import 'bulma/css/bulma.css'
import 'font-awesome/css/font-awesome'

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.http = Vue.prototype.$http = axios
Vue.config.productionTip = false
// make db accessible
Vue.prototype.$db = db

// load platform specific docker
const isWin = process.platform === 'win32'
let docker = null
if (isWin)
  docker = new Docker({socketPath: '//./pipe/docker_engine'})
else
  docker = new Docker({socketPath: '/var/run/docker.sock'})
// make accessible
Vue.prototype.$docker = docker

// make log accessible
Vue.prototype.$log = log

// creaet global event bus for process start/stop
const bus = new Vue()
Vue.prototype.$bus = bus

/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  store,
  template: '<App/>'
}).$mount('#app')
