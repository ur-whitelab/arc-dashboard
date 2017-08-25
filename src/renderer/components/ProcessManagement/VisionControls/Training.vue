<template>
  <div class="">
    <h1 class="subtitle"> Training Mode </h1>
    <div class="field has-addons">
      <div class="control">
        <input class="input" type="text" placeholder="Image Name/Label" v-model="label"></input>
      </div>
      <div class="control">
        <button class="button" :disabled="!settings.pause" @click="mySettings.action = 'label'"> Label </button>
      </div>
    </div>
    <div class="field">
      <label class="label">Polygon</label>
      <div class="control">
        <input class="input" type="number" min="1" :max="settings.training_poly_len" v-model="trainingPolyIndex">
      </div>
    </div>
    <div class="field">
      <label class="label">Rectangle</label>
      <div class="control">
        <input class="input" type="number" min="1" :max="settings.training_rect_len" v-model="trainingRectIndex">
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'training',
  props: ['settings'],
  data () {
    return {
      collecting: false,
      mySettings: {action: '', training_poly_index: 0, training_rect_index: 0, training_label: ''},
      label: '',
      trainingPolyIndex: 1,
      trainingRectIndex: 1
    }
  },
  watch: {
    mySettings: {
      handler: function () {
        this.$emit('update:settings', {...this.settings, ...this.mySettings})
      },
      deep: true
    },
    trainingPolyIndex: function () {
      this.mySettings.training_poly_index = this.trainingPolyIndex - 1
    },
    trainingRectIndex: function () {
      this.mySettings.training_rect_index = this.trainingRectIndex - 1
    }
  }
}
</script>
