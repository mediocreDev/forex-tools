<template>
  <div class="min-h-screen bg-base-200 px-4 py-8">
    <div class="mx-auto max-w-7xl">
      <h1 class="mb-8 text-center text-3xl font-bold text-base-content">
        Forex Position Size Calculator with Risk Management
      </h1>

      <!-- Error Alert -->
      <div v-if="error" class="alert alert-error mb-6">
        <AlertTriangleIcon class="h-5 w-5" />
        <span>{{ error }}</span>
        <button @click="error = null" class="btn btn-ghost btn-sm">
          <XIcon class="h-4 w-4" />
        </button>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Input Section -->
        <div class="space-y-4">
          <FormSelect label="Account Currency" v-model="formData.accountCurrency" :options="CURRENCY_OPTIONS" />

          <FormInput label="Account Balance" v-model.number="formData.accountBalance" type="number"
            placeholder="1000" />

          <FormInput label="Risk Percentage" v-model.number="formData.riskPercentage" type="number" step="0.1"
            placeholder="2" :has-error="formData.riskPercentage > 5"
            error-message="Warning: Risk above 5% is considered very high!" />

          <FormInput label="Stop Loss (pips)" v-model.number="formData.stopLossPips" type="number" placeholder="35" />

          <FormInput label="Take Profit (pips) - Optional" v-model.number="formData.takeProfitPips" type="number"
            placeholder="70" />

          <FormSelect label="Currency Pair" v-model="formData.currencyPair" :options="CURRENCY_PAIR_OPTIONS" />

          <button @click="handleCalculateClick" class="btn btn-success btn-lg w-full" :disabled="isLoading">
            <span v-if="isLoading" class="loading loading-spinner loading-sm"></span>
            <CalculatorIcon v-else class="mr-2 h-5 w-5" />
            {{ isLoading ? "Fetching Live Rates..." : "Calculate" }}
          </button>
        </div>

        <!-- Results Section -->
        <div v-if="hasCalculated && calculatedResults" class="card bg-base-100 shadow-lg">
          <div class="card-body">
            <div class="mb-4 flex items-center gap-2">
              <h2 class="card-title text-lg">Results</h2>
              <div class="badge badge-neutral badge-sm">i</div>
            </div>

            <!-- Exchange Rate Info -->
            <div class="alert alert-info mb-4">
              <InfoIcon class="h-4 w-4" />
              <div class="text-xs">
                <div class="flex items-center justify-between">
                  <div>
                    <strong>
                      {{
                      `${calculatedResults.exchangeRateInfo.broker}-${calculatedResults.formSnapshot.currencyPair}:`
                      }}
                    </strong>
                    {{
                    formatNumber(calculatedResults.exchangeRateInfo.currentRate,
                    calculatedResults.formSnapshot.currencyPair.includes("JPY")
                    || calculatedResults.formSnapshot.currencyPair.includes("XAU")
                    || calculatedResults.formSnapshot.currencyPair.includes("USOIL") ? 3 :
                    calculatedResults.formSnapshot.currencyPair.includes("BTC") ? 2 : 5)
                    }}
                  </div>
                  <div class="badge badge-sm ml-1" :class="calculatedResults.exchangeRateInfo.cached ? 'badge-warning' : 'badge-success'
                    ">
                    {{ calculatedResults.exchangeRateInfo.cached ? "CACHED" : "LIVE" }}
                  </div>
                </div>
                <div class="mt-1 opacity-70">
                  {{ calculatedResults.exchangeRateInfo.provider }} •
                  {{ new Date(calculatedResults.exchangeRateInfo.timestamp).toLocaleTimeString() }}
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <div>
                <p class="mb-1 text-sm text-base-content/70">Amount at Risk</p>
                <p class="text-xl font-bold">
                  {{ formatCurrency(calculatedResults.results.amountAtRisk) }}
                  {{ calculatedResults.formSnapshot.accountCurrency }}
                </p>
              </div>

              <div>
                <p class="mb-1 text-sm text-base-content/70">Position Size (units)</p>
                <p class="text-xl font-bold">
                  {{ formatNumber(calculatedResults.results.positionSizeUnits, 0) }}
                </p>
              </div>

              <div>
                <p class="mb-1 text-sm text-base-content/70">Standard Lots</p>
                <p class="text-xl font-bold">
                  {{ formatNumber(calculatedResults.results.standardLots, 2) }}
                </p>
              </div>

              <!-- <div>
                <p class="mb-1 text-sm text-base-content/70">Mini Lots</p>
                <p class="text-xl font-bold">
                  {{ formatNumber(calculatedResults.results.miniLots, 2) }}
                </p>
              </div>

              <div>
                <p class="mb-1 text-sm text-base-content/70">Micro Lots</p>
                <p class="text-xl font-bold">
                  {{ formatNumber(calculatedResults.results.microLots, 2) }}
                </p>
              </div> -->

              <div v-if="calculatedResults.results.riskRewardRatio > 0">
                <p class="mb-1 text-sm text-base-content/70">Risk-Reward Ratio</p>
                <p class="text-warning text-xl font-bold">
                  1:{{ formatNumber(calculatedResults.results.riskRewardRatio, 2) }}
                </p>
              </div>

              <div v-if="calculatedResults.results.potentialProfit > 0">
                <p class="mb-1 text-sm text-base-content/70">Potential Profit</p>
                <p class="text-success text-xl font-bold">
                  {{ formatCurrency(calculatedResults.results.potentialProfit) }}
                  {{ calculatedResults.formSnapshot.accountCurrency }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-else-if="isLoading" class="card bg-base-100 shadow-lg">
          <div class="card-body flex items-center justify-center">
            <div class="text-center">
              <span class="loading loading-spinner loading-lg text-primary"></span>
              <p class="mt-4 text-lg font-medium">Fetching Live Exchange Rates...</p>
              <p class="text-sm text-base-content/60">Connecting to forex API via HTTP service</p>
            </div>
          </div>
        </div>

        <!-- Placeholder when no calculation -->
        <div v-else class="card bg-base-100 shadow-lg">
          <div class="card-body flex items-center justify-center">
            <div class="text-center text-base-content/50">
              <CalculatorIcon class="mx-auto mb-4 h-16 w-16 opacity-50" />
              <p class="text-lg font-medium">Click Calculate to see results</p>
              <p class="text-sm">
                We'll fetch live exchange rates via HTTP API for accurate calculations
              </p>
            </div>
          </div>
        </div>

        <!-- Right Panel - Risk Management -->
        <div v-if="hasCalculated && calculatedResults" class="space-y-4">
          <!-- Risk Warnings -->
          <div class="card border border-error/20 bg-error/10">
            <div class="card-body">
              <div class="mb-3 flex items-center gap-2">
                <AlertTriangleIcon class="h-5 w-5 text-error" />
                <h3 class="font-bold text-error">Risk Warnings</h3>
              </div>
              <div v-if="calculatedResults.formSnapshot.riskPercentage > 5" class="text-sm text-error">
                ⚠️ Risk percentage exceeds recommended 2-3% limit
              </div>
              <div v-else class="text-success text-sm">✅ Risk parameters look good!</div>
            </div>
          </div>

          <!-- Drawdown Analysis -->
          <div class="card border border-info/20 bg-info/10">
            <div class="card-body">
              <div class="mb-3 flex items-center gap-2">
                <TrendingDownIcon class="h-5 w-5 text-info" />
                <h3 class="font-bold text-info">Drawdown Analysis</h3>
              </div>

              <div class="space-y-3 text-sm">
                <div>
                  <p class="mb-2 font-semibold">Maximum Consecutive Losses:</p>
                  <div class="flex justify-between">
                    <span>5 losses:</span>
                    <span class="font-bold text-error">
                      -{{ formatCurrency(calculatedResults.drawdownAnalysis.fiveLosses) }}
                      {{ calculatedResults.formSnapshot.accountCurrency }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span>10 losses:</span>
                    <span class="font-bold text-error">
                      -{{ formatCurrency(calculatedResults.drawdownAnalysis.tenLosses) }}
                      {{ calculatedResults.formSnapshot.accountCurrency }}
                    </span>
                  </div>
                </div>

                <div>
                  <p class="mb-2 font-semibold">Account After Drawdown:</p>
                  <div class="flex justify-between">
                    <span>After 5:</span>
                    <span class="font-bold">
                      {{ formatCurrency(calculatedResults.drawdownAnalysis.balanceAfterFive) }}
                      {{ calculatedResults.formSnapshot.accountCurrency }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span>After 10:</span>
                    <span class="font-bold">
                      {{ formatCurrency(calculatedResults.drawdownAnalysis.balanceAfterTen) }}
                      {{ calculatedResults.formSnapshot.accountCurrency }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Risk Management Tips -->
          <!-- <div class="card bg-success/10 border border-success/20">
            <div class="card-body">
              <div class="flex items-center gap-2 mb-3">
                <ShieldCheckIcon class="w-5 h-5 text-success" />
                <h3 class="font-bold text-success">Risk Management Tips</h3>
              </div>

              <ul class="space-y-2 text-sm">
                <li class="flex items-start gap-2">
                  <CheckIcon class="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Never risk more than 1-2% per trade</span>
                </li>
                <li class="flex items-start gap-2">
                  <CheckIcon class="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Maintain minimum 1:2 risk-reward ratio</span>
                </li>
                <li class="flex items-start gap-2">
                  <CheckIcon class="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Use proper stop losses on every trade</span>
                </li>
                <li class="flex items-start gap-2">
                  <CheckIcon class="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Diversify across multiple currency pairs</span>
                </li>
                <li class="flex items-start gap-2">
                  <CheckIcon class="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Keep a trading journal to track performance</span>
                </li>
              </ul>
            </div>
          </div> -->

          <!-- Recommendation -->
          <div class="bg-warning/10 border-warning/20 card border">
            <div class="card-body">
              <div class="mb-3 flex items-center gap-2">
                <LightbulbIcon class="text-warning h-5 w-5" />
                <h3 class="text-warning font-bold">Recommendation</h3>
              </div>

              <div class="text-sm">
                <p class="mb-2 font-semibold">Suggested Position Size:</p>
                <div class="rounded-lg bg-base-100 p-3">
                  <p class="text-lg font-bold">
                    {{ formatNumber(calculatedResults.recommendations.suggestedLots, 4) }} Standard
                    Lots
                  </p>
                  <p class="mt-1 text-xs text-base-content/60">
                    Based on 2% risk and current parameters
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Placeholder for right panel -->
        <div v-else class="space-y-4">
          <div class="card bg-base-100 shadow-lg">
            <div class="card-body flex items-center justify-center">
              <div class="text-center text-base-content/50">
                <ShieldCheckIcon class="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p class="font-medium">Risk Analysis</p>
                <p class="text-sm">Will appear after calculation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import FormInput from "../components/FormInput.vue"
import FormSelect from "../components/FormSelect.vue"
import { usePositionCalculator } from "../composables/usePositionCalculator.js"
import { CURRENCY_OPTIONS, CURRENCY_PAIR_OPTIONS } from "../default/constants.js"
import { formatCurrency, formatNumber } from "../utils/formatters.js"
import {
  AlertTriangleIcon,
  CheckIcon,
  TrendingDownIcon,
  LightbulbIcon,
  ShieldCheckIcon,
  CalculatorIcon,
  InfoIcon,
  XIcon,
} from "lucide-vue-next"

const { formData, hasCalculated, calculatedResults, isLoading, error, calculate } =
  usePositionCalculator()

const handleCalculateClick = () => {
  console.log("🖱️ Calculate button clicked!")
  calculate()
}
</script>
