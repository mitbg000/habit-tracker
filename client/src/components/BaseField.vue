<script setup>
import { ref, computed, useId, onMounted } from 'vue';
import { Eye, EyeOff } from 'lucide-vue-next';
import { t } from '../i18n';

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  placeholder: String,
  hint: String,
  error: String,
  autocomplete: String,
  inputmode: String,
  maxlength: Number,
  autofocus: Boolean,
  tall: Boolean,
});
const emit = defineEmits(['update:modelValue', 'enter']);

const id = useId();
const inputEl = ref(null);
const isVisible = ref(false);
const isPassword = computed(() => props.type === 'password');
const actualType = computed(() => (isPassword.value && isVisible.value ? 'text' : props.type));

onMounted(() => {
  if (props.autofocus) inputEl.value?.focus();
});

defineExpose({ focus: () => inputEl.value?.focus() });
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="w-fit cursor-pointer text-sm font-medium">{{ label }}</label>
    <div class="relative">
      <input
        :id="id"
        ref="inputEl"
        :type="actualType"
        :value="modelValue"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :maxlength="maxlength"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error || hint ? `${id}-note` : undefined"
        class="w-full rounded-xl border bg-surface px-4 text-base text-foreground outline-hidden transition-colors placeholder:text-muted md:text-sm"
        :class="[
          tall ? 'h-12 md:h-12' : 'h-11 md:h-10',
          isPassword && 'pr-11',
          error
            ? 'border-red-500 focus:ring-2 focus:ring-red-500/10'
            : 'border-border-strong focus:border-focus focus:ring-2 focus:ring-focus',
        ]"
        @input="emit('update:modelValue', $event.target.value)"
        @keydown.enter="emit('enter')"
      />
      <button
        v-if="isPassword"
        type="button"
        :aria-label="isVisible ? t('auth.hidePassword') : t('auth.showPassword')"
        class="absolute inset-y-0 right-1 my-auto flex size-10 cursor-pointer items-center justify-center rounded-lg text-muted outline-hidden hover:text-foreground"
        @click="isVisible = !isVisible"
      >
        <EyeOff v-if="isVisible" class="size-4" aria-hidden="true" />
        <Eye v-else class="size-4" aria-hidden="true" />
      </button>
    </div>
    <!-- Dưới ô luôn có một dòng: lỗi thay chỗ gợi ý, hiện hay mất cũng không làm ô bên dưới nhảy -->
    <p :id="`${id}-note`" class="min-h-4 text-xs" :class="error ? 'text-red-600' : 'text-muted'">
      {{ error || hint }}
    </p>
  </div>
</template>
