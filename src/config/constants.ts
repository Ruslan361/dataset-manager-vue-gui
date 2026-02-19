export const APP_CONFIG = {
    name: 'Cicatrix Lucius',
    logo: '/logo2.png' // путь к логотипу в папке public
  } as const

  export const ASSETS = {
    placeholderDataset: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg width="300" height="200" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="300" height="200" fill="#F3F4F6"/>
    <rect x="120" y="70" width="60" height="60" stroke="#9CA3AF" stroke-width="2" fill="none" rx="8"/>
    <circle cx="140" cy="90" r="6" fill="#9CA3AF"/>
    <path d="M120 110 L135 95 L150 110 L165 95 L180 110 V130 H120 V110 Z" fill="#9CA3AF"/>
    <text x="150" y="155" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="#6B7280">
      Нет изображения
    </text>
  </svg>
    `)}`,
    placeholderAvatar: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="16" fill="#E5E7EB"/>
    <circle cx="16" cy="12" r="4" fill="#9CA3AF"/>
    <path d="M6 26c0-5.5 4.5-10 10-10s10 4.5 10 10" fill="#9CA3AF"/>
  </svg>
    `)}`
  } as const