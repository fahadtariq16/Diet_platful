# Plateful

Track what you eat, see it on a graph, and learn how to balance your diet.

- **Frontend:** React 18 + Vite, React Router, Recharts (charts), Framer Motion (animations)
- **Backend:** Node.js + Express, SQLite (better-sqlite3), JWT in an httpOnly cookie, zod validation
- **Tests:** Vitest + Supertest (22 tests: nutrition maths + API)

## Run it

Requires Node 20.6 or newer.

```bash
npm run install:all          # installs root, server and client packages
cp server/.env.example server/.env
npm run dev                  # API on :4000, React app on :5173
```

Open http://localhost:5173. Vite forwards `/api` to Express, so the auth cookie just works.

```bash
npm test                     # backend tests
npm run build && npm start   # production: Express serves the built React app on :4000
```

In production set `JWT_SECRET` to a long random string; the server refuses to start without one.

## What's in it

| Area | Page | API |
|---|---|---|
| Accounts | `/register`, `/login` | `POST /api/auth/register`, `/login`, `/logout`, `GET /api/auth/me` |
| Daily log | `/app` | `GET/POST /api/me/logs`, `DELETE /api/me/logs/:id`, `GET/POST /api/me/foods` |
| Charts (day / week / month) | `/app/trends` | `GET /api/me/summary?from&to` |
| Balance guide + personal check | `/balance` | `GET /api/guide`, `GET /api/me/insights/balance?from&to` |
| Goal pathway + weigh-ins | `/app/pathway` | `GET/PUT /api/me/profile`, `GET/POST /api/me/weigh-ins` |
| Weekly meal plan | `/app/plan` | `GET /api/me/plan`, `PUT /api/me/plan/:weekday/:meal`, `POST /api/me/plan/apply` |
| Reviews | `/reviews` | `GET /api/reviews` (public), `GET/PUT/DELETE /api/reviews/me` |

## How the numbers work

All of it lives in `server/src/lib/nutrition.js` (pure functions, fully tested).

- **Calorie target:** Mifflin–St Jeor BMR × activity level. Losing: −550 kcal/day (~0.5 kg/week), never below 1,200 (women) / 1,500 (men). Gaining: +275 kcal/day (~0.25 kg/week).
- **Macros:** protein 1.6 g/kg, fat 28% of calories, carbs the rest. Fibre 14 g per 1,000 kcal.
- **Balance score (0–100):** average of 7 checks on your logged days: calories within ±10% of target, protein, carbs 45–65%, fat 20–35%, fibre, vegetables (3+ servings), fruit (2+). Each miss produces a tip and food suggestions from the library.
- **Food groups:** every food has `servings` (veg, fruit, grains, protein, dairy) so mixed dishes like biryani count toward several groups.

Log entries copy the food's values at log time, so editing a food never rewrites your history.

## Known limits (read before going public)

- **Food data is 44 hand-entered averages.** For real users, import a proper source (USDA FoodData Central or Open Food Facts) into the `foods` table.
- **SQLite is a single file.** Fine for one server. For several instances, move to Postgres; the SQL is plain and ports easily.
- **Reviews have no moderation.** One review per account and rate limits help, but add a report/hide flow before launch.
- **No email verification or password reset.**
- **Health:** targets are estimates, not medical advice. The app shows this, but get the wording checked if you launch it.
