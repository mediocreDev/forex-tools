import { createRouter, createWebHistory } from "vue-router"

// Import page components
const PositionCalculator = () => import("../pages/PositionCalculator.vue")
const PipCalculator = () => import("../pages/PipCalculator.vue")

// Define routes
const routes = [
  {
    path: "/",
    redirect: "/position-calculator",
  },
  {
    path: "/position-calculator",
    name: "PositionCalculator",
    component: PositionCalculator,
    meta: {
      title: "Position Size Calculator",
      description: "Calculate optimal forex position sizes with risk management",
      icon: "CalculatorIcon",
    },
  },
  {
    path: "/pip-calculator",
    name: "PipCalculator",
    component: PipCalculator,
    meta: {
      title: "Pip Value Calculator",
      description: "Calculate pip values for different currency pairs",
      icon: "TrendingUpIcon",
    },
  },
  // Catch-all route for 404 pages
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    redirect: "/position-calculator",
  },
]

// Create router instance
const router = createRouter({
  history: createWebHistory(),
  routes,
  // Scroll behavior for better UX
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  },
})

// Navigation guards
router.beforeEach((to, from, next) => {
  // Set document title based on route meta
  if (to.meta.title) {
    document.title = `${to.meta.title} - Forex Trading Tools`
  } else {
    document.title = "Forex Trading Tools"
  }

  next()
})

export default router
