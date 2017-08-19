import kill from 'tree-kill'
import merge from 'merge-stream'
import _ from 'lodash'
import Vue from 'vue'

import * as types from '../mutation-types'
import status from '../../constants'
import db from '../../../db/datastore'
import docker from '../../docker'

import log from 'electron-log'
import { exec } from 'child_process'
import {ipcRenderer} from 'electron'

async function startExeProcess (p, updateStatus, addInstance) {
  // build command string
  let cmd = [p.cmd]
  for (const key in p.args) {
    const a = p.args[key]
    cmd.push(a.flag)
    if ('value' in a)
      cmd.push(a.value)
    else
      cmd.push(a.default)
  }

  // trim
  cmd = _.filter(cmd, (o) => { return o.length > 0 })

  updateStatus(status.LOADING)
  log.info('Spawning with ' + cmd.join(' '))
  const ps = exec(cmd.join(' '))

  const instId = ps.pid
  addInstance(instId, {stream: merge(ps.stdout, ps.stderr)})
  try {
    await new Promise((resolve, reject) => {
      ps.on('close', (code) => {
        if (code !== 0) {
          log.warn()
          reject(Error(cmd + ' ended with code ' + code))
        }
        resolve()
      })
      ps.on('error', (err) => {
        reject(err)
      })
      ps.stdout.on('data', () => {
        updateStatus(status.RUNNING)
      })
      ps.stderr.on('data', () => {
        updateStatus(status.RUNNING)
      })
    })
  } catch (err) {
    throw err
  } finally {
    updateStatus(status.READY)
  }
}

async function startDockerProcess (p, updateStatus, addInstance) {
  // load what's in our DB and turn it into a docker run command
  // default
  const dconfig = (await db.findPromise({ _id: 'cdocker' }))[0]
  // process specific
  const pconfig = (await db.findPromise({ _id: p.docker_id }))[0]
  // process specific
  const network = (await db.findPromise({ _id: 'cnetwork' }))[0]

  const opts = dconfig.create_options
  opts.Image = pconfig.image
  opts.Cmd = pconfig.cmd
  const binds = []
  // need to replace process paths in binds, which may be relative

  opts.Hostconfig = { 'Binds': binds }
  opts.ExposedPorts = {}
  opts.ExposedPorts[network.ports.zmq + '/tcp'] = {}
  log.info('Creating container with ' + JSON.stringify(opts))
  const container = await docker.createContainer(opts)

  // add this container to the list of instances
  const instId = container.id
  // get the stream we can read from
  const stream = await container.attach({ stream: true, stdout: true, stderr: true })

  updateStatus(status.RUNNING)
  await container.start()
  container.inspect((e, d) => {
    if (e)
      throw e
    addInstance(instId, {stream: stream, docker_ip: d.NetworkSettings.IPAddress})
    log.info(`Container ${instId} has IP ${d.NetworkSettings.IPAddress}`)
  })
  await container.wait()
  await container.remove()
  updateStatus(status.READY)
}

const state = {
  processes: {},
  instances: {}
}

const volatile = {
  streams: {}
}

const getters = {
  processIdList: state => {
    return _.map(state.processes, 'id')
  },
  processFromIndex: (state, getters) => (i) => {
    return state.processes[getters.processIdList[i]]
  },
  processFromId: (state, getters) => (id) => {
    return state.processes[id]
  },
  processesLength: state => {
    return _.size(state.processes)
  },
  streamFromPid: (state, getters) => (pid) => {
    return volatile.streams[pid]
  },
  processesList: state => {
    return _.values(state.processes)
  }
}

const actions = {
  async startProcess ({ commit, state }, id) {
    // find the process by id
    const p = state.processes[id]

    if (!p || p.status !== status.READY) {
      log.warn(id + ' was requested to start, but is not ready or invalid id')
      return
    }

    // set to loading status
    commit(types.PROCESS_STATUS, { id: id, status: status.LOADING })

    // dispatch to exe or docker
    if (p.docker_id !== null) {
      await startDockerProcess(p, (s) => {
        commit(types.PROCESS_STATUS, { id: id, status: s })
      }, (pid, instance) => {
        // use the spread syntax to ensure we get a pid, but can have other properties
        commit(types.PROCESS_INSTANCE_PUSH, { id: id, instance: { ...instance, pid: pid } })
      })
    } else {
      await startExeProcess(p, (s) => {
        commit(types.PROCESS_STATUS, { id: id, status: s })
      }, (pid, instance) => {
        commit(types.PROCESS_INSTANCE_PUSH, { id: id, instance: { ...instance, pid: pid } })
      })
    }
  },
  async stopProcess ({ commit, state }, id) {
    // find the process by id
    const p = state.processes[id]
    if (!p || p.status !== status.RUNNING) {
      log.warn(id + ' was requested to kill, but is not running or invalid id')
      return
    }

    // set to loading status
    commit(types.PROCESS_STATUS, { id: id, status: status.LOADING })

    // get out latest instance
    const inst = _.last(state.instances[id])

    if (p.docker_id !== null) {
      // stop container
      await docker.getContainer(inst.pid).stop()
    } else
      await kill(inst.pid)

    // now actually remove that instance
    commit(types.PROCESS_INSTANCE_POP, {id: id})
    commit(types.PROCESS_STATUS, { id: id, status: status.READY })
  },
  updateArgument ({commit}, payload) {
    commit(types.PROCESS_CMD_UPDATE, payload)
  }
}

const mutations = {
  // this will update a process status
  [types.PROCESS_STATUS] (state, {id, status}) {
    // find the process by id
    state.processes[id].status = status
    ipcRenderer.send('process-status', state.processes[id])
  },

  // this will add an instance record
  [types.PROCESS_INSTANCE_PUSH] (state, {instance, id}) {
    // extract stream
    let {stream, ...rest} = instance
    state.instances[id].push(rest)
    // put stream in volatile so changes don't trigger watchers
    volatile.streams[rest.pid] = stream
  },

  [types.PROCESS_INSTANCE_POP] (state, {id}) {
    state.instances[id].pop()
  },

  [types.PROCESS_INSERT] (state, process) {
    const id = process._id
    Vue.set(state.processes, id, process)
    process.id = id
    Vue.set(state.instances, id, [])
  },

  [types.PROCESS_CMD_UPDATE] (state, {id, key, value}) {
    const c = state.processes[id].args[key]
    Vue.set(c, 'value', value)
  }
}

export default {
  state,
  getters,
  actions,
  mutations,
  volatile
}
