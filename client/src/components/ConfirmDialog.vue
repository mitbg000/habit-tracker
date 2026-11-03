<script setup>
import { ref, watch, nextTick, onBeforeUnmount, onDeactivated, useId } from 'vue';
import { Trash2, LogOut } from 'lucide-vue-next';
import BaseButton from './BaseButton.vue';
import { t } from '../i18n';

const props = defineProps({
  open: Boolean,
  title: { type: String, required: true },
  name: String, // tên đối tượng, in đậm
  message: String,
  confirmLabel: { type: String, required: true },
  icon: { type: String, default: 'trash' }, // trash | logout
  loading: Boolean,
});
const emit = defineEmits(['confirm', 'cancel']);

const id = useId();
const cancelBtn = ref(null);
const rendered = ref(false); // còn trong DOM (để chạy hiệu ứng ra)
const shown = ref(false); // đang ở trạng thái "mở"
let timer;

watch(
  () => props.open,
  async (isOpen) => {
    clearTimeout(timer);
    if (isOpen) {
      rendered.value = true;
      document.body.style.overflow = 'hidden';
      await nextTick();
      requestAnimationFrame(() => {
        shown.value = true;
        // Tiêu điểm rơi vào Huỷ để Enter không xoá nhầm
        cancelBtn.value?.$el?.focus();
      });
    } else {
      shown.value = false;
      timer = setTimeout(() => {
        rendered.value = false;
        document.body.style.overflow = '';
      }, 110);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  clearTimeout(timer);
  document.body.style.overflow = '';
});

// Trang được giữ lại khi rời đi (KeepAlive), nên phải tự đóng nếu đang mở
onDeactivated(() => {
  if (props.open) emit('cancel');
});

function onKeydown(e) {
  if (e.key === 'Escape' && !props.loading) emit('cancel');
}
</script>

<template>
  <Teleport to="body">
    <div v-if="rendered" class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown="onKeydown">
      <!-- Lớp nền và khung là hai anh em, mỗi cái tự mờ -->
      <div
        class="absolute inset-0 bg-black/30 transition-opacity motion-reduce:transition-none"
        :class="shown ? 'opacity-100 duration-150 ease-out' : 'opacity-0 duration-100 ease-in'"
        @click="!loading && emit('cancel')"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="`${id}-title`"
        :aria-describedby="`${id}-desc`"
        class="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-modal transition-[opacity,scale] motion-reduce:transition-none"
        :class="shown ? 'scale-100 opacity-100 duration-150 ease-out' : 'scale-95 opacity-0 duration-100 ease-in'"
      >
        <div class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-sage/15">
            <LogOut v-if="icon === 'logout'" class="size-5 text-sage-fg" aria-hidden="true" />
            <Trash2 v-else class="size-5 text-sage-fg" aria-hidden="true" />
          </div>
          <h2 :id="`${id}-title`" class="text-lg font-semibold">{{ title }}</h2>
          <div class="col-span-2 mt-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:mt-0.5">
            <p :id="`${id}-desc`" class="text-sm/6 text-pretty text-muted">
              <span v-if="name" class="font-medium text-foreground">{{ name }}</span>
              {{ message }}
            </p>
          </div>
        </div>
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <BaseButton ref="cancelBtn" variant="secondary" size="form" @click="emit('cancel')">{{ t('common.cancel') }}</BaseButton>
          <BaseButton variant="danger" size="form" :loading="loading" @click="emit('confirm')">
            {{ confirmLabel }}
          </BaseButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>
