<template>
  <div class="form-control w-full">
    <label class="label">
      <span class="label-text font-semibold">
        {{ label }}
        <span v-if="required" class="text-error">*</span>
      </span>
    </label>
    <select 
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
      :required="required"
      :class="[
        'select select-bordered w-full',
        { 'select-error': hasError },
        { 'select-success': !hasError && modelValue && required }
      ]"
    >
      <option value="" disabled>{{ placeholder || 'Select an option...' }}</option>
      <option 
        v-for="option in options" 
        :key="option.value" 
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
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
  options: Array,
  required: {
    type: Boolean,
    default: false
  },
  placeholder: String,
  hasError: {
    type: Boolean,
    default: false
  },
  errorMessage: String,
  helpText: String
})

defineEmits(['update:modelValue'])
</script>