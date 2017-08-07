<template>
  <div class="notification is-outlined">
    <div class="has-text-centered">
      <h1> Output for <strong>{{processes.length == 0 || processes[index].name}}</strong> </h1>
    </div>
    <div class="">
      <code class="terminal is-size-7">
        {{text}}
      </code>
    </div>
  </div>
</template>

<script>

const { Writable } = require('stream')
import Convert from 'ansi-to-html'

export default {
  name: 'streamViewer',
  props: ['processes', 'index', 'currentStatus', 'status'],
  data () {
    return {
      streams: {},
      streamIndex: '',
      bufferMax: 4096,
      text: ''
    }
  },
  watch: {
    currentStatus: function () {
      this.updateStream()
    },
    index: function () {
      this.updateStream()
    }
  },
  methods: {
    // a helper since this is needed both when a currentStatus changes and
    // index
    updateStream: function () {
      console.log(this.currentStatus)
      if (this.currentStatus === this.status.RUNNING || this.currentStatus === this.status.LOADING) {
        // check if a stream is available
        const p = this.processes[this.index]
        if (p.instances.length > 0) {
          var inst = p.instances[p.instances.length - 1]
          if (inst in p.readStreams) {
            this.streamIndex = inst
            this.updateStreamIndex()
          }
        }
      }
    },
    // another helper, since we need to be able to change based on current status
    updateStreamIndex: function () {
      if (!(this.streamIndex in this.streams)) {
        // doesn't exist, need to create new stream
        this.$log.info('Processing a new output stream for ' + this.streamIndex)
        const myIndex = this.streamIndex
        let buffer = new Convert({ stream: true })
        let ws = new Writable({
          write (chunk, enc, next) {
            // add to my buffer

            buffer.push(chunk)

            if (this.streamIndex === myIndex)
              this.text += chunk

            next()
          }
        })
        // bind the stream!
        this.processes[this.index].readStreams[myIndex].pipe(ws)
        this.streams[this.streamIndex] = {stream: ws, buffer: buffer}
      } else {
        // already exists, so we are returning to it (?).
        // get buffer from text
        this.$log.info('Triggering rebuild of text due to change')
        this.text = this.streams[this.streamIndex].buffer.join()
      }
    }
  }
}
</script>

<style lang="scss">


</style>
