<template>
  <div>

  <div class="container is-fluid">
    <div class="tabs is-boxed is-centered process-tabs">
      <ul class="">
        <template v-for="(process, index) in processes">
          <li :class="{'is-active': activeProcess == index}">
            <a :id="index" class="process-tab"
              :class="process.status"
              @click="activeProcess = index">
              <span class="icon is-small">
                <i class="fa"
                :class="{ 'fa-ban': process.status === status.DISABLED,
                'fa-server': process.status === status.RUNNING ||  process.status === status.LOADING,
                'fa-power-off': process.status === status.READY }">
                </i>
              </span>
                {{process.name}}
            </a>
          </li>
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
                    class="input is-small" type="text"
                    v-model="arg.value"
                    v-on:keyup.13="document.getElementById('arg' + (i + 1)).focus()"
                    v-on:keyup.9="document.getElementById('arg' + (i + 1)).focus()">
                  <span class="icon is-small is-left">
                    <i class="fa fa-arrow-up"></i>
                  </span>
                </p>
              </div>
            </template>

          <a :disabled="processes[activeProcess].status !== status.READY"
          :id="'arg' + (1 + argPrompt.length)"
          class="button panel-block is-success control-launch"
          @click="startProcess(activeProcess)">
            <span  class="panel-icon">
              <i class="fa fa-play"></i>
            </span>
            Launch {{processes[activeProcess].name}}
          </a>
        </nav>
      </div>
      <div class="column">
        <div>
        <stream-viewer :status="status"
          :processes="processes"
          :currentStatus="currentStatus"
          :index="activeProcess">
        </stream-viewer>
        </div>
      </div>
      </div>
    </div>

  </div>
</template>

<script>
import StreamViewer from './StreamViewer'
import merge from 'merge-stream'

const { exec } = require('child_process')

var status = { READY: 'ready', DISABLED: 'disabled', LOADING: 'loading', RUNNING: 'running' }

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

    startProcess: function (index) {
      const p = this.processes[index]
      if (p.status !== status.READY)
        return
      p.status = status.LOADING

      if (p.docker_id !== null)
        this.startDockerProcess(p)
      else
        this.startExeProcess(p)
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
      p.status = status.LOADING
      const ps = exec(cmd.join(' '))
      this.$log.info('Spawning with ' + cmd)
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
            p.status = status.RUNNING
          })
          ps.stderr.on('data', () => {
            p.status = status.RUNNING
          })
        })
      } catch (err) {
        throw err
      } finally {
        p.status = status.READY
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
      const instId = 'd' + container.id
      p.instances.push(instId)

      // get the stream we can read from
      let stream = await container.attach({stream: true, stdout: true, stderr: true})
      p.readStreams[instId] = stream
      p.container_id = container.id
      container.inspect((e, d) => {
        if (e)
          console.log(e)
        p.container_ip = d.NetworkSettings.IPAddress
      })
      p.status = status.RUNNING
      await container.start()
      await container.wait()
      await container.remove()
      p.container_id = null
      p.container_ip = null
      p.status = status.READY
    }
  },
  watch: {
    activeProcess: function (newV, oldV) {
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
