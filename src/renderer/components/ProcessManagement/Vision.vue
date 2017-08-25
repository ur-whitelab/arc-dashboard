<template>
  <div class="container is-fluid">
    <h1 class="title"> Vision Controller </h1>
    <template v-if="videoAvailable">
      <div class="columns">
        <div class="column">
          <div class="field">
            <label class="label">Mode</label>
            <div class="control">
              <div class="select">
                <select v-model="settings.mode">
                  <option v-for="option in modeChoices" :value="option">
                    {{ option }}
                  </option>
                </select>
              </div>
            </div>
          </div>
          <div class="field is-grouped">
            <div class="control">
              <a class="button is-primary" :disabled="!settings.pause" @click="settings.pause = false">
                <span class="icon">
                  <i class="fa fa-play"></i>
                </span>
              </a>
              <a class="button is-primary" :disabled="settings.pause" @click="settings.pause = true">
                <span class="icon">
                  <i class="fa fa-pause"></i>
                </span>
              </a>
            </div>
          </div>
        </div>
        <div class="column">
          <template v-if="settings.mode == 'background'">
            <background :settings.sync="settings"></background>
          </template>
          <template v-if="settings.mode == 'training'">
            <training :settings.sync="settings"></training>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import status from '../../constants'
import axios from 'axios'
import { mapGetters } from 'vuex'
import _ from 'lodash'
import Background from './VisionControls/Background'
import Training from './VisionControls/Training'

export default {
  name: 'vision',
  components: { Background, Training },
  props: {
    port: null,
    process: String,
    host: {
      default: '127.0.0.1'
    },
    width: {
      type: Number,
      default: 300
    }
  },
  data () {
    return {
      myPort: '',
      status: status,
      videoAvailable: false,
      settings: {pause: false, mode: 'background'},
      modeChoices: ['background']
    }
  },
  computed: {
    ...mapGetters([
      'processFromId'
    ]),
    visionRunning: function () {
      const p = this.processFromId(this.process)
      if (p)
        return p.status === status.RUNNING
      else
        return false
    }
  },
  watch: {
    visionRunning: async function (newV, oldV) {
      if (newV) {
        // we add timestamp just in case this is called multiple times
        // add start-up delay for webcam
        // we know the process is running. Need to see if port is viable or
        // do we need to look into db for it
        if (typeof this.port === 'string' && this.myPort === '') {
          const docs = await this.$db.findPromise({ _id: 'cnetwork' })
          if (this.port in docs[0].ports)
            this.myPort = docs[0].ports[this.port]
          else
            this.$log.error(`Bad port specification ${this.myPort}, which does not match any ports in cnetwork db entry`)
        }
        this.videoAvailable = true
        this.updateStats()
      } else
        this.videoAvailable = false
    },
    settings: {
      handler: async function () {
        if (this.visionRunning)
          await this.sendSettings()
      },
      deep: true
    }
  },
  methods: {
    updateStats: async function () {
      const response = await axios.get('http://' + this.host + ':' + this.myPort + '/stats')
      if ('modes' in response.data) {
        this.modeChoices = response.data.modes
        this.settings['mode'] = response.data.settings.mode
        this.settings['pause'] = response.data.settings.pause === 'True'
      }
    },
    sendSettings: _.debounce(async function () {
      await axios.post('http://' + this.host + ':' + this.myPort + '/settings', JSON.stringify(this.settings))
      // need to remove action if we had one
      this.settings['action'] = ''
    }, 100)
  }

}

</script>

<style lang="scss">


</style>