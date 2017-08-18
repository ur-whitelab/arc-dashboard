import Vue from 'vue'
import Vuex from 'vuex'
import processes from './modules/processes'

Vue.use(Vuex)

const debug = process.env.NODE_ENV !== 'production'

export default new Vuex.Store({
  modules: {
    processes
  },
  strict: debug
})
