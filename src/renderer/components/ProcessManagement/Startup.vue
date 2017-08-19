  <template>
  <table class="table is-bordered is-striped is-narrow is-fullwidth">
    <thead>
      <tr>
        <th>Name</th>
        <th>Status </th>
      </tr>
    </thead>
    <tbody>
      <template v-for="i in processIds">
        <tr>
          <td> {{processes[i].name}}</td>
          <td> {{processes[i].status}}</td>
        </tr>
      </template>
    </tbody>
  </table>
</template>

<script>
import status from '../../constants'
import { mapState } from 'vuex'

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
    })
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
