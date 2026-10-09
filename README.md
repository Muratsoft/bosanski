# Bosanski — BCS Dil Öğrenme Platformu

NestJS API + (yakında) Next.js web. Faz 0: auth, roller, admin iskeleti.

## Hızlı başlangıç

Şu an geliştirme **SQLite** ile çalışır (Docker gerekmez). Prod için `docker-compose.yml` içinde Postgres hazır.

```bash
cd apps/api
npm install
npx prisma migrate dev
npm run prisma:seed
npm run start:dev
```

API: http://localhost:3001/api  
Web: http://localhost:3000  
Health: http://localhost:3001/api/health

```bash
# ayrı terminallerde
npm run dev:api
npm run dev:web
```

### Seed admin
- E-posta: `admin@bosanski.local`
- Şifre: `Admin123!`

### Postgres'e geçiş (ileride)
1. Docker Desktop aç → `docker compose up -d postgres`
2. `schema.prisma` datasource → `postgresql`
3. `.env` içinde `DATABASE_URL` → postgres connection string
4. `npx prisma migrate dev`

## Auth endpointleri

| Method | Path | Açıklama |
|--------|------|----------|
| POST | `/api/auth/register` | Kayıt |
| POST | `/api/auth/login` | Giriş |
| POST | `/api/auth/forgot-password` | Şifre sıfırlama maili |
| POST | `/api/auth/reset-password` | Token ile şifre yenile |
| POST | `/api/auth/refresh` | Access token yenile |
| GET | `/api/auth/me` | Oturumdaki kullanıcı |
| GET | `/api/auth/google` | Google OAuth (env gerekir) |
| GET | `/api/auth/facebook` | Facebook OAuth (env gerekir) |

## Admin

Bearer token + `SUPER_ADMIN` / `MODERATOR` rolü gerekir.

- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/role` (sadece SUPER_ADMIN)
- `PATCH /api/admin/users/:id/status` (sadece SUPER_ADMIN — ödeme sonrası ACTIVE)

## Roller

`SUPER_ADMIN` → `MODERATOR` → `TEACHER` → `STUDENT` → `MEMBER`

Yeni kayıtlar `MEMBER` + `PENDING` gelir; ödeme onayı sonrası admin `ACTIVE` + `STUDENT` yapar.
