<template>
  <div class="camera-container container is-fluid">
    <div class="has-text-centered">
      <h2 class="title"> Video Feed </h2>
      <h3 class="subtitle"> {{fps}} fps </h3>
        <img id="video" class="video" :src="url">
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
  name: 'camera',
  props: {
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
      port: '',
      status: status,
      videoAvailable: false,
      url: '',
      fps: 0
    }
  },
  computed: {
    ...mapGetters([
      'processFromId'
    ]),
    cameraRunning: function () {
      const p = this.processFromId('p5')
      if (p)
        return p.status === status.RUNNING
      else
        return false
    }
  },

  watch: {
    cameraRunning: function (newV, oldV) {
      if (newV) {
        // we know the vision process is running, now we update our img tag
        // it would be possible to attach host/port to vision process, but this
        // is possible too

        this.$db.find({ _id: 'cnetwork' }, (err, docs) => {
          if (err)
            throw err
          const c = docs[0]
          this.port = c.ports.video
          // we add timestamp just in case this is called multiple times
          // add start-up delay for webcam
          this.url = 'http://' + this.host + ':' + this.port + '/stream.mjpg?t=' + new Date().getTime()
          this.videoAvailable = true
          this.updateFPS()
        })
      } else
        this.videoAvailable = false
    }
  },
  methods: {
    updateFPS: _.debounce(async function () {
      try {
        const response = await axios.get('http://' + this.host + ':' + this.port + '/stats')
        const fpsRaw = Number(response.data.frequency)
        this.fps = Math.round(fpsRaw)
      } finally {
        if (this.videoAvailable)
          this.updateFPS()
      }
    }, 2000)
  }

}

</script>

<style lang="scss">


</style>
