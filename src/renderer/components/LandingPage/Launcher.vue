<template>
  <div>
    <nav class="panel">
    <p class="panel-heading">
        Launcher
    </p>
    <div class="panel-block">
        <p class="control has-icons-left">
        <input class="input is-small" type="text" placeholder="search">
        <span class="icon is-small is-left">
            <i class="fa fa-search"></i>
        </span>
        </p>
    </div>
        <template v-for="(process, index) in processes">
          <a :id="index" class="columns panel-block is-marginless" :class="process.status" @click="startProcess(index)">
            <div class="column is-one-quarter">
            <span class="panel-icon">
              <i class="fa" :class="{ 'fa-ban': process.status == status.DISABLED, 'fa-server': process.status != status.DISABLED }"></i>
            </span>
              {{process.name}}
            </div>
            <div class="column">
              <template v-if="process.status == status.LOADING">
                <progress class="progress notification is-warning" :value="process.progress" max="100">{{process.progress}}%</progress>
              </template>
              <template v-if="process.status == status.RUNNING">
                <progress class="progress notification is-primary" :value="process.progress" max="100">{{process.progress}}%</progress>
              </template>
            </div>
          </a>
        </template>
    </nav>
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
      if (p.status === status.LOADING)
        return
      p.progress = 25
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
          p.progress = 100
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

      /* I get a hang on this..
      await new Promise((resolve, reject) => {
        this.$docker.pull(pconfig.image, (err, stream) => {
          if (err)
            reject(err)
          this.$docker.modem.followProgress(stream, () => { resolve() }, (event) => {
            p.progress = Math.max(p.progress + 10, 75)
          })
        })
      }).catch((reason) => { console.log(reason) }) */
      p.progress = 75
      const opts = dconfig.create_options
      opts.Image = pconfig.image
      opts.Cmd = pconfig.cmd
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
      p.progress = 100
      p.status = status.RUNNING
      await container.start()
      await container.stop()
      await container.remove()
      p.container_id = null
      p.container_ip = null
    }
  }
}
</script>

<style lang="scss">

  .panel-icon {
    vertical-align:baseline;
  }

  .panel-block.disabled {
    background-color: lightgray;
    &:hover {
      background-color: lightgray;
      color: inherit;
      cursor: default;
    }
  }

  .panel-block.loading, .panel-block.running {
    &:hover {
      background-color: initial;
      color: initial;
      cursor: default;
    }
  }

  .panel-block.disabled  .panel-icon {
    color: red;
  }

  .panel-block.loading  .panel-icon {
    color: $warning;
  }

  .panel-block.running  .panel-icon {
    color: $primary;
  }
</style>
