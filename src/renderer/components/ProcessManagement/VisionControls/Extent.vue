  <template>
  <div class="">
    <h1 class="subtitle"> Extent Mode </h1>
    <div class="field is-grouped">
      <div class="control">
        <button class="button" @click="set()"> Set </button>
      </div>
      <div class="control">
        <button class="button" @click="reset()"> Reset </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'extent',
  props: ['settings', 'sendSettings'],
  methods: {
    set: function () {
      this.$emit('update:settings', {...this.settings, action: 'set_extent'})
      this.sendSettings()
    },
    reset: function () {
      this.$emit('update:settings', {...this.settings, action: 'reset_extent'})
      this.sendSettings()
    }
  }
}
</script>
