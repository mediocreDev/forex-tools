<template>
  <router-link
    :to="to"
    :class="[
      'flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
      active
        ? 'bg-primary-100 text-primary-700 shadow-sm'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
    ]"
  >
    <slot />
  </router-link>
</template>

<script setup>
  defineProps({
    to: {
      type: String,
      required: true,
    },
    active: {
      type: Boolean,
      default: false,
    },
  })
</script>
