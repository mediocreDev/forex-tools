import { createApp } from "vue"
import App from "./App.vue"
import router from "./router/index.js"
import "./assets/styles/main.css"

// Create and mount app
const app = createApp(App)
app.use(router)
app.mount("#app")
