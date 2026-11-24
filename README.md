# GoStack Flow

WEB INTERAKTIF BELAJAR BACKEND GO — FOKUS WORKFLOW, VISUALISASI STEP-BY-STEP, DAN CODING LAB.

## Stack yang Dipelajari

- **GO + CHI**: HTTP ROUTER · MIDDLEWARE · CONTEXT
- **AUTH + RBAC**: BCRYPT · JWT HS256 · REDIS DENYLIST · ROLE MATRIX
- **MYSQL + REDIS**: CACHE-ASIDE · TTL · WRITE INVALIDATION
- **ASYNQ**: REDIS TASK QUEUE · PRIORITY · RETRY BACKOFF · DLQ
- **GIT + DOCKER COMPOSE + CADDY**: MULTI-STAGE BUILD · HEALTHCHECK · AUTO HTTPS PROXY

## 5 Modul Workflow

1. **01. HTTP + Chi Router**: `CLIENT → CADDY → RECOVERER → RATE LIMIT → CHI MUX → HANDLER → JSON`
2. **02. AuthN + AuthZ + RBAC**: `LOGIN → JWT SIGN → AUTHN → REDIS DENYLIST → CONTEXT → RBAC → API`
3. **03. MySQL + Redis Cache-Aside**: `HANDLER → REDIS GET → MYSQL QUERY → REDIS SETEX/DEL → JSON`
4. **04. Asynq Background Worker**: `HTTP 202 → ASYNQ ENQUEUE → REDIS QUEUE → WORKER → DONE / RETRY / DLQ`
5. **05. Git + Docker Compose + Caddy**: `GIT PUSH → DOCKER BUILD → HEALTHCHECK → GO API → CADDY HTTPS`

## Struktur Proyek

```text
src/
├── data/workflows.ts                  # Definisi step, skenario, & stack map
├── components/
│   ├── WorkflowVisualizer.tsx         # Diagram alur interaktif + playback
│   ├── CodingLab.tsx                  # Lab eksperimen Chi, RBAC, Cache, Asynq, Deploy
│   ├── StackArchitectureMap.tsx       # Peta 9 komponen dalam 4 layer
│   └── SequenceCheatSheet.tsx         # Ringkasan urutan langkah inti
└── App.tsx
```

## Jalankan Lokal

```bash
npm install
npm run dev      # Dev server di http://localhost:3000
npm run lint     # Type-check TypeScript
npm run build    # Build produksi
```
