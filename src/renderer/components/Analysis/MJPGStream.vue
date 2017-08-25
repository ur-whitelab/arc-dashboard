<template>
  <div class="camera-container container is-fluid">
    <div class="">
      <h2 class="title is-capitalized has-text-centered"> {{processFromId(process).name}} Stream {{streamName}}</h2>
      <template v-if="videoAvailable">
        <h3 class="subtitle  has-text-centered"> {{fps}} fps </h3>
        <img id="video" class="video" :src="url">
        <template v-if="videoAvailable">
          <table class="table">
            <tbody>
              <template v-for="(value, key) in streamChoices">
                <tr>
                  <th> {{key}} </th>
                  <template v-for="stream in value">
                      <td>
                        <div class="control">
                          <label class="radio">
                            <input type="radio" :value="stream" v-model="streamName">
                            {{stream}}
                          </label>
                        </div>
                      </td>
                  </template>
                </tr>
              </template>
            </tbody>
          </table>
        </template>
      </template>
    </div>
    <template v-if="!videoAvailable">
      <div class="video-warning notification is-warning has-text-centered">
        <div class="icon is-large unavailable">
          <i class="fa fa-ellipsis-h"></i>
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

export default {
  name: 'mjpgstream',
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
      streamName: 'raw',
      streamChoices: {},
      fps: 0
    }
  },
  computed: {
    ...mapGetters([
      'processFromId'
    ]),
    cameraRunning: function () {
      const p = this.processFromId(this.process)
      if (p)
        return p.status === status.RUNNING
      else
        return false
    },
    url: function () {
      return 'http://' + this.host + ':' + this.myPort + '/stream/' + this.streamName + '.mjpg?t=' + new Date().getTime()
    }
  },
  watch: {
    cameraRunning: async function (newV, oldV) {
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
    }
  },
  methods: {
    updateStats: _.throttle(async function () {
      try {
        const response = await axios.get('http://' + this.host + ':' + this.myPort + '/stats')
        if ('stream_names' in response.data)
          this.streamChoices = response.data.stream_names
        const fpsRaw = Number(response.data.frequency)
        this.fps = Math.round(fpsRaw)
      } catch (err) {
        // pass
      } finally {
        if (this.videoAvailable)
          this.updateStats()
      }
    }, 2000)
  }

}

</script>

<style lang="scss">


</style>
