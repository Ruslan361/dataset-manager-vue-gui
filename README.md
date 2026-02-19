# Dataset Manager — Vue GUI

Подробная документация по проекту "Dataset Manager" — Vue 3 приложение на Vite, предназначенное для управления наборами данных изображений, разметки и анализа (включая K-Means кластеризацию и ручную аннотацию).

Проект сочетает в себе UI для загрузки изображений, инструментов обрезки и визуальной разметки, анализа и экспорта/импорта разметки.

**Ключевые возможности**
- Загрузка изображений и создание наборов данных
- Просмотр и управление изображениями в наборе
- Инструменты обрезки и предварительной обработки изображений
- Поддержка импорта/экспорта разметки
- Аналитические модули: K-Means и ручной анализ
- Интеграция с Pinia для состояния, тесты на Vitest и E2E с Playwright

## Быстрый старт

Требования
- Node.js (см. `package.json` — поддерживаемые версии указаны в поле `engines`)
- npm или yarn

Установка зависимостей

```bash
npm install
# или
yarn install
```

Запуск в режиме разработки

```bash
npm run dev
```

Предпросмотр собранного приложения

```bash
npm run preview
```

Сборка для продакшена

```bash
npm run build
```

Установка браузеров для E2E (Playwright)

```bash
npx playwright install
```

Тесты

- Юнит-тесты (Vitest): `npm run test:unit`
- E2E (Playwright): `npm run test:e2e`

Линтинг и форматирование

```bash
npm run lint
npm run format
```

## Структура проекта (кратко)

- `src/` — исходники приложения
  - `api/` — модули доступа/обертки для работы с данными
    - `crop.ts` — логика/утилиты для операций обрезки изображений
    - `datasets.ts` — управление наборами данных (создание, удаление, список)
    - `images.ts` — загрузка/получение/удаление изображений в рамках наборов
    - `importer.ts` — импорт/экспорт разметки и данных
    - `kmeans.ts` — процедуры и обертки для K-Means анализа
    - `manual.ts` — вспомогательные функции для ручной разметки/анализа
  - `components/` — Vue-компоненты
    - `CreateDatasetModal.vue` — модальное окно создания набора
    - `ImageUploadModal.vue` — интерфейс загрузки изображений
    - `MarkupImporter.vue` — импорт разметки
    - `KMeans/*` — компоненты анализа K-Means
    - `manual/*` — компоненты для ручного анализа и взаимодействия с изображением
    - `common/` — переиспользуемые элементы UI (`Button.vue`, `Card.vue`, `ImageCard.vue` и т.д.)
  - `views/` — страницы/вьюхи приложения (`AnalysisView.vue`, `ImageView.vue`, `MainMenu.vue`...)
  - `stores/` — Pinia-хранилища (`user.ts`, `counter.ts`)
  - `router/` — маршруты приложения (`index.ts`)
  - `assets/` — CSS и статические ресурсы

Дополнительно в корне:
- `vite.config.ts`, `tsconfig*.json`, `playwright.config.ts`, `vitest.config.ts` — конфигурация инструментов разработки и тестирования

## Описание важных модулей

- `src/api/datasets.ts` — отвечает за CRUD-операции с наборами данных. Используйте его как точку интеграции с бэкендом или локальным хранилищем.
- `src/api/images.ts` — загрузка изображений, получение метаданных и миниатюр.
- `src/api/importer.ts` — преобразование форматов разметки при импорте/экспорте.
- `src/api/kmeans.ts` — подготовка данных, запуск кластеризации и возвращение результатов для визуализации.
- `src/components/ManualAnalysis.vue` и `src/components/manual/*` — интерактивные элементы для ручной разметки и анализа (таблицы яркости, кроппер, интерактивное изображение).

## Как пользоваться (короткая инструкция)

1. Создайте новый набор данных через UI (`CreateDatasetModal`).
2. Загрузите изображения (`ImageUploadModal`) — можно по одному или пачкой.
3. Откройте изображение в `ImageView` для обрезки/разметки.
4. Используйте `KMeansAnalysis` для быстрого кластерного анализа изображений.
5. Экспортируйте разметку через `MarkupImporter` или API-модуль экспорта.

## Разработка

- Код использует Vue 3 + Composition API и Pinia для состояния.
- TypeScript включён; для проверки типов используется `vue-tsc` (скрипт `type-check` в `package.json`).
- Рекомендуемый редактор — VS Code с расширением Volar.

Советы
- При добавлении новых API-модулей помещайте их в `src/api/` и пишите простые unit-тесты.
- Для управления состоянием используйте Pinia-модули в `src/stores/`.

## Тестирование

- Юнит-тесты располагаются рядом с компонентами (например, `src/components/__tests__/HelloWorld.spec.ts`).
- Для запуска E2E тестов убедитесь, что приложение собрано (в CI это обычно требуется), затем `npm run test:e2e`.

## CI / CI советы

- В CI: сначала `npm ci`, затем `npm run type-check`, `npm run build`, и уже после этого запуск E2E тестов (`npx playwright install --with-deps` при необходимости).

## Вклад и разработка

Если вы хотите внести изменения:

1. Сделайте fork и создайте ветку feature/bugfix.
2. Добавьте тесты для нового функционала.
3. Откройте Pull Request с описанием изменений.

## Примечания по окружению

- В `package.json` указаны двигатели Node.js; используйте рекомендуемую версию.
- В проекте присутствуют зависимости для Tauri (`@tauri-apps/*`) — это указывает на возможность упаковки под десктоп, но инструкции по сборке Tauri вынесены за рамки данного README.

## Лицензия

В `package.json` поле `license` не указано. Если вы хотите опубликовать проект, добавьте подходящую лицензию (`MIT`, `Apache-2.0` и т.д.) в `package.json` и файл `LICENSE`.

## Контакты и дальнейшие шаги

- Если нужно, могу:
  - Добавить примеры API вызовов и формат обмена данными (JSON схемы).
  - Написать CONTRIBUTING.md с правилами коммитов и PR.
  - Подготовить инструкцию по упаковке с Tauri.

---

README подготовлен автоматически. Скажите, хотите ли вы более подробный раздел по одному из компонентов или пример интеграции с бэкендом?
# vue-test

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) 
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
npx playwright install

# When testing on CI, must build the project first
npm run build

# Runs the end-to-end tests
npm run test:e2e
# Runs the tests only on Chromium
npm run test:e2e -- --project=chromium
# Runs the tests of a specific file
npm run test:e2e -- tests/example.spec.ts
# Runs the tests in debug mode
npm run test:e2e -- --debug
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
