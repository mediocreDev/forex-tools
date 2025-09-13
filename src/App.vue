<template>
  <div class="min-h-screen bg-base-200">
    <Navigation />
    <main>
      <router-view />
    </main>
    <Footer />
  </div>
</template>

<script setup>
  import Navigation from "./components/Navigation.vue"
  import Footer from "./components/Footer.vue"
</script>
