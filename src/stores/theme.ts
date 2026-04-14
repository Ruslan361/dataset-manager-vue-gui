import { ref } from 'vue'
import { defineStore } from 'pinia'

// Hex-приближения HSL-значений из base.css — используются как defaults в UI
export const THEME_DEFAULTS = {
  '--primary-color':       '#2a6df4',
  '--secondary-color':     '#10b77f',
  '--accent-color':        '#f59f0a',
  '--success-color':       '#16a16e',
  '--warning-color':       '#f59f0a',
  '--error-color':         '#ef4343',
  '--bg-color':            '#ffffff',
  '--bg-color-secondary':  '#fafafa',
  '--bg-color-accent':     '#f2f2f2',
  '--text-color':          '#000000',
  '--text-color-secondary':'#666666',
  '--border-color':        '#dcdcdc',
  '--border-radius':       '8px',
  '--border-radius-large': '12px',
} as const

export type ThemeKey = keyof typeof THEME_DEFAULTS

export const useThemeStore = defineStore('theme', () => {
  const overrides = ref<Partial<Record<ThemeKey, string>>>({})

  /** Применяет все сохранённые overrides к :root. Вызывать после монтирования приложения. */
  function apply() {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    for (const key of Object.keys(THEME_DEFAULTS) as ThemeKey[]) {
      const val = overrides.value[key]
      if (val != null) {
        root.style.setProperty(key, val)
      } else {
        root.style.removeProperty(key)
      }
    }
  }

  /** Задаёт одну переменную и сразу применяет её. */
  function setVar(key: ThemeKey, value: string) {
    overrides.value = { ...overrides.value, [key]: value }
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty(key, value)
    }
  }

  /** Сбрасывает все кастомизации к значениям base.css. */
  function reset() {
    overrides.value = {}
    apply()
  }

  /** Возвращает текущее эффективное значение переменной (override или default). */
  function getVar(key: ThemeKey): string {
    return overrides.value[key] ?? THEME_DEFAULTS[key]
  }

  return { overrides, apply, setVar, reset, getVar }
}, {
  persist: {
    key: 'theme-store',
    storage: localStorage,
  }
})
