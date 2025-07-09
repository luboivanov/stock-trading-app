# FullStackStockApp

A full-stack, sessionless web application for optimal stock trading analysis, designed to be production ready and deployed on Render.com. The project features a React frontend, a NestJS backend, observability with Prometheus, and automated CI/CD with GitHub Actions.

---

## Important Links

- **Frontend (Production):** [https://stock-frontend-txmg.onrender.com/](https://stock-frontend-txmg.onrender.com/)
- **Backend (Production):** [https://stock-backend-gvvp.onrender.com/](https://stock-backend-gvvp.onrender.com/)
- **Best Trade API Example:** [https://stock-backend-gvvp.onrender.com/api/v1/best-trade?start=2025-07-01T10:00:00Z&end=2025-07-01T10:00:11Z](https://stock-backend-gvvp.onrender.com/api/v1/best-trade?start=2025-07-01T10:00:00Z&end=2025-07-01T10:00:11Z)
- **Backend Health Check:** [https://stock-backend-gvvp.onrender.com/api/health](https://stock-backend-gvvp.onrender.com/api/health)
- **Swagger UI:** [https://stock-backend-gvvp.onrender.com/api#/App/AppController_getBestTrade](https://stock-backend-gvvp.onrender.com/api#/App/AppController_getBestTrade)
- **API JSON:** [https://stock-backend-gvvp.onrender.com/api-json](https://stock-backend-gvvp.onrender.com/api-json)
- **Prometheus Metrics:** [https://stock-backend-gvvp.onrender.com/api/metrics](https://stock-backend-gvvp.onrender.com/api/metrics)
- **Architecture Diagram (Miro):** [https://miro.com/app/board/uXjVIgV7WOM=/](https://miro.com/app/board/uXjVIgV7WOM=/)
- **CI/CD Workflow (Miro):** [https://miro.com/app/board/uXjVIgVY4fU=/](https://miro.com/app/board/uXjVIgVY4fU=/)
- **GitHub Repository:** [https://github.com/luboivanov/stock-trading-app](https://github.com/luboivanov/stock-trading-app)
- **Requirements PDF:** [requirements/Full stack developer - Task (English).pdf](requirements/Full%20stack%20developer%20-%20Task%20(English).pdf)

---

## Project Overview (Requirements)

### Non-functional Requirements
- The solution is production ready, with CI/CD, observability, and secure secret management.

### Data
- The backend stores static price history for a stock, with a price value for every second in a known period (no database required).
- Data is continuous and covers a fixed interval (from - to).

### Functional Specification
- The main API receives a time slice (start and end time) and returns the most profitable "buy time" and "sell time" within that slice.
- Both points are within the query interval, and buy time is before sell time.
- If multiple solutions yield equal profit, the earliest and shortest is returned.

### API
- Accepts two time points (start, end) as parameters.
- Returns buy/sell points and their prices.
- Handles errors and invalid input gracefully.

### UI/UX
- Minimalistic, pleasant, and user-friendly interface.
- Allows selection of query time period and available funds.
- Query is triggered by a button.
- Results are displayed in a human-readable format: buy date, sell date, number of stocks bought/sold, and profit.

---

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Deployment Pipeline](#deployment-pipeline)
- [Features](#features)
- [Endpoints](#endpoints)
- [Monitoring & Observability](#monitoring--observability)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Architecture Overview

<img src="frontend/documentation/Architecture Diagram.jpg" alt="Architecture Diagram" style="max-width:100%; height:auto; display:block; margin:auto;" />

- **Frontend:** React app, served via Render CDN.
- **Backend:** NestJS API, exposes business logic, health checks, API docs and metrics endpoints.

[View the Architecture Diagram in Miro](https://miro.com/app/board/uXjVIgV7WOM=/)

---

## Deployment Pipeline

<img src="frontend/documentation/CI_CD Workflow.jpg" alt="CI/CD Workflow" style="max-width:100%; height:auto; display:block; margin:auto;" />

- Code is pushed to GitHub.
- GitHub Actions run lint, unit, and E2E tests.
- On success, Render.com auto-deploys frontend, backend, healthcheck.

[View the CI/CD Workflow in Miro](https://miro.com/app/board/uXjVIgVY4fU=/)

---

## Features
- Modern React frontend with date/time and fractional share support (bonus: fractional shares and date/time selector with seconds).
- NestJS backend with REST API, health checks, and Prometheus metrics.
- Unit tests: Frontend (97% coverage), Backend (93% coverage).
- E2E testing: Cypress, 5 tests.
- Automated CI/CD with GitHub Actions: builds, tests (unit & E2E), and deploys both frontend and backend; email notifications on failed tests.
- Automatically deployed in containers managed by Render (Docker-like).
- Ready for horizontal scaling via Render Dashboard (manual scaling up to 3 instances or auto-scaling with Pro pack).
- Automatic Reverse Proxy and CDN by Render: distributes static files globally, caches assets, and proxies HTTPS requests.
- Backend health checks at `/api/health` (TerminusModule); Render monitors and restarts backend if unresponsive.
- Swagger UI for API docs at `/api#/App/AppController_getBestTrade`.
- HTTPS enforced for all endpoints (backend, frontend, Swagger, health checks).
- Environment variables (e.g., `REACT_APP_API_URL`) for configuration.
- CORS enabled for cross-origin requests between frontend and backend.
- Linter (ESLint) and Prettier for code quality and formatting, covering frontend, backend, and E2E tests; integrated in CI workflow.
- Winston logger for backend events, errors, and auditing (see Render logs dashboard).
- Prometheus metrics exposed at `/api/metrics` for performance and health monitoring.
- Accessibility: basic keyboard-only navigation for users with motor disabilities.
- **Rate Limiting:** The backend uses global rate limiting (30 requests/minute per IP) via NestJS Throttler. Real client IPs are respected even behind proxies/CDNs (trust proxy enabled).


---

## Endpoints

**Backend (NestJS):**
- `/api/v1/best-trade` — Main trading API
- `/api/metrics` — Prometheus metrics
- `/api/health` — Health check
- `/api` — Swagger UI (API docs)

**Frontend (React):**
- Served as static files via CDN
- Calls backend APIs for trading logic

---

## Monitoring & Observability
- **Prometheus metrics** exposed at `/api/metrics` (backend)

---

## Local Development

### Backend
```sh
cd backend
npm install
npm run start:dev
```
- Swagger: [http://localhost:8000/api](http://localhost:8000/api)
- Health: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- Metrics: [http://localhost:8000/api/metrics](http://localhost:8000/api/metrics)

### Frontend
```sh
cd frontend
npm install
npm start
```
- App: [http://localhost:3001/](http://localhost:3001/)

### Run Cypress E2E Tests
```sh
cd frontend
npx cypress open   # for interactive UI
npx cypress run    # for headless/CI mode
```

### Run Linter (ESLint)
- **Backend:**
  ```sh
  cd backend
  npm run lint
  ```
- **Frontend:**
  ```sh
  cd frontend
  npm run lint
  ```

### Run Prettier (Code Formatter)
- **Backend:**
  ```sh
  cd backend
  npm run format
  ```
- **Frontend:**
  ```sh
  cd frontend
  npm run format
  ```


---

## Running Unit Tests

### Backend (NestJS)
```sh
cd backend
npm run test
npm run test:cov   # for coverage report
```
- Test results and coverage summary will be shown in the terminal.

### Frontend (React)
```sh
cd frontend
npm test
```
- Press `a` to run all tests, or follow prompts for specific files.
- Coverage report:
```sh
cd frontend
npm test -- --coverage
```
- Coverage summary will be shown in the terminal and a detailed HTML report will be generated in `frontend/coverage/`.


---

## Production Deployment
- All services are auto-deployed on Render.com after successful CI/CD.

---

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License
MIT
