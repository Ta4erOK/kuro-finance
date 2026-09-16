<div align="center">

# KURO FINANCE

**Десктопный финансовый виджет для рабочего стола**

Учитывай ежедневные траты, копи в копилку и смотри на статистику — не выходя из одного маленького окна.

![Electron](https://img.shields.io/badge/Electron-32-47848F?logo=electron&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3-42B883?logo=vue.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![SQLite](https://img.shields.io/badge/better--sqlite3-11-003B57?logo=sqlite&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-4-FF6384?logo=chart.js&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white)

</div>

---

## О проекте

KURO FINANCE — это лёгкий виджет в стиле "ночного города": чёрная тема, минимум элементов, три рабочие зоны.

Код-нейм **Kuro** — в честь японского *"чёрный"* (黒). Черный чай, ночные покатушки и ровная аналитика по деньгам.

## Возможности

### 💸 Траты
- Ввод трат по категориям — категории создаёшь сам, под себя
- Комментарий к каждой трате
- Навигация по дням: вчера, позавчера — всё под рукой
- Итоговая сумма за день снизу

### 🏦 Копилка
- Фиксируй, сколько положил на счёт сегодня
- Общая сумма накоплений — всегда перед глазами
- История пополнений по дням

### 📊 Статистика
- Суммы и **процентное соотношение** трат vs накоплений
- Графики по **дням / неделям / месяцам** (Chart.js)
- Диаграмма по категориям — куда утекают деньги
- Итог трат за месяц и **средние траты в день**
- Сводка за текущий месяц прямо в шапке

### ⚙️ Настройки
- Месячный доход — чтобы видеть % от дохода
- **Виджет-режим**: компактное окно поверх всех окон
- **Автозапуск** с Windows (по умолчанию выключен)

## Скриншоты

| Траты | Копилка | Статистика |
|:---:|:---:|:---:|
| Ввод трат по категориям и итог дня | Накопления и их общая сумма | Суммы, проценты и графики |

## Технологии

| Слой | Технология |
|:---|:---|
| Десктоп | Electron 32 |
| Frontend | Vue 3 + Vite 5 |
| Графики | Chart.js 4 |
| База данных | better-sqlite3 (SQLite) |

## Запуск (development)

```bash
# 1. Установка зависимостей
npm install

# 2. better-sqlite3 — нативный модуль, пересборка под Electron
npx electron-rebuild -f -w better-sqlite3

# 3. Запуск (vite dev server + electron)
npm run dev
```

## Сборка установщика (Windows)

```bash
npm run build:win
```

Готовый установщик появится в папке `release/` — `kuro-finance-setup-1.0.0.exe`.

## Структура проекта

```
finance-widget/
├── build/                       # Иконки (SVG / PNG / ICO)
│   └── icon.svg                 # Исходник иконки
├── scripts/
│   └── gen-icons.cjs            # Генерация PNG/ICO из SVG
├── src/
│   ├── main/                    # Electron: main process + preload
│   │   ├── index.js             # Окно, IPC-хендлеры, настройки
│   │   └── preload.js           # Мостик между renderer и Node
│   ├── db/
│   │   └── database.js          # SQLite: категории, траты, копилка
│   └── renderer/                # Vue 3 приложение
│       ├── App.vue              # Каркас: шапка, сводка, табы
│       └── views/
│           ├── ExpensesView.vue # Вкладка «Траты»
│           ├── SavingsView.vue  # Вкладка «Копилка»
│           ├── StatsView.vue    # Вкладка «Статистика»
│           └── SettingsView.vue # Вкладка «Настройки»
├── index.html                   # Точка входа Vite
├── vite.config.mjs
└── package.json
```

## Данные

База данных — SQLite (`finance.db`).

| Режим | Расположение БД |
|:---|:---|
| Development | Корень проекта: `finance.db` |
| Production | `%APPDATA%/FinanceWidget/finance.db` |

БД создаётся автоматически при первом запуске.

## Иконка

Иконка рисуется из `build/icon.svg` скриптом `npm run gen:icons`. Тёмный градиент, ночной полумесяц и зелёный график роста — для тех, кто копит, а не спускает.

---

<div align="center">

**KURO FINANCE** · лучше утром, чем никогда · 黒

</div>