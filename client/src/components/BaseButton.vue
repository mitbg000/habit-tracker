<script setup>
import { computed } from 'vue';
import { LoaderCircle } from 'lucide-vue-next';

const props = defineProps({
  variant: { type: String, default: 'outline' }, // outline | primary | secondary | ghost | danger
  type: { type: String, default: 'button' },
  loading: Boolean,
  block: Boolean,
  size: { type: String, default: 'base' }, // base | form | tall (đăng nhập/đăng ký đứng riêng)
});
const emit = defineEmits(['click']);

const variantClass = computed(
  () =>
    ({
      outline: 'border border-border-strong bg-surface text-foreground hover:bg-button-hover',
      primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
      secondary: 'bg-secondary text-foreground hover:bg-secondary-hover',
      ghost: 'bg-transparent text-muted hover:bg-foreground/5 hover:text-foreground',
      danger: 'bg-sage/15 text-sage-fg hover:bg-sage/25',
    })[props.variant],
);

const sizeClass = computed(
  () => ({ base: 'min-h-10', form: 'min-h-11 md:min-h-10', tall: 'min-h-12' })[props.size],
);

function onClick(event) {
  // Đang xử lý: chặn bấm nhưng không dùng `disabled` để không mất tiêu điểm bàn phím
  if (props.loading) {
    event.preventDefault();
    return;
  }
  emit('click', event);
}
</script>

<template>
  <button
    :type="type"
    :aria-disabled="loading || undefined"
    :aria-busy="loading || undefined"
    class="relative inline-flex max-w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-center text-sm leading-tight font-medium outline-hidden transition-colors [overflow-wrap:anywhere] disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress"
    :class="[variantClass, sizeClass, block && 'w-full']"
    @click="onClick"
  >
    <span class="inline-flex items-center justify-center gap-2" :class="loading && 'invisible'">
      <slot name="icon" />
      <slot />
    </span>
    <LoaderCircle
      v-if="loading"
      class="absolute inset-0 m-auto size-4 animate-spin motion-reduce:animate-none"
      aria-hidden="true"
    />
  </button>
</template>
