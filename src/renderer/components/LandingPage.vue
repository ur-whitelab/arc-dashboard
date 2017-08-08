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
              <p> Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin ornare magna eros, eu pellentesque tortor vestibulum ut. Maecenas non massa sem. Etiam finibus odio quis feugiat facilisis.
              </p>
            </article>
            <article class="is-child tile box notification is-outlined">
              <p class="title"> Camera View </p>
                <camera> </camera>
            </article>
          </div>
           <div class="tile is-8 is-parent">
            <div class="is-child tile box">
              <launcher></launcher>
            </div>
          </div>
        </div>
        <div class="tile is-ancestor">
           <div class="tile is-5 is-parent">
            <div class="is-child tile box">
              <SVG src='http://172.17.0.2/analysis/test.svg'></SVG>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
  import Launcher from './LandingPage/Launcher'
  import Camera from './Analysis/Camera'

export default {
    name: 'landing-page',
    components: { Launcher, Camera },
    methods: {
      open (link) {
        this.$electron.shell.openExternal(link)
      }
    }
  }
</script>
