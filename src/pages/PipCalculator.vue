<template>
  <div class="min-h-screen bg-base-200 py-8 px-4">
    <div class="max-w-6xl mx-auto">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h1 class="card-title text-3xl font-bold justify-center mb-8">
            <TrendingUpIcon class="w-8 h-8 mr-2" />
            Pip Value Calculator
          </h1>

          <div class="grid lg:grid-cols-2 gap-8">
            <!-- Input Section -->
            <div class="space-y-6">
              <FormSelect label="Currency Pair" v-model="formData.currencyPair" :options="CURRENCY_PAIR_OPTIONS" />

              <FormInput label="Standard Lot(s)" v-model.number="formData.standardLotSize" type="number" step="0.01" />

              <FormSelect label="Account Currency" v-model="formData.accountCurrency" :options="CURRENCY_OPTIONS" />

              <button @click="handleCalculate" class="btn btn-success btn-lg w-full" :disabled="isLoading">
                <span v-if="isLoading" class="loading loading-spinner loading-sm"></span>
                <CalculatorIcon v-else class="w-5 h-5 mr-2" />
                {{ isLoading ? "Calculating..." : "Calculate Pip Value" }}
              </button>
            </div>

            <!-- Results Section -->
            <div v-if="hasCalculated" class="card bg-base-200">
              <div class="card-body">
                <div class="flex items-center mb-6">
                  <h2 class="card-title text-xl">
                    <BarChart3Icon class="w-6 h-6 mr-2" />
                    Results
                  </h2>
                  <div class="badge badge-info ml-2">
                    <InfoIcon class="w-4 h-4" />
                  </div>
                </div>

                <!-- Error Display -->
                <div v-if="error" class="alert alert-error mb-4">
                  <AlertTriangleIcon class="w-5 h-5" />
                  <span>{{ error }}</span>
                </div>

                <div v-else class="space-y-6">
                  <!-- Pip Value Result -->
                  <div class="stat">
                    <div class="stat-title">Pip Value</div>
                    <div class="stat-value text-primary text-4xl">
                      {{ formatCurrency(calculatedResults.results.pipValue, formData.accountCurrency, 2) }}
                    </div>
                    <div class="stat-desc">{{ formData.accountCurrency }}</div>
                  </div>

                  <!-- Exchange Rate Info -->
                  <div class="alert alert-info">
                    <InfoIcon class="w-4 h-4" />
                    <div class="text-xs">
                      <div class="flex justify-between items-center">
                        <div>
                          <strong>{{ formData.currencyPair }}:</strong>
                          {{ formatNumber(calculatedResults.exchangeRateInfo.currentRate, 5) }}
                        </div>
                        <div class="badge badge-sm ml-1"
                          :class="calculatedResults.exchangeRateInfo.cached ? 'badge-warning' : 'badge-success'">
                          {{ calculatedResults.exchangeRateInfo.cached ? 'Cached' : 'Live' }}
                        </div>
                      </div>
                      <div class="opacity-70 mt-1">
                        {{ calculatedResults.exchangeRateInfo.broker }} •
                        {{ calculatedResults.exchangeRateInfo.timestamp ? new Date(calculatedResults.exchangeRateInfo.timestamp).toLocaleTimeString() :
                          'N/A' }}
                      </div>
                    </div>
                  </div>

                  <!-- Additional Information -->
                  <div class="alert alert-info">
                    <InfoIcon class="w-5 h-5" />
                    <div>
                      <h3 class="font-bold">Are you about to enter a trade?</h3>
                      <div class="text-xs">
                        You might also want to check out our
                        <router-link to="/position-calculator" class="link link-success font-semibold">
                          position size calculator
                        </router-link>.
                      </div>
                      <span class="text-xs">
                        It can help you to calculate the optimal size of your initial position depending
                        on your stop-loss in pips, risk tolerance and account size.
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
                  <p class="text-lg font-medium mt-4">Calculating Pip Value...</p>
                  <p class="text-sm text-base-content/60">Fetching tick price</p>
                </div>
              </div>
            </div>

            <!-- Placeholder -->
            <div v-else class="card bg-base-200">
              <div class="card-body flex items-center justify-center">
                <div class="text-center text-base-content/50">
                  <CalculatorIcon class="w-16 h-16 mx-auto mb-4 opacity-50" />
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
import FormInput from '../components/FormInput.vue'
import FormSelect from '../components/FormSelect.vue'
import { usePipCalculator } from '../composables/usePipCalculator.js'
import { CURRENCY_OPTIONS, CURRENCY_PAIR_OPTIONS } from '../default/constants.js'
import { formatNumber, formatCurrency } from '../utils/formatters.js'
import { getPipSize } from '../utils/calculations.js'
import {
  TrendingUpIcon,
  CalculatorIcon,
  BarChart3Icon,
  InfoIcon,
  AlertTriangleIcon
} from 'lucide-vue-next'

const { formData, hasCalculated, calculatedResults, isLoading, error, calculate } = usePipCalculator()

const handleCalculate = () => {
  console.log("🖱️ Calculate button clicked!")
  console.log("📊 Current form data:", formData)
  calculate()
}
</script>
