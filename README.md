# BirdBot

Встраиваемый виджет чата поддержки. Спецификация: [SPEC.md](./SPEC.md).

## Стек

TypeScript (strict), Express, React 17, antd 4, MongoDB, Telegram.

Один `package.json`, исходники в `src/`:

| Папка | Назначение |
|-------|------------|
| `src/server/` | API, MongoDB, Telegram worker, раздача статики |
| `src/widget/` | React-виджет (iframe) |
| `src/embed/` | SDK для host-приложений → `dist/embed/v1.js` |
| `demo/` | Демо host-приложение → `/demo/` |

## Быстрый старт (локально)

### 1. MongoDB

Локально на `localhost:27017` или только контейнер:

```bash
docker compose up mongo -d
```

### 2. Установка и запуск

```bash
npm install
copy .env.example .env
npm run dev
```

Сервер: **http://localhost:4100**

| URL | Назначение |
|-----|------------|
| `/api/v1/*` | REST API |
| `/widget/` | UI виджета |
| `/embed/v1.js` | SDK |
| `/demo/` | Демо host-приложение |

### Пересборка после правок

```bash
npm run build:widget   # UI
npm run build:embed    # SDK
npm run build:server   # API
# или всё сразу:
npm run build
```

Затем `npm run dev` или `npm start`.

## Docker

```bash
docker compose up --build
```

## Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `PORT` | HTTP-порт | `4100` |
| `MONGO_URL` | MongoDB | `mongodb://localhost:27017/birdbot` |
| `JWT_SECRET` | Секрет для проверки JWT Databird | — |
| `JWT_USER_ID_CLAIM` | Поле userId в JWT | `id` |
| `DEMO_JWT` | JWT для страницы `/demo/` | — |
| `TELEGRAM_BOT_TOKEN` | Токен бота | — |
| `TELEGRAM_GROUP_ID` | ID группы поддержки | — |

Полный список: `.env.example`.
