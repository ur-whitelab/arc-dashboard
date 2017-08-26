<template>
  <div class="">
    <h1 class="subtitle"> Background Mode </h1>
    <div class="field is-grouped">
      <div class="control">
        <button class="button" :disabled="!collecting" @click="collecting = false"> Save </button>
      </div>
      <div class="control">
        <button class="button" :disabled="collecting" @click="collecting = true"> Collect </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'background',
  props: ['settings', 'remoteSettings'],
  data () {
    return {
      collecting: false
    }
  },
  watch: {
    collecting: function (newV) {
      if (newV)
        this.$emit('update:settings', {...this.settings, action: 'start_background'})
      else
        this.$emit('update:settings', {...this.settings, action: 'complete_background'})
    }
  }
}
</script>
