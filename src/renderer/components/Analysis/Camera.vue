<template>
  <div class="camera-container container is-fluid">
    <div class="has-text-centered">
      <video class="camera-video" autoplay="autoplay"
      :width="width" :height="videoAvailable ? '' : '0px'"
      :src="url" type="video/ogg" codec="theo">
      </video>
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
      videoAvailable: false,
      url: ''
    }
  },
  mounted: function () {
    if (this.port === '') {
      this.$db.find({_id: 'cnetwork'}, (err, docs) => {
        if (err)
          throw err
        const c = docs[0]
        this.port = c.ports.video
        this.url = 'http://' + this.host + ':' + this.port + '/stream.ogg'
      })
    }
    this.watchVideo()
  },
  methods: {
    watchVideo: function () {
      const elem = this.$el.querySelector('.camera-video')
      if (this.videoAvailable === false) {
        this.videoAvailable = elem.readyState > 1
        elem.load()
        setTimeout(this.watchVideo, 5000)
      } else
        this.width = this.$el.querySelector('.camera-container').clientWidth * 0.9
    }
  }
}

</script>

<style lang="scss">


</style>
