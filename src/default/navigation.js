// Navigation configuration
export const NAVIGATION_ITEMS = [
  {
    path: "/position-calculator",
    name: "PositionCalculator",
    label: "Position Calculator",
    icon: "CalculatorIcon",
    description: "Calculate optimal position sizes with risk management",
    category: "calculators",
  },
  {
    path: "/pip-calculator",
    name: "PipCalculator",
    label: "Pip Calculator",
    icon: "TrendingUpIcon",
    description: "Calculate pip values for currency pairs",
    category: "calculators",
  },
]

// Theme configuration with valid Lucide icons
export const THEME_OPTIONS = [
  { value: "valentine", label: "Valentine", icon: "HeartIcon" },
  { value: "cyberpunk", label: "Cyberpunk", icon: "CpuIcon" },
  { value: "wireframe", label: "Wireframe", icon: "FrameIcon" },
  { value: "dracula", label: "Dracula", icon: "BatIcon" },
  { value: "luxury", label: "Luxury", icon: "CrownIcon" },
  { value: "coffee", label: "Coffee", icon: "CoffeeIcon" },
]

// Brand configuration
export const BRAND_CONFIG = {
  name: "Forex Tools",
  logo: "CalculatorIcon",
  tagline: "Professional Trading Calculators",
  description: "Advanced forex position size and pip value calculators with comprehensive risk management tools",
}

// Social links (for footer)
export const SOCIAL_LINKS = [
  {
    name: "Twitter",
    url: "https://twitter.com/forextools",
    icon: "TwitterIcon",
  },
  {
    name: "GitHub",
    url: "https://github.com/forextools",
    icon: "GithubIcon",
  },
  {
    name: "LinkedIn",
    url: "https://linkedin.com/company/forextools",
    icon: "LinkedinIcon",
  },
]

// Footer links
export const FOOTER_LINKS = [
  {
    category: "Babypips Resources",
    links: [
      { label: "Economic Calendar", path: "https://www.babypips.com/economic-calendar" },
      { label: "Forex Market Hours", path: "https://www.babypips.com/economic-calendar" },
      { label: "Risk-On/Off Meter", path: "https://www.babypips.com/tools/risk-on-risk-off-meter" },
      { label: "Currency Correlation", path: "https://www.babypips.com/economic-calendar" },
      { label: "Gain%/Loss% Calculator", path: "https://www.babypips.com/tools/gain-loss-percentage-calculator" },
    ],
  },
  {
    category: "Other Resources",
    links: [
      { label: "World Time", path: "https://www.worldtimebuddy.com/?pl=1&lid=2147714,1850147,1581130,2643743,5128581&h=1581130&hf=1" },
      { label: "ForexFactory Calendar", path: "https://www.forexfactory.com/calendar" },
      { label: "Risk-On/Off Meter", path: "https://www.babypips.com/tools/risk-on-risk-off-meter" },
      { label: "Currency Correlation", path: "https://www.babypips.com/economic-calendar" },
      { label: "Gain%/Loss% Calculator", path: "https://www.babypips.com/tools/gain-loss-percentage-calculator" },
    ],
  },
  {
    category: "Support",
    links: [
      { label: "Help Center", path: "/help" },
      { label: "Contact Us", path: "/contact" },
      { label: "API Documentation", path: "/api-docs" },
    ],
  },
  {
    category: "Support",
    links: [
      { label: "Help Center", path: "/help" },
      { label: "Contact Us", path: "/contact" },
      { label: "API Documentation", path: "/api-docs" },
    ],
  },
]
