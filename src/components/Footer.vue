<template>
  <footer class="footer footer-center rounded bg-base-200 p-10 text-base-content">
    <!-- Navigation links -->
    <nav class="grid grid-flow-col gap-4">
      <router-link
        v-for="item in navigationItems"
        :key="item.path"
        :to="item.path"
        class="link-hover link flex items-center gap-1"
      >
        <component :is="getIconComponent(item.icon)" class="h-4 w-4" />
        {{ item.label }}
      </router-link>
    </nav>

    <!-- Footer link categories -->
    <div class="grid w-full max-w-4xl grid-cols-1 place-items-start gap-8 md:grid-cols-4">
      <div v-for="category in footerLinks" :key="category.category" class="text-center">
        <h3 class="mb-3 font-semibold text-base-content">{{ category.category }}</h3>
        <nav class="flex flex-col items-center gap-2">
          <component
            v-for="link in category.links"
            :key="link.path"
            :is="isRouterLink(link.path) ? 'router-link' : 'a'"
            :to="isRouterLink(link.path) ? link.path : undefined"
            :href="isRouterLink(link.path) ? undefined : link.path"
            :target="isRouterLink(link.path) ? undefined : '_blank'"
            :rel="isRouterLink(link.path) ? undefined : 'noopener noreferrer'"
            class="link-hover link flex items-center gap-1"
          >
            {{ link.label }}
          </component>
        </nav>
      </div>
    </div>

    <!-- Social links -->
    <nav>
      <div class="grid grid-flow-col gap-4">
        <a
          v-for="social in socialLinks"
          :key="social.name"
          :href="social.url"
          :title="social.name"
          class="link-hover link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <component :is="getIconComponent(social.icon)" class="h-6 w-6" />
        </a>
      </div>
    </nav>

    <!-- Copyright -->
    <aside>
      <p>Copyright &copy; {{ currentYear }} - {{ brandConfig.name }}. Americio&trade;</p>
      <p class="mt-1 text-sm opacity-70">
        {{ brandConfig.description }}
      </p>
    </aside>
  </footer>
</template>

<script setup>
  import { computed } from "vue"
  import {
    CalculatorIcon,
    TrendingUpIcon,
    TwitterIcon,
    GithubIcon,
    LinkedinIcon,
  } from "lucide-vue-next"
  import {
    NAVIGATION_ITEMS,
    SOCIAL_LINKS,
    FOOTER_LINKS,
    BRAND_CONFIG,
  } from "../default/navigation.js"

  const currentYear = computed(() => new Date().getFullYear())

  // Configuration from constants
  const navigationItems = NAVIGATION_ITEMS
  const socialLinks = SOCIAL_LINKS
  const footerLinks = FOOTER_LINKS
  const brandConfig = BRAND_CONFIG

  // Icon component mapping - only valid Lucide icons
  const iconComponents = {
    CalculatorIcon,
    TrendingUpIcon,
    TwitterIcon,
    GithubIcon,
    LinkedinIcon,
  }

  // Get icon component by name
  const getIconComponent = iconName => {
    return iconComponents[iconName] || CalculatorIcon
  }

  // Utility function to check if a link is internal (router) or external
  const isRouterLink = url => {
    if (!url) return true
    return !/^(https?:\/\/|mailto:|tel:)/i.test(url)
  }
</script>
