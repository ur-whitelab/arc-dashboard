import Vue from 'vue'
import axios from 'axios'
import {remote} from 'electron'

import App from './App'
import router from './router'
import db from '../db/datastore'
import docker from './docker'
import log from 'electron-log'
import store from './store'
import * as types from './store/mutation-types'

import 'bulma/css/bulma.css'
import 'font-awesome/css/font-awesome'

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.http = Vue.prototype.$http = axios
Vue.config.productionTip = false
// make db accessible
Vue.prototype.$db = db(remote.app.getPath('userData'))

// make accessible
Vue.prototype.$docker = docker

// make log accessible
Vue.prototype.$log = log

/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  store,
  template: '<App/>',
  created: async function () {
    // load processes into store
    this.$log.info(`Adding in processes:`)
    const docs = await this.$db.findPromise({ type: 'process' })
    for (let d of docs)
      this.$store.commit(types.PROCESS_INSERT, d)
    this.$log.info(`Adding in ${docs.length} processes`)
  }
}).$mount('#app')
