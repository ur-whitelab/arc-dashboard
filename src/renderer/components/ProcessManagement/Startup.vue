<template>
  <table class="table is-bordered is-striped is-narrow is-fullwidth">
    <thead>
      <tr>
        <th>Processes</th>
        <th>Status </th>
      </tr>
    </thead>
    <tbody>
      <template v-for="p in processes">
        <tr>
          <td> {{p.status}}</td>
          <td> {{p.status}}</td>
        </tr>
      </template>
    </tbody>
  </table>
</template>

<script>
import status from '../../constants'
import _ from 'lodash'

export default {
  name: 'startup',
  data () {
    return {
      status: status,
      startup: [],
      processes: []
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
              this.processes.push(doc)
          })
        }
      }
    })

    // now set-up our listeners
    this.$bus.$on('process-status', (otherP) => {
      const i = _.findIndex(this.processes, { '_id': otherP.id })
      // copy whole object to trigger reactive data
      this.processes[i] = otherP
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
