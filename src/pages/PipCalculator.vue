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
              <FormSelect label="Currency Pair" v-model="formData.currencyPair" :options="CURRENCY_PAIR_OPTIONS" />

              <FormInput label="Ask Price" v-model.number="formData.askPrice" type="number" step="0.00001"
                placeholder="1.14604" />

              <FormInput label="Position Size (units)" v-model.number="formData.positionSize" type="number"
                placeholder="100,000" />

              <FormSelect label="Account Currency" v-model="formData.accountCurrency" :options="CURRENCY_OPTIONS" />

              <button @click="calculate" class="btn btn-success btn-lg w-full">
                <CalculatorIcon class="mr-2 h-5 w-5" />
                Calculate
              </button>
            </div>

            <!-- Results Section -->
            <div class="card bg-base-200">
              <div class="card-body">
                <div class="mb-6 flex items-center">
                  <h2 class="card-title text-xl">
                    <BarChart3Icon class="mr-2 h-6 w-6" />
                    Results
                  </h2>
                  <div class="badge badge-info ml-2">
                    <InfoIcon class="h-4 w-4" />
                  </div>
                </div>

                <div class="space-y-6">
                  <!-- Pip Value Result -->
                  <div class="stat">
                    <div class="stat-title">Pip Value</div>
                    <div class="stat-value text-primary">
                      {{ results.pipValue }}
                    </div>
                    <div class="stat-desc">{{ formData.accountCurrency }}</div>
                  </div>

                  <!-- Additional Information -->
                  <div class="alert alert-info">
                    <InfoIcon class="h-5 w-5" />
                    <div>
                      <h3 class="font-bold">Are you about to enter a trade?</h3>
                      <div class="text-xs">
                        You might also want to check out our
                        <router-link to="/position-calculator" class="link link-success font-semibold">
                          position size calculator </router-link>.
                      </div>
                    </div>
                  </div>

                  <div class="alert">
                    <InfoIcon class="h-5 w-5" />
                    <span class="text-sm">
                      It can help you to calculate the optimal size of your initial position
                      depending on your stop-loss in pips, risk tolerance and account size.
                    </span>
                  </div>

                  <!-- Calculation Details -->
                  <!-- <div class="card bg-base-100">
                    <div class="card-body">
                      <h3 class="card-title text-sm">Calculation Details</h3>
                      <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span class="font-medium">Currency Pair:</span>
                          <div class="badge badge-outline">{{ formData.currencyPair }}</div>
                        </div>
                        <div>
                          <span class="font-medium">Ask Price:</span>
                          <div class="badge badge-outline">{{ formData.askPrice }}</div>
                        </div>
                        <div>
                          <span class="font-medium">Position Size:</span>
                          <div class="badge badge-outline">
                            {{ formatNumber(formData.positionSize, 0) }} units
                          </div>
                        </div>
                        <div>
                          <span class="font-medium">Account Currency:</span>
                          <div class="badge badge-outline">{{ formData.accountCurrency }}</div>
                        </div>
                      </div>
                    </div>
                  </div> -->
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
import FormInput from "../components/FormInput.vue"
import FormSelect from "../components/FormSelect.vue"
import { usePipCalculator } from "../composables/usePipCalculator.js"
import { CURRENCY_OPTIONS, CURRENCY_PAIR_OPTIONS } from "../default/constants.js"
import { formatNumber } from "../utils/formatters.js"
import { TrendingUpIcon, CalculatorIcon, BarChart3Icon, InfoIcon } from "lucide-vue-next"

const { formData, results, calculate } = usePipCalculator()
</script>
