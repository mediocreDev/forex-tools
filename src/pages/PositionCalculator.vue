<template>
  <div class="min-h-screen bg-base-200 py-8 px-4">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold text-center mb-8 text-base-content">
        Forex Position Size Calculator with Risk Management
      </h1>

      <!-- Error Alert -->
      <div v-if="error" class="alert alert-error mb-6">
        <AlertTriangleIcon class="w-5 h-5" />
        <span>{{ error }}</span>
        <button @click="error = null" class="btn btn-sm btn-ghost">
          <XIcon class="w-4 h-4" />
        </button>
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
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

          <button @click="handleCalculateClick" class="btn btn-success w-full btn-lg" :disabled="isLoading">
            <span v-if="isLoading" class="loading loading-spinner loading-sm"></span>
            <CalculatorIcon v-else class="w-5 h-5 mr-2" />
            {{ isLoading ? "Fetching Live Rates..." : "Calculate" }}
          </button>
        </div>

        <!-- Results Section -->
        <div v-if="hasCalculated && calculatedResults" class="card bg-base-100 shadow-lg">
          <div class="card-body">
            <div class="flex items-center gap-2 mb-4">
              <h2 class="card-title text-lg">Results</h2>
              <div class="badge badge-neutral badge-sm">i</div>
            </div>

            <!-- Exchange Rate Info -->
            <div class="alert alert-info mb-4">
              <InfoIcon class="w-4 h-4" />
              <div class="text-xs">
                <div class="flex justify-between items-center">
                  <div>
                    <strong>{{ calculatedResults.formSnapshot.currencyPair }}:</strong>
                    {{ formatNumber(calculatedResults.exchangeRateInfo.currentRate, 5) }}
                  </div>
                  <div class="badge badge-sm"
                    :class="calculatedResults.exchangeRateInfo.cached ? 'badge-warning' : 'badge-success'">
                    {{ calculatedResults.exchangeRateInfo.cached ? 'Cached' : 'Live' }}
                  </div>
                </div>
                <div class="opacity-70 mt-1">
                  {{ calculatedResults.exchangeRateInfo.provider }} •
                  {{ new Date(calculatedResults.exchangeRateInfo.timestamp).toLocaleTimeString() }}
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <div>
                <p class="text-sm text-base-content/70 mb-1">Amount at Risk</p>
                <p class="text-xl font-bold">
                  {{ formatCurrency(calculatedResults.results.amountAtRisk) }}
                  {{ calculatedResults.formSnapshot.accountCurrency }}
                </p>
              </div>

              <div>
                <p class="text-sm text-base-content/70 mb-1">Position Size (units)</p>
                <p class="text-xl font-bold">{{ formatNumber(calculatedResults.results.positionSizeUnits, 0) }}</p>
              </div>

              <div>
                <p class="text-sm text-base-content/70 mb-1">Standard Lots</p>
                <p class="text-xl font-bold">{{ formatNumber(calculatedResults.results.standardLots, 2) }}</p>
              </div>

              <div>
                <p class="text-sm text-base-content/70 mb-1">Mini Lots</p>
                <p class="text-xl font-bold">{{ formatNumber(calculatedResults.results.miniLots, 2) }}</p>
              </div>

              <div>
                <p class="text-sm text-base-content/70 mb-1">Micro Lots</p>
                <p class="text-xl font-bold">{{ formatNumber(calculatedResults.results.microLots, 2) }}</p>
              </div>

              <div v-if="calculatedResults.results.riskRewardRatio > 0">
                <p class="text-sm text-base-content/70 mb-1">Risk-Reward Ratio</p>
                <p class="text-xl font-bold text-warning">
                  1:{{ formatNumber(calculatedResults.results.riskRewardRatio, 2) }}
                </p>
              </div>

              <div v-if="calculatedResults.results.potentialProfit > 0">
                <p class="text-sm text-base-content/70 mb-1">Potential Profit</p>
                <p class="text-xl font-bold text-success">
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
              <p class="text-lg font-medium mt-4">Fetching Live Exchange Rates...</p>
              <p class="text-sm text-base-content/60">Connecting to forex API via HTTP service</p>
            </div>
          </div>
        </div>

        <!-- Placeholder when no calculation -->
        <div v-else class="card bg-base-100 shadow-lg">
          <div class="card-body flex items-center justify-center">
            <div class="text-center text-base-content/50">
              <CalculatorIcon class="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p class="text-lg font-medium">Click Calculate to see results</p>
              <p class="text-sm">We'll fetch live exchange rates via HTTP API for accurate calculations</p>
            </div>
          </div>
        </div>

        <!-- Right Panel - Risk Management -->
        <div v-if="hasCalculated && calculatedResults" class="space-y-4">
          <!-- Risk Warnings -->
          <div class="card bg-error/10 border border-error/20">
            <div class="card-body">
              <div class="flex items-center gap-2 mb-3">
                <AlertTriangleIcon class="w-5 h-5 text-error" />
                <h3 class="font-bold text-error">Risk Warnings</h3>
              </div>
              <div v-if="calculatedResults.formSnapshot.riskPercentage > 5" class="text-sm text-error">
                ⚠️ Risk percentage exceeds recommended 2-3% limit
              </div>
              <div v-else class="text-sm text-success">✅ Risk parameters look good!</div>
            </div>
          </div>

          <!-- Drawdown Analysis -->
          <div class="card bg-info/10 border border-info/20">
            <div class="card-body">
              <div class="flex items-center gap-2 mb-3">
                <TrendingDownIcon class="w-5 h-5 text-info" />
                <h3 class="font-bold text-info">Drawdown Analysis</h3>
              </div>

              <div class="space-y-3 text-sm">
                <div>
                  <p class="font-semibold mb-2">Maximum Consecutive Losses:</p>
                  <div class="flex justify-between">
                    <span>5 losses:</span>
                    <span class="text-error font-bold">
                      -{{ formatCurrency(calculatedResults.drawdownAnalysis.fiveLosses) }}
                      {{ calculatedResults.formSnapshot.accountCurrency }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span>10 losses:</span>
                    <span class="text-error font-bold">
                      -{{ formatCurrency(calculatedResults.drawdownAnalysis.tenLosses) }}
                      {{ calculatedResults.formSnapshot.accountCurrency }}
                    </span>
                  </div>
                </div>

                <div>
                  <p class="font-semibold mb-2">Account After Drawdown:</p>
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
          <div class="card bg-warning/10 border border-warning/20">
            <div class="card-body">
              <div class="flex items-center gap-2 mb-3">
                <LightbulbIcon class="w-5 h-5 text-warning" />
                <h3 class="font-bold text-warning">Recommendation</h3>
              </div>

              <div class="text-sm">
                <p class="font-semibold mb-2">Suggested Position Size:</p>
                <div class="bg-base-100 p-3 rounded-lg">
                  <p class="text-lg font-bold">
                    {{ formatNumber(calculatedResults.recommendations.suggestedLots, 4) }} Standard Lots
                  </p>
                  <p class="text-xs text-base-content/60 mt-1">Based on 2% risk and current parameters</p>
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
                <ShieldCheckIcon class="w-12 h-12 mx-auto mb-3 opacity-50" />
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

const { formData, hasCalculated, calculatedResults, isLoading, error, calculate } = usePositionCalculator()

const handleCalculateClick = () => {
  console.log("🖱️ Calculate button clicked!")
  calculate()
}
</script>
