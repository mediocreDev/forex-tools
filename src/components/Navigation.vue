<template>
  <div class="navbar bg-base-100 shadow-lg">
    <div class="navbar-start">
      <!-- Mobile menu dropdown -->
      <div class="dropdown">
        <div tabindex="0" role="button" class="btn btn-ghost lg:hidden" @click="toggleMobileMenu">
          <MenuIcon class="h-5 w-5" />
        </div>
        <ul
          v-show="isMobileMenuOpen"
          tabindex="0"
          class="menu dropdown-content menu-sm z-[1] mt-3 w-52 rounded-box bg-base-100 p-2 shadow"
          @click="closeMobileMenu"
        >
          <li v-for="item in navigationItems" :key="item.path">
            <router-link
              :to="item.path"
              :class="isActiveRoute(item.path) ? 'active' : ''"
              class="flex items-center gap-2"
            >
              <component :is="getIconComponent(item.icon)" class="h-4 w-4" />
              {{ item.label }}
            </router-link>
          </li>
        </ul>
      </div>

      <!-- Brand/Logo -->
      <router-link to="/" class="btn btn-ghost text-xl">
        <component :is="getIconComponent(brandConfig.logo)" class="mr-2 h-6 w-6" />
        {{ brandConfig.name }}
      </router-link>
    </div>

    <!-- Desktop navigation -->
    <div class="navbar-center hidden lg:flex">
      <ul class="menu menu-horizontal px-1">
        <li v-for="item in navigationItems" :key="item.path">
          <router-link
            :to="item.path"
            :class="isActiveRoute(item.path) ? 'active' : ''"
            class="flex items-center gap-2"
            :title="item.description"
          >
            <component :is="getIconComponent(item.icon)" class="h-4 w-4" />
            {{ item.label }}
          </router-link>
        </li>
      </ul>
    </div>

    <!-- Theme selector -->
    <div class="navbar-end">
      <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="btn btn-ghost" title="Change Theme">
          <PaletteIcon class="h-5 w-5" />
        </div>
        <ul
          tabindex="0"
          class="menu dropdown-content z-[1] max-h-96 w-52 overflow-y-auto rounded-box bg-base-100 p-2 shadow"
        >
          <li v-for="theme in themeOptions" :key="theme.value">
            <a
              @click="setTheme(theme.value)"
              :class="currentTheme === theme.value ? 'active' : ''"
              class="flex items-center gap-2"
            >
              <component :is="getIconComponent(theme.icon)" class="h-4 w-4" />
              {{ theme.label }}
            </a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue"
  import { useRoute } from "vue-router"
  import { NAVIGATION_ITEMS, THEME_OPTIONS, BRAND_CONFIG } from "../default/navigation.js"
  import {
    CalculatorIcon,
    TrendingUpIcon,
    MenuIcon,
    PaletteIcon,
    SunIcon,
    MoonIcon,
    BuildingIcon,
    ZapIcon,
    CpuIcon,
    RadioIcon,
    HeartIcon,
    TreePineIcon,
    WavesIcon,
    MusicIcon,
    WandIcon,
    FrameIcon,
    CircleIcon,
    CrownIcon,
    PrinterIcon,
    BriefcaseIcon,
    FlaskConicalIcon, // Changed from FlaskIcon
    GlassWaterIcon,
    CoffeeIcon,
    SnowflakeIcon,
    FlowerIcon,
    GhostIcon,
    LeafIcon,
    MoonStarIcon,
  } from "lucide-vue-next"

  const route = useRoute()
  const isMobileMenuOpen = ref(false)
  const currentTheme = ref("light")

  // Configuration from constants
  const navigationItems = NAVIGATION_ITEMS
  const themeOptions = THEME_OPTIONS
  const brandConfig = BRAND_CONFIG

  // Icon component mapping - only valid Lucide icons
  const iconComponents = {
    CalculatorIcon,
    TrendingUpIcon,
    MenuIcon,
    PaletteIcon,
    SunIcon,
    MoonIcon,
    BuildingIcon,
    ZapIcon,
    CpuIcon,
    RadioIcon,
    HeartIcon,
    TreePineIcon,
    WavesIcon,
    MusicIcon,
    WandIcon,
    FrameIcon,
    CircleIcon,
    CrownIcon,
    PrinterIcon,
    BriefcaseIcon,
    FlaskConicalIcon, // Changed from FlaskIcon
    GlassWaterIcon,
    CoffeeIcon,
    SnowflakeIcon,
    FlowerIcon,
    GhostIcon,
    LeafIcon,
    MoonStarIcon,
    // Add fallback icon for missing ones
    CakeIcon: HeartIcon, // Fallback for CakeIcon
  }

  // Get icon component by name
  const getIconComponent = iconName => {
    return iconComponents[iconName] || CalculatorIcon
  }

  // Check if route is active
  const isActiveRoute = path => {
    return route.path === path
  }

  // Mobile menu controls
  const toggleMobileMenu = () => {
    isMobileMenuOpen.value = !isMobileMenuOpen.value
  }

  const closeMobileMenu = () => {
    isMobileMenuOpen.value = false
  }

  // Theme management
  const setTheme = theme => {
    currentTheme.value = theme
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("theme", theme)
  }

  // Initialize theme on mount
  onMounted(() => {
    const savedTheme = localStorage.getItem("theme") || "light"
    setTheme(savedTheme)

    // Close mobile menu when clicking outside
    const handleClickOutside = event => {
      if (!event.target.closest(".dropdown")) {
        isMobileMenuOpen.value = false
      }
    }

    document.addEventListener("click", handleClickOutside)

    // Cleanup on unmount
    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  })
</script>

<style scoped>
  /* Custom styles for active navigation items */
  .menu li > .active {
    @apply bg-primary text-primary-content;
  }

  /* Smooth transitions */
  .dropdown-content {
    transition: all 0.2s ease-in-out;
  }

  /* Mobile menu animation */
  .menu-sm {
    animation: slideDown 0.2s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
