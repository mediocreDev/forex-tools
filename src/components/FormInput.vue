<template>
  <div class="form-control w-full">
    <label class="label">
      <span class="label-text font-semibold">{{ label }}</span>
    </label>
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      :type="type"
      :placeholder="placeholder"
      :step="step"
      :class="['input input-bordered w-full', { 'input-error': hasError }, inputClass]"
    />
    <label v-if="errorMessage && hasError" class="label">
      <span class="label-text-alt flex items-center text-error">
        <AlertTriangleIcon class="mr-1 h-4 w-4" />
        {{ errorMessage }}
      </span>
    </label>
  </div>
</template>

<script setup>
  import { AlertTriangleIcon } from "lucide-vue-next"

  defineProps({
    label: String,
    modelValue: [String, Number],
    type: {
      type: String,
      default: "text",
    },
    placeholder: String,
    step: String,
    inputClass: {
      type: String,
      default: "",
    },
    hasError: {
      type: Boolean,
      default: false,
    },
    errorMessage: String,
  })

  defineEmits(["update:modelValue"])
</script>
