<template>
  <div class="form-control w-full">
    <label class="label">
      <span class="label-text font-semibold">
        {{ label }}
        <span v-if="required" class="text-error">*</span>
      </span>
    </label>
    <input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" :type="type"
      :placeholder="placeholder" :step="step" :min="min" :max="max" :required="required" :class="[
        'input input-bordered w-full',
        { 'input-error': hasError },
        { 'input-success': !hasError && modelValue && required },
        inputClass
      ]" />
    <label v-if="errorMessage && hasError" class="label">
      <span class="label-text-alt text-error flex items-center">
        <AlertTriangleIcon class="w-4 h-4 mr-1" />
        {{ errorMessage }}
      </span>
    </label>
    <label v-else-if="helpText" class="label">
      <span class="label-text-alt text-base-content/60">
        {{ helpText }}
      </span>
    </label>
  </div>
</template>

<script setup>
import { AlertTriangleIcon } from 'lucide-vue-next'

defineProps({
  label: String,
  modelValue: [String, Number],
  type: {
    type: String,
    default: 'text'
  },
  placeholder: String,
  step: String,
  min: [String, Number],
  max: [String, Number],
  required: {
    type: Boolean,
    default: false
  },
  inputClass: {
    type: String,
    default: ''
  },
  hasError: {
    type: Boolean,
    default: false
  },
  errorMessage: String,
  helpText: String
})

defineEmits(['update:modelValue'])
</script>
