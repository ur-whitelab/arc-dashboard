import Vue from 'vue'
import axios from 'axios'

import App from './App'
import router from './router'
import db from './datastore'
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
Vue.prototype.$db = db

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
  mounted: function () {
    // load processes into store
    this.$log.info(`Adding in processes:`)
    this.$db.find({ type: 'process' }, (err, docs) => {
      if (!err) {
        for (let d of docs)
          this.$store.commit(types.PROCESS_INSERT, d)
        this.$log.info(`Adding in ${docs.length} processes`)
      } else {
        this.$log.error('Failed to find any processes')
        throw err
      }
    })
  }
}).$mount('#app')
