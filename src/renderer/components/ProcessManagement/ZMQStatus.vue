<template>
  <div class="tile   has-text-centered">
    <div class="tile is-vertical">
      <div class="tile">
        <article class="is-child">
          <h1 class="title"> ZMQ Message Counts </h1>
        </article>
      </div>
      <div class="tile">
        <template v-for="(value, key) in topics">
          <div class="tile is-parent">
            <article class="is-child">
              <p class="has-text-info">{{key}}</p>
              <p class="">
                <span>{{value}}</span>
              </p>
            </article>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>

import {ipcRenderer} from 'electron'

export default {
  name: 'zmqstatus',
  data () {
    return {
      topics: {},
      animatedCounts: {}
    }
  },

  mounted: function () {
    ipcRenderer.on('zmq', this.updateTopics)
  },

  beforeDestroy: function () {
    ipcRenderer.removeListener(this.updateTopics)
  },

  methods: {
    updateTopics: function (event, arg) {
      this.topics = arg
    }
  }
}
</script>

<style lang="scss">
</style>
