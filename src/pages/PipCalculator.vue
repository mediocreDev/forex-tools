<template>
  <div class="min-h-screen bg-base-200 px-4 py-8">
    <div class="mx-auto max-w-6xl">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h1 class="card-title mb-8 justify-center text-3xl font-bold">
            <TrendingUpIcon class="mr-2 h-8 w-8" />
            Pip Value Calculator
          </h1>

          <div class="grid gap-8 lg:grid-cols-2">
            <!-- Input Section -->
            <div class="space-y-6">
              <FormSelect
                label="Currency Pair"
                v-model="formData.currencyPair"
                :options="CURRENCY_PAIR_OPTIONS"
              />

              <FormInput
                label="Standard Lot(s)"
                v-model.number="formData.standardLotSize"
                type="number"
                step="0.01"
              />

              <FormSelect
                label="Account Currency"
                v-model="formData.accountCurrency"
                :options="CURRENCY_OPTIONS"
              />

              <button
                @click="handleCalculate"
                class="btn btn-success btn-lg w-full"
                :disabled="isLoading"
              >
                <span v-if="isLoading" class="loading loading-spinner loading-sm"></span>
                <CalculatorIcon v-else class="mr-2 h-5 w-5" />
                {{ isLoading ? "Calculating..." : "Calculate Pip Value" }}
              </button>
            </div>

            <!-- Results Section -->
            <div v-if="hasCalculated" class="card bg-base-200">
              <div class="card-body">
                <div class="mb-3 flex items-center">
                  <h2 class="card-title text-xl">Results</h2>
                </div>

                <!-- Error Display -->
                <div v-if="error" class="alert alert-error mb-4">
                  <AlertTriangleIcon class="h-5 w-5" />
                  <span>{{ error }}</span>
                </div>

                <div v-else class="space-y-6">
                  <!-- Pip Value Result -->
                  <div class="stat">
                    <div class="stat-title">Pip Value</div>
                    <div class="stat-value text-4xl text-primary">
                      {{
                        formatCurrency(
                          calculatedResults.results.pipValue,
                          formData.accountCurrency,
                          2,
                        )
                      }}
                    </div>
                    <div class="stat-desc">{{ formData.accountCurrency }}</div>
                  </div>

                  <!-- Exchange Rate Info -->
                  <div
                    class="alert alert-info cursor-pointer transition-opacity hover:opacity-80 active:opacity-60"
                    @click="openChart(calculatedResults.exchangeRateInfo.pair)"
                    title="Open TradingView chart"
                  >
                    <InfoIcon class="h-4 w-4" />
                    <div class="flex-1 text-xs">
                      <div class="flex items-center justify-between">
                        <div>
                          <span class="text-lg">{{
                            `${calculatedResults.formSnapshot.currencyPair}: `
                          }}</span>
                          <strong class="text-2xl text-primary-content">
                            {{
                              formatNumber(
                                calculatedResults.exchangeRateInfo.currentRate,
                                calculatedResults.formSnapshot.currencyPair.includes("JPY") ||
                                  calculatedResults.formSnapshot.currencyPair.includes("XAU") ||
                                  calculatedResults.formSnapshot.currencyPair.includes("USOIL")
                                  ? 3
                                  : calculatedResults.formSnapshot.currencyPair.includes("BTC")
                                    ? 2
                                    : 5,
                              )
                            }}
                          </strong>
                        </div>
                        <div class="flex items-center gap-1">
                          <div
                            class="badge badge-sm"
                            :class="
                              calculatedResults.exchangeRateInfo.cached
                                ? 'badge-warning'
                                : 'badge-success'
                            "
                          >
                            {{ calculatedResults.exchangeRateInfo.cached ? "Cached" : "Live" }}
                          </div>
                          <ExternalLinkIcon class="h-3 w-3 opacity-60" />
                        </div>
                      </div>
                      <div class="mt-1 opacity-70">
                        {{ calculatedResults.exchangeRateInfo.source }} •
                        {{
                          calculatedResults.exchangeRateInfo.timestamp
                            ? new Date(
                                calculatedResults.exchangeRateInfo.timestamp,
                              ).toLocaleTimeString()
                            : "N/A"
                        }}
                      </div>
                    </div>
                  </div>

                  <!-- Additional Information -->
                  <div class="alert alert-info">
                    <InfoIcon class="h-5 w-5" />
                    <div>
                      <h3 class="font-bold">Are you about to enter a trade?</h3>
                      <div class="text-xs">
                        You might also want to check out our
                        <router-link
                          to="/position-calculator"
                          class="link link-success font-semibold"
                        >
                          position size calculator </router-link
                        >.
                      </div>
                      <span class="text-xs">
                        It can help you to calculate the optimal size of your initial position
                        depending on your stop-loss in pips, risk tolerance and account size.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Loading State -->
            <div v-else-if="isLoading" class="card bg-base-200">
              <div class="card-body flex items-center justify-center">
                <div class="text-center">
                  <span class="loading loading-spinner loading-lg text-primary"></span>
                  <p class="mt-4 text-lg font-medium">Calculating Pip Value...</p>
                  <p class="text-sm text-base-content/60">Fetching tick price</p>
                </div>
              </div>
            </div>

            <!-- Placeholder -->
            <div v-else class="card bg-base-200">
              <div class="card-body flex items-center justify-center">
                <div class="text-center text-base-content/50">
                  <CalculatorIcon class="mx-auto mb-4 h-16 w-16 opacity-50" />
                  <p class="text-lg font-medium">Click Calculate to see pip value</p>
                  <p class="text-sm">We'll fetch tick price for accurate calculations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import {
    AlertTriangleIcon,
    CalculatorIcon,
    ExternalLinkIcon,
    InfoIcon,
    TrendingUpIcon,
  } from "lucide-vue-next"
  import { toRaw } from "vue"
  import FormInput from "../components/FormInput.vue"
  import FormSelect from "../components/FormSelect.vue"
  import { usePipCalculator } from "../composables/usePipCalculator.js"
  import { CURRENCY_OPTIONS, CURRENCY_PAIR_OPTIONS, TRADINGVIEW_SYMBOLS } from "../default/constants.js"
  import { formatCurrency, formatNumber } from "../utils/formatters.js"

  const openChart = pair => {
    const symbol = TRADINGVIEW_SYMBOLS[pair]
    if (symbol) {
      window.open(`https://www.tradingview.com/chart/?symbol=${symbol}`, "_blank")
    }
  }

  const { formData, hasCalculated, calculatedResults, isLoading, error, calculate } =
    usePipCalculator()

  const handleCalculate = () => {
    console.log("🖱️CLICKED CALCULATE")
    console.log("📊 Current form data: ", toRaw(formData))
    calculate()
  }
</script>
