<template>
  <div>
    <div class="container is-fluid">
      <section class="hero">
        <div class="hero-body">
          <div class="container">
            <h1 class="title notification is-info">
              AR Table Dashboard
            </h1>
            <h2 class="subtitle notification">
              Augmented reality table command & control center
            </h2>
          </div>
        </div>
      </section>
    </div>
    <section>
      <div class="container is-fluid">
        <div class="tile is-ancestor">
          <div class="tile is-4 is-parent is-vertical">
            <article class="is-child tile box notification is-outlined">
              <p class="title">Start-up </p>
              <div>
                <startup></startup>
              </div>
            </article>
                <div class="is-child tile box">
              <ZMQStatus> </ZMQStatus>
            </div>
          </div>
          <div class="tile is-8 is-parent">
            <div class="is-child tile box">
              <launcher></launcher>
            </div>
          </div>
        </div>
        <div class="tile is-ancestor">
          <div class="tile is-4 is-parent">
            <div class="is-child tile box">
              <MJPGStream process="p1" port="simulation"> </MJPGStream>
            </div>
          </div>
          <div class="tile is-4 is-parent">
            <article class="is-child tile box notification is-outlined">
              <MJPGStream process="p5" port="video"> </MJPGStream>
            </article>

          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
  import Launcher from './ProcessManagement/Launcher'
  import Startup from './ProcessManagement/Startup'
  import MJPGStream from './Analysis/MJPGStream'
  import ZMQStatus from './ProcessManagement/ZMQStatus'

export default {
    name: 'landing-page',
    components: { Launcher, Startup, ZMQStatus, MJPGStream },
    methods: {
      open (link) {
        this.$electron.shell.openExternal(link)
      }
    }
  }
</script>
