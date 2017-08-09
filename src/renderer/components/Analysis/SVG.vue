<template>
  <article>
    <figure class="image is4by3">
      <img :src="srcBust">
    </figure>
  </article>
</template>

<script>

import ipcRenderer from 'electron'

export default {
  name: 'SVG',
  props: ['src'],
  data () {
    return {
      srcBust: this.src
    }
  },
  mounted: function () {
    ipcRenderer.on('analysis-svg', (event, arg) => {
      if (arg === this.src)
        this.srcBust = this.src + '?t=' + new Date().getTime()
    })
  }

}
</script>
