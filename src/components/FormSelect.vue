<template>
  <div class="form-control w-full">
    <label class="label">
      <span class="label-text font-semibold">{{ label }}</span>
    </label>
    <select
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
      class="select select-bordered w-full"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<script setup>
  defineProps({
    label: String,
    modelValue: [String, Number],
    options: Array,
  })

  defineEmits(["update:modelValue"])
</script>
