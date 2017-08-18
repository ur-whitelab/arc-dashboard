import Vue from 'vue'
import axios from 'axios'

import App from './App'
import router from './router'
import db from './datastore'
import docker from './docker'
import log from 'electron-log'
import store from '.store'

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
  template: '<App/>'
}).$mount('#app')
