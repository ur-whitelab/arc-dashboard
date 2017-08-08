<template>
  <div class="output">
    <div class="has-text-centered">
      <h1> Output for <strong>{{processes.length == 0 || processes[index].name}}</strong> </h1>
    </div>
    <div class="terminal">
      <pre class="terminal-code">
        {{text}}
      </pre>
    </div>
  </div>
</template>

<script>
const { Writable } = require('stream')

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
  beforeDestroy: function () {
    if ('obs' in this)
      this.obs.disconnect()
  },
  watch: {
    currentStatus: function () {
      this.updateStream()
    },
    index: function () {
      this.text = ''
      this.updateStream()
    }

  },
  methods: {
    // a helper since this is needed both when a currentStatus changes and
    // index
    updateStream: function () {
      if (this.currentStatus !== this.status.DISABLED) {
        // check if a stream is available
        const p = this.processes[this.index]
        if (p.instances.length > 0) {
          var inst = p.instances[p.instances.length - 1]
          if (inst in p.readStreams) {
            this.streamIndex = inst
            this.updateStreamIndex()
          }
        }
        // add obs if necessary
        if (!('obs' in this)) {
          const elem = document.querySelector('.terminal')
          this.obs = new MutationObserver((m) => {
            elem.scrollTop = elem.scrollHeight
          })
          this.obs.observe(document.querySelector('.terminal-code'), { attributes: true, childList: true, characterData: true, subtree: true })
        }
      }
    },
    // another helper, since we need to be able to change based on current status
    updateStreamIndex: function () {
      if (!(this.streamIndex in this.streams)) {
        // clear existing stream
        this.text = ''
        // doesn't exist, need to create new stream
        this.$log.info('Processing a new output stream for ' + this.streamIndex)
        const myIndex = this.streamIndex
        const buffer = []
        const v = this
        const ws = new Writable()

        ws._write = (chunk, enc, next) => {
          // add to my buffer
          if (buffer.length === v.bufferMax)
            buffer.splice(0, 1)

          buffer.push(chunk)

          if (v.streamIndex === myIndex)
            v.text += chunk.toString()

          next()
        }

        // bind the stream!
        this.processes[this.index].readStreams[myIndex].pipe(ws)
        this.streams[this.streamIndex] = {stream: ws, buffer: buffer}
      } else {
        // already exists, so we are returning to it (?).
        // get buffer from text
        this.$log.info('Triggering rebuild of text due to change')
        const s = this.streams[this.streamIndex]
        this.text = s.buffer.join()
      }
    }
  }
}
</script>

<style lang="scss">

.output  {
    margin-left:2rem;
}

.terminal {
  background: darkgray;
  color: $primary;
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: scroll;
  width: 80ch;
}

.terminal-code {
  background: darkgray;
  color:white;
  font-size:1.2ch;
  font-family: monospace;
}

</style>
