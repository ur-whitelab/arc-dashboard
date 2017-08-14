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

                  <input :id="'arg' + i" onClick="this.select();" class="input is-small" type="text" v-model="arg.value" v-on:keyup.13="document.getElementById('arg' + (i + 1)).focus()" v-on:keyup.9="document.getElementById('arg' + (i + 1)).focus()">
                  <span class="icon is-small is-left">
                    <i class="fa fa-arrow-up"></i>
                  </span>
                </p>
              </div>
            </template>
              <a :disabled="processes[activeProcess].status !== status.READY" :id="'arg' + (1 + argPrompt.length)" class="button panel-block is-success control-launch" @click="startProcess(processes[activeProcess]._id)">
                <span class="panel-icon">
                  <i class="fa fa-play"></i>
                </span>
                Launch {{processes[activeProcess].name}}
              </a>
              <a :disabled="processes[activeProcess].status !== status.RUNNING" :id="'arg' + (2 + argPrompt.length)" class="button panel-block is-warning control-launch" @click="stopProcess(processes[activeProcess]._id)">
                <span class="panel-icon">
                  <i class="fa fa-stop"></i>
                </span>
                Stop {{processes[activeProcess].name}}
              </a>
          </nav>
        </div>
        <div class="column">
          <template v-if="activeProcess == 0">
            <div>
              <stream-viewer :status="status" :processes="processes" :currentStatus="currentStatus" :index="activeProcess">
              </stream-viewer>
            </div>
          </template>
          <template v-else>
            <div>
              <h3> Big Launcher </h3>
            </div>
          </template>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import StreamViewer from './StreamViewer'
import merge from 'merge-stream'
import status from '../../constants'
import kill from 'tree-kill'
import _ from 'lodash'

const {ipcRenderer} = require('electron')
const { exec } = require('child_process')

export default {
  name: 'launcher',
  components: { StreamViewer },
  data () {
    return {
      status: status,
      processes: [],
      activeProcess: 0,
      argPrompt: []
    }
  },

  computed: {
    currentStatus: function () {
      if (this.processes.length > 0)
        return this.processes[this.activeProcess].status
    }
  },

  created: function () {
    this.$db.find({type: 'process'}, (err, docs) => {
      if (!err) {
        this.processes = docs

        // choose a valid active
        for (let i = 0; i < this.processes.length; i++) {
          if (this.processes[this.activeProcess].status === status.DISABLED &&
              this.processes[i].status !== status.DISABLED)
            this.activeProcess = i

          // add needed properties not in DB
          this.processes[i].instances = []
          this.processes[i].readStreams = {}
        }
      }
    })
  },

  methods: {
    setStatus: function (p, status) {
      p.status = status
      // send notification about process

      this.$bus.$emit('process-status', p)
      ipcRenderer.send('process-status', p)
    },
    // start process by id
    startProcess: function (id) {
      const p = _.find(this.processes, {'_id': id})
      if (!p || p.status !== status.READY) {
        this.$log.warn(id + ' was requested to start, but is not ready or invalid id')
        return
      }

      // make sure we have active correct
      this.activeProcess = this.processes.indexOf(p)

      this.setStatus(p, status.LOADING)

      if (p.docker_id !== null)
        this.startDockerProcess(p)
      else
        this.startExeProcess(p)
    },

    stopProcess: async function (id) {
      const p = _.find(this.processes, {'_id': id})
      if (!p || p.status !== status.RUNNING) {
        this.$log.warn(id + ' was requested to kill, but is not ready or invalid id')
        return
      }

      // make sure we have active correct
      this.activeProcess = this.processes.indexOf(p)

      // send notification we are about to kill
      this.setStatus(p, status.LOADING)

      const instId = p.instances.pop()

      if (p.docker_id !== null) {
        // stop container
        await this.$docker.getContainer(instId).stop()
      } else
        await kill(instId)

      this.setStatus(p, status.READY)
    },

    startExeProcess: async function (p) {
      // build command string
      let cmd = []
      let j = 0
      for (let i = 0; i < p.cmd.length; i++) {
        if (p.cmd[i] instanceof Object)
          cmd.push(this.argPrompt[j++].value)
        else
          cmd.push(p.cmd[i])
      }
      this.setStatus(p, status.LOADING)
      this.$log.info('Spawning with ' + cmd.join(' '))
      const ps = exec(cmd.join(' '))
      const instId = ps.pid
      p.instances.push(instId)
      p.readStreams[instId] = merge(ps.stdout, ps.stderr)
      try {
        await new Promise((resolve, reject) => {
          ps.on('close', (code) => {
            if (code !== 0) {
              this.$log.warn()
              reject(Error(cmd + ' ended with code ' + code))
            }
            resolve()
          })
          ps.on('error', (err) => {
            reject(err)
          })
          ps.stdout.on('data', () => {
            this.setStatus(p, status.RUNNING)
          })
          ps.stderr.on('data', () => {
            this.setStatus(p, status.RUNNING)
          })
        })
      } catch (err) {
        throw err
      } finally {
        this.setStatus(p, status.READY)
      }
    },

    startDockerProcess: async function (p) {
      // load what's in our DB and turn it into a docker run command
      // default
      const dconfig = (await this.$db.findPromise({ _id: 'cdocker' }))[0]
      // process specific
      const pconfig = (await this.$db.findPromise({ _id: p.docker_id }))[0]
      // process specific
      const network = (await this.$db.findPromise({ _id: 'cnetwork' }))[0]

      const opts = dconfig.create_options
      opts.Image = pconfig.image
      opts.Cmd = pconfig.cmd
      const binds = []
      // need to replace process paths in binds, which may be relative
      for (let i = 0; i < pconfig.binds.length; i++) {
        let container = pconfig.binds[i].container
        let host = ''
        for (let a of this.argPrompt) {
          if (a.context === 'binds' && a.index === i)
            host = a.value
        }
        if (host === '')
          throw Error('could not understand bind')
        binds.push(host + ':' + container)
      }

      opts.Hostconfig = {'Binds': binds}
      opts.ExposedPorts = {}
      opts.ExposedPorts[network.ports.zmq + '/tcp'] = {}
      this.$log.info('Creating container with ' + JSON.stringify(opts))
      const container = await this.$docker.createContainer(opts)

      // add this container to the list of instances
      const instId = container.id
      p.instances.push(instId)

      // get the stream we can read from
      let stream = await container.attach({stream: true, stdout: true, stderr: true})
      p.readStreams[instId] = stream
      p.container_id = container.id
      container.inspect((e, d) => {
        if (e)
          throw e
        p.container_ip = d.NetworkSettings.IPAddress
        this.$log.info(`Container ${instId} has IP ${p.container_ip}`)
      })
      this.setStatus(p, status.RUNNING)
      await container.start()
      await container.wait()
      await container.remove()
      p.container_id = null
      p.container_ip = null
      this.setStatus(p, status.READY)
    }
  },
  watch: {
    activeProcess: function (newV, oldV) {
      this.argPrompt = []

      // check if we indicate the special all-process
      if (newV === -1)
        return

      const p = this.processes[newV]
      if (p.status === status.DISABLED)
        this.activeProcess = oldV
      // process argument string
      this.argPrompt = []
      if ('cmd' in p) {
        let j = 0
        for (let i = 0; i < p.cmd.length; i++) {
          if (p.cmd[i] instanceof Object) {
            // add j so we can reference latter
            const a = p.cmd[i]
            a.index = j
            a.context = 'cmd'
            a.value = a.default
            this.argPrompt.push(a)
            j++
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
