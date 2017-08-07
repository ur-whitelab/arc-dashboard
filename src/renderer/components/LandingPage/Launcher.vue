<template>
  <div>

  <div class="tabs is-toggle">
    <ul>
      <template v-for="(process, index) in processes">
        <li>
          <a :id="index" class="process-tab"
            :class="process.status"
            @click="startProcess(index)">
            <span class="icon is-small">
              <i class="fa"
              :class="{ 'fa-ban': process.status == status.DISABLED,
              'fa-server': process.status == status.RUNNING ||  process.status == status.LOADING,
              'fa-power-off': process.status == status.READY }">
              </i>
            </span>
              {{process.name}}
          </a>
        </li>
      </template>
    </ul>
  </div>
  </div>
</template>

<script>

var status = { READY: 'ready', DISABLED: 'disabled', LOADING: 'loading', RUNNING: 'running' }

async function startExeProcess (p) {
  return null
}

export default {
  data () {
    return {
      status: status,
      name: 'landing-page',
      processes: []
    }
  },

  created: function () {
    this.$db.find({type: 'process'}, (err, docs) => {
      if (!err)
        this.processes = docs
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
          p.progress = 0
          p.status = status.READY
          console.log(result)
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
      // get latest image (if necessary)

      /* I get a freeze on this..maybe doesn't check local image before pull
      await new Promise((resolve, reject) => {
        this.$docker.pull(pconfig.image, (err, stream) => {
          if (err)
            reject(err)
          this.$docker.modem.followProgress(stream, () => { resolve() }, (event) => {
            p.progress = Math.max(p.progress + 10, 75)
          })
        })
      }).catch((reason) => { console.log(reason) }) */
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
      container.attach({stream: true, stdout: true, stderr: true}, (err, s) => {
        s.pipe(process.stdout)
        if (err)
          console.log(err)
      })
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

</style>
