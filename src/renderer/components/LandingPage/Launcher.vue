<template>
  <div>

  <section class="section">
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
      <div class="container launcher">
        <div class="columns is-gapless">
        <div v-if="processes.length > 0" class="is-2 column">
          <nav class="panel">
            <p class="panel-heading"> controls </p>
            <a :disabled="processes[activeProcess].status !== status.READY"
            class="button panel-block is-success control-launch"
            @click="startProcess(activeProcess)">
              <span class="panel-icon">
                <i class="fa fa-play"></i>
              </span>
              Launch {{processes[activeProcess].name}}
            </a>
          </nav>
        </div>
        <div class="column">
          <stream-viewer :status="status"
            :processes="processes"
            :currentStatus="currentStatus"
            :index="activeProcess">
          </stream-viewer>
        </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import StreamViewer from './StreamViewer'
import _ from 'lodash'

var status = { READY: 'ready', DISABLED: 'disabled', LOADING: 'loading', RUNNING: 'running' }

async function startExeProcess (p) {
  return null
}

export default {
  name: 'launcher',
  components: { StreamViewer },
  data () {
    return {
      status: status,
      processes: [],
      activeProcess: 0
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

      if (p.dokcer_id !== null) {
        this.startDockerProcess(p).then((result) => {
          // will arrive here after exit. Reset
          p.status = status.READY
        })
      } else {
        startExeProcess(p).then(() => {
          p.status = status.RUNNING
        })
      }
    },
    startDockerProcess: async function (p) {
      // load what's in our DB and turn it into a docker run command
      // default
      const dconfig = (await this.$db.findPromise({ _id: 'cdocker' }))[0]
      // process specific
      const pconfig = (await this.$db.findPromise({ _id: p.docker_id }))[0]

      const opts = dconfig.create_options
      opts.Image = pconfig.image
      opts.Cmd = pconfig.cmd
      // need to replace . with actual current directort
      for (let i = 0; i < pconfig.binds.length; i++) {
        if (pconfig.binds[i].split(':')[0] === '.') {
          pconfig.binds[i] = process.cwd() + ':' + pconfig.binds[i].split(':')[1]
          this.$log.info('Replacing . in bind to get ' + pconfig.binds[i])
        }
      }
      opts.Hostconfig = {'Binds': pconfig.binds}

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
      p.instances = _.remove(p.instances, instId)
      delete p.readStreams.instId
    }
  },
  watch: {
    activeProcess: function (newV, oldV) {
      if (this.processes[newV].status === status.DISABLED)
        this.activeProcess = oldV
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
    padding: 2rem 2rem 2rem;
    border-left: solid 1px lightgray;
    border-bottom: solid 1px lightgray;
    border-right: solid 1px lightgray;
  }

  .process-tabs,.tabs:not(:last-child) {
    margin-bottom: inherit;
  }

</style>
