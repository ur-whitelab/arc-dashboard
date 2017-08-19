<template>
  <div>
    <div class="container is-fluid">
      <div class="tabs is-boxed is-centered process-tabs">
        <ul class="">
          <template v-for="(process, index) in processes">
            <template v-if="process.status !== status.DISABLED">
              <li :class="{'is-active': activeProcess == index}">
                <a :id="index" class="process-tab" :class="process.status" @click="activeProcess = index">
                  <span class="icon is-small">
                    <i class="fa" :class="{ 'fa-ban': process.status === status.DISABLED,
                    'fa-server': process.status === status.RUNNING ||  process.status === status.LOADING,
                    'fa-power-off': process.status === status.READY }">
                    </i>
                  </span>
                  {{process.name}}
                </a>
              </li>
            </template>
          </template>
        </ul>
      </div>
    </div>
    <div class="container is-fluid launcher">
      <div class="columns is-gapless">
        <div v-if="processes.length > 0" class="is-half-mobile is-one-third-tablet is-one-quarter-desktop column">
          <nav class="panel">
            <p class="panel-heading"> parameters </p>
            <template v-for="(arg, i) in argPrompt">
              <p class="arg-description panel-block">
                <label> {{arg.description}}</label>
              </p>
              <div class="panel-block">
                <p class="control has-icons-left">

                  <input :id="'arg' + i" onClick="this.select();"
                  class="input is-small" type="text" v-model="arg.value"
                  v-on:keyup.13="this.$refs['arg' + (i + 1)].focus()"
                  v-on:keyup.9="this.$refs['arg' + (i + 1)].focus()">
                  <span class="icon is-small is-left">
                    <i class="fa fa-arrow-up"></i>
                  </span>
                </p>
              </div>
            </template>
              <a :disabled="processes[activeProcess].status !== status.READY"
              :id="'arg' + (1 + argPrompt.length)" class="button panel-block is-success control-launch"
              @click="startProcess(processes[activeProcess].id)">
                <span class="panel-icon">
                  <i class="fa fa-play"></i>
                </span>
                Launch {{processes[activeProcess].name}}
              </a>
              <a :disabled="processes[activeProcess].status !== status.RUNNING" :id="'arg' + (2 + argPrompt.length)"
              class="button panel-block is-warning control-launch" @click="stopProcess(processes[activeProcess].id)">
                <span class="panel-icon">
                  <i class="fa fa-stop"></i>
                </span>
                Stop {{processes[activeProcess].name}}
              </a>
          </nav>
        </div>
        <div class="column">
          <div>
            <stream-viewer :status="status" :processes="processes" :currentStatus="currentStatus" :index="activeProcess"></stream-viewer>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'
import StreamViewer from './StreamViewer'
import { mapActions, mapGetters } from 'vuex'
import status from '../../constants'

export default {
  name: 'launcher',
  components: { StreamViewer },
  data () {
    return {
      status: status,
      activeProcess: 0,
      argPrompt: []
    }
  },

  computed: {
    ...mapGetters({
      processes: 'processesList'
    }),
    currentStatus: function () {
      if (this.processes.length > 0)
        return this.processes[this.activeProcess].status
    }
  },

  methods: {
    ...mapActions([
      'startProcess',
      'stopProcess',
      'updateArgument'
    ])
  },
  watch: {

    argPrompt: {
      handler: _.debounce(function (newV) {
        for (let a of newV) {
          if (a.context === 'cmd')
            this.updateArgument({id: a.id, index: a.index, value: a.value})
          else if (a.context === 'binds')
            this.$log.error('Updating binds for docker container is not implemented')
        }
      }, 200),
      deep: true
    },

    activeProcess: function (newV, oldV) {
      this.argPrompt = []

      const p = this.processes[this.activeProcess]
      if (p.status === status.DISABLED)
        this.activeProcess = oldV
      // process argument string
      this.argPrompt = []
      if ('cmd' in p) {
        for (let i = 0; i < p.cmd.length; i++) {
          if (p.cmd[i] instanceof Object) {
            // copy so we don't accidentally modify
            const a = Object.assign({}, p.cmd[i])
            // need to store index and id references for updating
            a.index = i
            a.id = p.id
            a.context = 'cmd'
            a.value = a.default
            this.argPrompt.push(a)
          }
        }
      } else if (p.docker_id !== null) {
        // docker process
        // create prompts, which are a little more complex
        // only allowable in binds for now
        this.$db.find({ _id: p.docker_id }, (err, docs) => {
          if (err)
            this.$log.warn('Could not find docker id for process')
          let d = docs[0]
          if ('binds' in d) {
            for (let i = 0; i < d.binds.length; i++) {
              const a = d.binds[i].host
              a.value = a.default
              a.index = i
              a.context = 'binds'
              this.argPrompt.push(a)
            }
          }
        })
      }
    }
  }
}
</script>

<style lang="scss">

  .icon {
    vertical-align:baseline;
  }

  .process-tab.disabled {
    background-color: lightgray;
    &:hover {
      background-color: lightgray !important;
      color: inherit !important;
      cursor: default;
      border-color: lightgray !important;
    }
  }

  .process-tab.disabled  .icon {
    color: red;
  }

  .process-tab.loading  .icon {
    color: $warning;
  }

  .process-tab.running  .icon {
    color: $success;
  }

  .launcher .columns {
    margin: 0rem;
    padding: 2rem 2rem 2rem 2rem;
    border-left: solid 1px lightgray;
    border-bottom: solid 1px lightgray;
    border-right: solid 1px lightgray;
  }

  .process-tabs,.tabs:not(:last-child) {
    margin-bottom: inherit;
  }

  .panel {
    margin-top:1.5rem;
  }

  .arg-description {
    font-size: 1rem;
  }

</style>