  <template>
  <div>
    <table class="table is-bordered is-striped is-narrow is-fullwidth">
      <thead>
        <tr>
          <th>Name</th>
          <th>Status </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="i in processIds">
          <tr :class="{'is-selected': processes[i].status==status.RUNNING}">
            <td> {{processes[i].name}}</td>
            <td> {{processes[i].status}}</td>
          </tr>
        </template>
      </tbody>
    </table>
    <button class="button" :disabled="!anyReady" @click="startall()"> Start All </button>
    <button class="button" :disabled="!anyRunning" @click="stopall()"> Stop All </button>
  </div>
</template>

<script>
import status from '../../constants'
import { mapState, mapActions } from 'vuex'

export default {
  name: 'startup',
  data () {
    return {
      status: status,
      startup: [],
      processIds: []
    }
  },
  computed: {
    ...mapState({
      processes: state => state.processes.processes
    }),
    anyReady: function () {
      for (const id of this.processIds) {
        // are these processes loaded?
        if (!(id in this.processes))
          return false
        if (this.processes[id].status === status.READY)
          return true
      }
      return false
    },
    anyRunning: function () {
      for (const id of this.processIds) {
        // are these processes loaded?
        if (!(id in this.processes))
          return false
        if (this.processes[id].status === status.RUNNING)
          return true
      }
      return false
    }
  },
  mounted: async function () {
    // load our processes from db
    this.$db.findOne({ _id: 'startup' }, (err, doc) => {
      if (!err) {
        this.startup = doc
        for (const id of this.startup.steps) {
          this.$db.findOne({ _id: id }, (err, doc) => {
            if (!err)
              this.processIds.push(doc._id)
          })
        }
      }
    })
  },
  methods: {
    ...mapActions([
      'startProcess',
      'stopProcess'
    ]),

    startall: function () {
      for (const id of this.processIds)
        setTimeout(() => { this.startProcess(id) })
    },

    stopall: async function () {
      for (const id of this.processIds)
        await this.stopProcess(id)
    }
  }
}
</script>

<style lang="scss">
.table tr td:last-child {
  text-align: right !important;
}

.table tr th:last-child {
  text-align: right !important;
}
</style>
