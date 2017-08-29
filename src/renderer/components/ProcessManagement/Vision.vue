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
                  <option v-for="option in modes" :value="option">
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

          <div class="field">
            <label class="label">Feature Calculator</label>
            <div class="control">
              <div class="select">
                <select v-model="settings.descriptor">
                  <option v-for="option in descriptors" :value="option">
                    {{ option }}
                  </option>
                </select>
              </div>
            </div>
          </div>
          <div class="field">
            <label class="label"> Keypoint Threshold </label>
            <div class="control">
              <input type="number"
                :min="settings.descriptor_threshold_bounds[0]"
                :max="settings.descriptor_threshold_bounds[1]"
                :step="settings.descriptor_threshold_step"
                v-model.lazy="settings.descriptor_threshold">
            </div>
          </div>

        </div>
        <div class="column">
          <template v-if="settings.mode == 'background'">
            <background :settings.sync="settings" :sendSettings="sendSettings"></background>
          </template>
          <template v-if="settings.mode == 'training'">
            <training :settings.sync="settings" :sendSettings="sendSettings" :settingsResponse="settingsResponse"></training>
          </template>
          <template v-if="settings.mode == 'extent'">
            <extent :settings.sync="settings" :sendSettings="sendSettings"></extent>
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
import Extent from './VisionControls/Extent'

export default {
  name: 'vision',
  components: { Background, Training, Extent },
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
      settings: {mode: 'background', pause: false, descriptor: 'BRISK', descriptor_threshold: 30, descriptor_threshold_bounds: (0, 30), descriptor_threshold_step: 1},
      descriptors: [],
      modes: [],
      settingsResponse: ''
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
    },
    // this is so I can easily watch it
    descriptor: function () {
      return this.settings.descriptor
    },
    mode: function () {
      return this.settings.mode
    },
    descriptorThreshhold: function () {
      return this.settings.descriptor_threshold
    },
    pause: function () {
      return this.settings.pause
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
    // reset threshdold
    descriptor: function () {
      this.settings.descriptor_threshold = 0
      // send
      this.sendSettings()
    },
    mode: function () {
      this.sendSettings()
    },
    descriptorThreshhold: function () {
      this.sendSettings()
    },
    pause: function () {
      this.sendSettings()
    }

  },
  methods: {
    updateStats: _.debounce(async function () {
      try {
        const response = await axios.get('http://' + this.host + ':' + this.myPort + '/stats')
        if ('settings' in response.data) {
          // align these. Will trigger a sendsettings, but that's ok
          this.settings = response.data.settings
          this.modes = response.data.modes
          this.descriptors = response.data.descriptors
        }
        // ensure we are called sometime in the future
      } finally {
        setTimeout(this.updateStats, 2000)
      }
    }, 200),
    sendSettings: async function () {
      try {
        const response = await axios.post('http://' + this.host + ':' + this.myPort + '/settings', JSON.stringify(this.settings))
        this.settingsResponse = response.data
        console.log(this.settingsResponse)
        this.updateStats()
      } catch (err) {
        this.$log.error(err)
      }
    }
  }

}

</script>

<style lang="scss">


</style>
