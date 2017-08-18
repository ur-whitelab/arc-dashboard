import Docker from 'dockerode'

// load platform specific docker
const isWin = process.platform === 'win32'
let docker = null
if (isWin)
  docker = new Docker({ socketPath: '//./pipe/docker_engine' })
else
  docker = new Docker({ socketPath: '/var/run/docker.sock' })

export default docker
