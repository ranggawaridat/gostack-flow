export type WorkflowId = 'chi' | 'auth' | 'cache' | 'asynq' | 'deploy';

export type NodeStatus = 'nominal' | 'active' | 'warning' | 'error';

export interface WorkflowNode {
  id: string;
  step: string;
  layer: string;
  core: string;
  io: string;
  latency: string;
  codeSnippet: string;
  statusOnScenario?: Record<string, NodeStatus>;
  ioOnScenario?: Record<string, string>;
  coreOnScenario?: Record<string, string>;
}

export interface WorkflowScenario {
  id: string;
  label: string;
  outcome: string;
  outcomeType: 'nominal' | 'warning' | 'error';
  activeSteps: string[];
  packet: {
    input: string;
    context: string;
    output: string;
  };
}

export interface WorkflowModule {
  id: WorkflowId;
  index: string;
  title: string;
  essence: string;
  stackTags: string[];
  nodes: WorkflowNode[];
  scenarios: WorkflowScenario[];
}

export const WORKFLOW_MODULES: WorkflowModule[] = [
  {
    id: 'chi',
    index: '01',
    title: 'HTTP + Chi Router',
    essence: 'URUTAN REQUEST MASUK SAMPAI RESPONSE',
    stackTags: ['CADDY', 'GO 1.23', 'CHI V5', 'MIDDLEWARE'],
    nodes: [
      {
        id: 'client',
        step: '01',
        layer: 'CLIENT',
        core: 'SEND HTTPS REQUEST',
        io: 'GET /api/users/42',
        latency: '0.0ms',
        codeSnippet: 'curl -i https://api.app.id/api/users/42',
      },
      {
        id: 'caddy',
        step: '02',
        layer: 'CADDY',
        core: 'AUTO TLS · PROXY PASS',
        io: ':443 HTTPS → :8080 HTTP',
        latency: '0.8ms',
        codeSnippet: 'reverse_proxy api:8080',
      },
      {
        id: 'mw-recover',
        step: '03',
        layer: 'MW: RECOVERER',
        core: 'CATCH PANIC → 500',
        io: 'DEFER RECOVER()',
        latency: '0.1ms',
        codeSnippet: 'r.Use(middleware.Recoverer)',
        statusOnScenario: { panic: 'warning', ratelimit: 'nominal' },
        ioOnScenario: { panic: 'PANIC CAUGHT → 500 JSON' },
      },
      {
        id: 'mw-rate',
        step: '04',
        layer: 'MW: RATE LIMIT',
        core: 'TOKEN BUCKET CHECK',
        io: 'REQ 1/10 → PASS',
        latency: '0.3ms',
        codeSnippet: 'r.Use(httprate.LimitByIP(10, time.Minute))',
        statusOnScenario: { ratelimit: 'error' },
        ioOnScenario: { ratelimit: 'REQ 11/10 → BLOCK 429' },
        coreOnScenario: { ratelimit: 'LIMIT EXCEEDED · 429' },
      },
      {
        id: 'chi-mux',
        step: '05',
        layer: 'CHI ROUTER',
        core: 'RADIX TREE MATCH',
        io: 'PARAM {id} = "42"',
        latency: '0.1ms',
        codeSnippet: 'r.Get("/api/users/{id}", h.GetUser)',
      },
      {
        id: 'handler',
        step: '06',
        layer: 'GO HANDLER',
        core: 'PARSE · QUERY · JSON',
        io: 'chi.URLParam(r, "id")',
        latency: '4.2ms',
        codeSnippet: 'id := chi.URLParam(r, "id")\nuser, err := repo.Find(ctx, id)',
        statusOnScenario: { panic: 'error' },
        ioOnScenario: { panic: 'NIL POINTER PANIC!' },
      },
      {
        id: 'response',
        step: '07',
        layer: 'HTTP RESPONSE',
        core: 'WRITE STATUS + BODY',
        io: '200 OK · JSON',
        latency: '5.5ms',
        codeSnippet: 'render.JSON(w, r, user)',
        statusOnScenario: { panic: 'error', ratelimit: 'error' },
        ioOnScenario: { panic: '500 INTERNAL ERROR', ratelimit: '429 TOO MANY REQUESTS' },
        coreOnScenario: { panic: 'RECOVERED · SAFE EXIT', ratelimit: 'REJECTED AT EDGE' },
      },
    ],
    scenarios: [
      {
        id: 'valid',
        label: 'VALID GET',
        outcome: '200 OK · ROUTE MATCHED',
        outcomeType: 'nominal',
        activeSteps: ['client', 'caddy', 'mw-recover', 'mw-rate', 'chi-mux', 'handler', 'response'],
        packet: {
          input: 'GET /api/users/42 · IP 103.12.4.8',
          context: 'chi.URLParam("id")="42" · Bucket=9 left',
          output: '200 OK · {"id":42,"role":"admin"}',
        },
      },
      {
        id: 'ratelimit',
        label: 'RATE LIMIT 429',
        outcome: '429 BLOCKED · BEFORE ROUTER',
        outcomeType: 'error',
        activeSteps: ['client', 'caddy', 'mw-recover', 'mw-rate', 'response'],
        packet: {
          input: 'GET /api/users/42 · BURST 11/10',
          context: 'MW:RATE_LIMIT STOP · HANDLER SKIPPED',
          output: '429 TOO MANY REQUESTS · Retry-After: 60',
        },
      },
      {
        id: 'panic',
        label: 'PANIC RECOVER',
        outcome: '500 SAFE · SERVER TETAP HIDUP',
        outcomeType: 'warning',
        activeSteps: ['client', 'caddy', 'mw-recover', 'mw-rate', 'chi-mux', 'handler', 'mw-recover', 'response'],
        packet: {
          input: 'GET /api/panic-test',
          context: 'RUNTIME PANIC → DEFER Recoverer()',
          output: '500 INTERNAL SERVER ERROR · NO CRASH',
        },
      },
    ],
  },
  {
    id: 'auth',
    index: '02',
    title: 'AuthN + AuthZ + RBAC',
    essence: 'SIAPA KAMU (AUTHN) VS BOLEH APA (RBAC)',
    stackTags: ['JWT HS256', 'BCRYPT', 'REDIS SESSION', 'RBAC MATRIX'],
    nodes: [
      {
        id: 'login',
        step: '01',
        layer: 'AUTHN: LOGIN',
        core: 'VERIFY BCRYPT HASH',
        io: 'EMAIL + PASS → OK',
        latency: '65ms',
        codeSnippet: 'bcrypt.CompareHashAndPassword(hash, pass)',
      },
      {
        id: 'jwt-sign',
        step: '02',
        layer: 'JWT SIGN',
        core: 'ISSUE ACCESS TOKEN',
        io: 'CLAIMS{sub:42, role}',
        latency: '0.4ms',
        codeSnippet: 'token.SignedString(jwtSecret)',
      },
      {
        id: 'mw-authn',
        step: '03',
        layer: 'MW: AUTHN',
        core: 'PARSE & VERIFY JWT',
        io: 'BEARER → VALID?',
        latency: '0.2ms',
        codeSnippet: 'jwt.ParseWithClaims(hdr, &Claims{}, keyFn)',
        statusOnScenario: { expired: 'error' },
        ioOnScenario: { expired: 'EXP < NOW → 401' },
        coreOnScenario: { expired: 'TOKEN EXPIRED · 401' },
      },
      {
        id: 'redis-rev',
        step: '04',
        layer: 'REDIS DENYLIST',
        core: 'CHECK TOKEN REVOKED',
        io: 'EXISTS jti:991 → 0',
        latency: '0.6ms',
        codeSnippet: 'rdb.Exists(ctx, "revoked:"+claims.ID)',
        statusOnScenario: { revoked: 'error' },
        ioOnScenario: { revoked: 'EXISTS jti:991 → 1 (REVOKED)' },
        coreOnScenario: { revoked: 'LOGOUT BLACKLIST · 401' },
      },
      {
        id: 'ctx-inject',
        step: '05',
        layer: 'CONTEXT',
        core: 'INJECT USER + ROLE',
        io: 'ctx = WithUser(role)',
        latency: '0.1ms',
        codeSnippet: 'ctx = context.WithValue(r.Context(), RoleKey, claims.Role)',
      },
      {
        id: 'rbac',
        step: '06',
        layer: 'AUTHZ: RBAC',
        core: 'CHECK ROLE PERMISSION',
        io: 'ROLE vs ACTION',
        latency: '0.1ms',
        codeSnippet: 'if !rbac.Allow(role, "users:delete") { return 403 }',
        statusOnScenario: { forbidden: 'error' },
        ioOnScenario: { forbidden: 'viewer != users:delete → 403' },
        coreOnScenario: { forbidden: 'ACCESS DENIED · 403' },
      },
      {
        id: 'exec',
        step: '07',
        layer: 'PROTECTED API',
        core: 'EXECUTE RESOURCE',
        io: '200 OK · ALLOWED',
        latency: '3.1ms',
        codeSnippet: 'DELETE FROM users WHERE id = ?',
        statusOnScenario: { forbidden: 'error', expired: 'error', revoked: 'error' },
        ioOnScenario: {
          forbidden: '403 FORBIDDEN',
          expired: '401 UNAUTHORIZED',
          revoked: '401 TOKEN REVOKED',
        },
        coreOnScenario: {
          forbidden: 'AUTHZ BLOCKED',
          expired: 'AUTHN REJECTED',
          revoked: 'SESSION INVALID',
        },
      },
    ],
    scenarios: [
      {
        id: 'admin',
        label: 'ADMIN ALLOW (200)',
        outcome: '200 OK · AUTHN + RBAC PASS',
        outcomeType: 'nominal',
        activeSteps: ['login', 'jwt-sign', 'mw-authn', 'redis-rev', 'ctx-inject', 'rbac', 'exec'],
        packet: {
          input: 'DELETE /api/users/42 · Role: ADMIN',
          context: 'JWT VALID · Not Revoked · RBAC[admin].users:delete = TRUE',
          output: '200 OK · USER DELETED',
        },
      },
      {
        id: 'forbidden',
        label: 'VIEWER DENY (403)',
        outcome: '403 FORBIDDEN · AUTHN OK, RBAC DENY',
        outcomeType: 'error',
        activeSteps: ['login', 'jwt-sign', 'mw-authn', 'redis-rev', 'ctx-inject', 'rbac', 'exec'],
        packet: {
          input: 'DELETE /api/users/42 · Role: VIEWER',
          context: 'JWT VALID · RBAC[viewer].users:delete = FALSE',
          output: '403 FORBIDDEN · INSUFFICIENT ROLE',
        },
      },
      {
        id: 'expired',
        label: 'EXPIRED JWT (401)',
        outcome: '401 UNAUTHORIZED · GAGAL DI AUTHN',
        outcomeType: 'error',
        activeSteps: ['mw-authn', 'exec'],
        packet: {
          input: 'GET /api/posts · exp: 10m ago',
          context: 'AUTHN FAILED · RBAC TIDAK DIJALANKAN',
          output: '401 UNAUTHORIZED · TOKEN EXPIRED',
        },
      },
      {
        id: 'revoked',
        label: 'REVOKED REDIS (401)',
        outcome: '401 LOGOUT · TOKEN DI BLACKLIST REDIS',
        outcomeType: 'error',
        activeSteps: ['mw-authn', 'redis-rev', 'exec'],
        packet: {
          input: 'GET /api/posts · jti: 991',
          context: 'JWT SIGNATURE OK · REDIS revoked:991 = TRUE',
          output: '401 UNAUTHORIZED · SESSION REVOKED',
        },
      },
    ],
  },
  {
    id: 'cache',
    index: '03',
    title: 'MySQL + Redis Cache-Aside',
    essence: 'CEK RAM DULU, BARU DISK MYSQL',
    stackTags: ['REDIS 7', 'MYSQL 8', 'CACHE-ASIDE', 'INVALIDATION'],
    nodes: [
      {
        id: 'req',
        step: '01',
        layer: 'API HANDLER',
        core: 'RECEIVE READ/WRITE',
        io: 'GET /products/7',
        latency: '0.1ms',
        codeSnippet: 'key := "product:" + id',
        ioOnScenario: { write: 'PUT /products/7 (price=99)' },
      },
      {
        id: 'redis-get',
        step: '02',
        layer: 'REDIS GET',
        core: 'IN-MEMORY LOOKUP',
        io: 'GET product:7',
        latency: '0.5ms',
        codeSnippet: 'val, err := rdb.Get(ctx, key).Result()',
        statusOnScenario: { miss: 'warning', write: 'nominal' },
        ioOnScenario: {
          hit: 'HIT → JSON STRING',
          miss: 'redis.Nil → CACHE MISS',
          write: 'SKIP READ · GO TO DB',
        },
        coreOnScenario: {
          hit: 'CACHE HIT · 0.5ms',
          miss: 'CACHE MISS · FALLBACK',
          write: 'WRITE PATH',
        },
      },
      {
        id: 'mysql',
        step: '03',
        layer: 'MYSQL 8',
        core: 'PRIMARY KEY QUERY',
        io: 'SELECT * WHERE id=7',
        latency: '18.4ms',
        codeSnippet: 'db.QueryRowContext(ctx, "SELECT id,name,price FROM products WHERE id=?", id)',
        ioOnScenario: { write: 'UPDATE products SET price=99' },
        coreOnScenario: { write: 'COMMIT SQL ROW' },
      },
      {
        id: 'redis-set',
        step: '04',
        layer: 'REDIS SETEX / DEL',
        core: 'SYNC CACHE STATE',
        io: 'SETEX product:7 60s',
        latency: '0.6ms',
        codeSnippet: 'rdb.Set(ctx, key, jsonBytes, 60*time.Second)',
        ioOnScenario: { write: 'DEL product:7 (INVALIDATE)' },
        coreOnScenario: { write: 'EVICT STALE KEY' },
      },
      {
        id: 'res',
        step: '05',
        layer: 'JSON RESPONSE',
        core: 'RETURN TO CLIENT',
        io: '200 OK · 1.1ms',
        latency: '1.1ms',
        codeSnippet: 'w.Header().Set("X-Cache", cacheStatus)',
        ioOnScenario: {
          hit: '200 OK · X-Cache: HIT (1.1ms)',
          miss: '200 OK · X-Cache: MISS (19.6ms)',
          write: '200 OK · CACHE CLEANED',
        },
      },
    ],
    scenarios: [
      {
        id: 'hit',
        label: 'CACHE HIT (1ms)',
        outcome: '200 OK · MYSQL TIDAK DISENTUH',
        outcomeType: 'nominal',
        activeSteps: ['req', 'redis-get', 'res'],
        packet: {
          input: 'GET /products/7',
          context: 'REDIS HIT · MYSQL QUERIES: 0',
          output: '200 OK · {"id":7,"price":75} · 1.1ms',
        },
      },
      {
        id: 'miss',
        label: 'CACHE MISS (19ms)',
        outcome: '200 OK · BACA MYSQL → SIMPAN REDIS',
        outcomeType: 'warning',
        activeSteps: ['req', 'redis-get', 'mysql', 'redis-set', 'res'],
        packet: {
          input: 'GET /products/7',
          context: 'REDIS MISS → MYSQL READ → SETEX 60s',
          output: '200 OK · CACHE WARMED · 19.6ms',
        },
      },
      {
        id: 'write',
        label: 'WRITE INVALIDATION',
        outcome: '200 OK · UPDATE MYSQL → DEL REDIS KEY',
        outcomeType: 'nominal',
        activeSteps: ['req', 'mysql', 'redis-set', 'res'],
        packet: {
          input: 'PUT /products/7 {"price":99}',
          context: 'MYSQL COMMIT → REDIS DEL product:7',
          output: '200 OK · NO STALE DATA',
        },
      },
    ],
  },
  {
    id: 'asynq',
    index: '04',
    title: 'Asynq Background Worker',
    essence: 'HTTP CEPAT PULANG, TUGAS BERAT DI ANTREAN',
    stackTags: ['GO', 'ASYNQ', 'REDIS QUEUE', 'WORKER POOL'],
    nodes: [
      {
        id: 'http-post',
        step: '01',
        layer: 'CHI HANDLER',
        core: 'SAVE ORDER TO DB',
        io: 'POST /orders → COMMIT',
        latency: '8.2ms',
        codeSnippet: 'orderID, err := repo.CreateOrder(ctx, req)',
      },
      {
        id: 'enqueue',
        step: '02',
        layer: 'ASYNQ CLIENT',
        core: 'ENQUEUE TASK + RETRY',
        io: 'email:receipt · Q:critical',
        latency: '0.9ms',
        codeSnippet: 'client.Enqueue(task, asynq.Queue("critical"), asynq.MaxRetry(3))',
      },
      {
        id: 'http-ack',
        step: '03',
        layer: 'FAST HTTP 202',
        core: 'RETURN IMMEDIATELY',
        io: '202 ACCEPTED · 9.5ms',
        latency: '9.5ms',
        codeSnippet: 'w.WriteHeader(http.StatusAccepted)',
      },
      {
        id: 'redis-q',
        step: '04',
        layer: 'REDIS QUEUE',
        core: 'PRIORITY QUEUE BUFFER',
        io: 'critical(6) > default(3)',
        latency: '0.4ms',
        codeSnippet: 'Queues: map[string]int{"critical": 6, "default": 3}',
      },
      {
        id: 'worker',
        step: '05',
        layer: 'ASYNQ WORKER',
        core: 'CONCURRENT GOROUTINES',
        io: 'EXEC SendEmail()',
        latency: '320ms',
        codeSnippet: 'mux.HandleFunc("email:receipt", SendEmailTask)',
        statusOnScenario: { retry: 'warning', dlq: 'error' },
        ioOnScenario: {
          retry: 'SMTP TIMEOUT → RETRY 1/3',
          dlq: 'RETRY 3/3 FAILED → ARCHIVE',
        },
        coreOnScenario: {
          retry: 'EXPONENTIAL BACKOFF',
          dlq: 'MOVED TO DEAD LETTER',
        },
      },
      {
        id: 'done',
        step: '06',
        layer: 'TASK STATE',
        core: 'COMPLETED / ARCHIVED',
        io: 'STATE: COMPLETED',
        latency: '330ms',
        codeSnippet: 'return nil // ack & delete from active queue',
        statusOnScenario: { retry: 'warning', dlq: 'error' },
        ioOnScenario: {
          retry: 'SCHEDULED +15s',
          dlq: 'ARCHIVED (INSPECT IN UI)',
        },
      },
    ],
    scenarios: [
      {
        id: 'ok',
        label: 'JOB SUCCESS',
        outcome: '202 FAST HTTP · WORKER COMPLETED',
        outcomeType: 'nominal',
        activeSteps: ['http-post', 'enqueue', 'http-ack', 'redis-q', 'worker', 'done'],
        packet: {
          input: 'POST /orders · Task: email:receipt',
          context: 'HTTP RETURNED IN 9.5ms · WORKER ASYNC 320ms',
          output: 'JOB COMPLETED · EMAIL SENT',
        },
      },
      {
        id: 'retry',
        label: 'AUTO RETRY',
        outcome: 'RETRY BACKOFF · HTTP TETAP 202',
        outcomeType: 'warning',
        activeSteps: ['http-post', 'enqueue', 'http-ack', 'redis-q', 'worker', 'done'],
        packet: {
          input: 'Task: email:receipt · Attempt 1/3',
          context: 'SMTP 504 TIMEOUT → RETRY IN 15s',
          output: 'STATE: RETRY · NO DATA LOST',
        },
      },
      {
        id: 'dlq',
        label: 'DEAD LETTER',
        outcome: 'MAX RETRY HABIS · MASUK ARCHIVE',
        outcomeType: 'error',
        activeSteps: ['redis-q', 'worker', 'done'],
        packet: {
          input: 'Task: email:receipt · Attempt 3/3',
          context: 'ALL RETRIES EXHAUSTED',
          output: 'ARCHIVED IN DLQ · READY FOR MANUAL REPLAY',
        },
      },
    ],
  },
  {
    id: 'deploy',
    index: '05',
    title: 'Git + Docker Compose + Caddy',
    essence: 'CODE PUSH SAMPAI LIVE HTTPS',
    stackTags: ['GIT', 'DOCKER COMPOSE', 'HEALTHCHECK', 'CADDY'],
    nodes: [
      {
        id: 'git',
        step: '01',
        layer: 'GIT WORKFLOW',
        core: 'COMMIT & PUSH MAIN',
        io: 'git push origin main',
        latency: '1.2s',
        codeSnippet: 'git add . && git commit -m "feat: rbac" && git push',
      },
      {
        id: 'build',
        step: '02',
        layer: 'DOCKER BUILD',
        core: 'MULTI-STAGE GO BINARY',
        io: 'golang:1.23 → alpine 18MB',
        latency: '6.4s',
        codeSnippet: 'FROM golang:1.23-alpine AS builder\nRUN go build -o /app/api',
      },
      {
        id: 'infra',
        step: '03',
        layer: 'MYSQL + REDIS',
        core: 'BOOT & HEALTHCHECK',
        io: 'STATUS: HEALTHY',
        latency: '4.0s',
        codeSnippet: 'healthcheck:\n  test: ["CMD", "mysqladmin", "ping"]',
        statusOnScenario: { nohealth: 'error' },
        ioOnScenario: { nohealth: 'MYSQL MASIH BOOTING...' },
        coreOnScenario: { nohealth: 'PORT 3306 BELUM SIAP!' },
      },
      {
        id: 'api',
        step: '04',
        layer: 'GO API + WORKER',
        core: 'DEPENDS_ON HEALTHY',
        io: 'CONNECT MYSQL + REDIS',
        latency: '0.8s',
        codeSnippet: 'depends_on:\n  mysql:\n    condition: service_healthy',
        statusOnScenario: { nohealth: 'error' },
        ioOnScenario: { nohealth: 'PANIC: CONNECTION REFUSED!' },
        coreOnScenario: { nohealth: 'CRASH LOOP · EXIT 1' },
      },
      {
        id: 'caddy-edge',
        step: '05',
        layer: 'CADDY SERVER',
        core: 'AUTO HTTPS + PROXY',
        io: 'api.domain.com → api:8080',
        latency: '0.5s',
        codeSnippet: 'api.domain.com {\n  reverse_proxy api:8080\n}',
      },
    ],
    scenarios: [
      {
        id: 'healthy',
        label: 'HEALTHY DEPLOY',
        outcome: 'LIVE HTTPS · ZERO CRASH',
        outcomeType: 'nominal',
        activeSteps: ['git', 'build', 'infra', 'api', 'caddy-edge'],
        packet: {
          input: 'git push → docker compose up -d',
          context: 'MYSQL HEALTHY → API BOOT → CADDY TLS',
          output: 'HTTPS://API.DOMAIN.COM READY',
        },
      },
      {
        id: 'nohealth',
        label: 'NO HEALTHCHECK',
        outcome: 'CRASH LOOP · API START SEBELUM MYSQL SIAP',
        outcomeType: 'error',
        activeSteps: ['git', 'build', 'infra', 'api'],
        packet: {
          input: 'depends_on: [mysql] (tanpa condition)',
          context: 'API START 0.2s · MYSQL READY 4.0s',
          output: 'EXIT CODE 1 · dial tcp mysql:3306 refused',
        },
      },
    ],
  },
];

export interface StackNodeInfo {
  id: string;
  name: string;
  role: string;
  zone: 'DEPLOY' | 'EDGE' | 'CORE' | 'DATA';
  workflowId: WorkflowId;
}

export const STACK_MAP_NODES: StackNodeInfo[] = [
  { id: 'git', name: 'Git', role: 'VERSION & PUSH', zone: 'DEPLOY', workflowId: 'deploy' },
  { id: 'docker', name: 'Docker Compose', role: 'ORCHESTRATE CONTAINERS', zone: 'DEPLOY', workflowId: 'deploy' },
  { id: 'caddy', name: 'Caddy', role: 'AUTO TLS · REVERSE PROXY', zone: 'EDGE', workflowId: 'chi' },
  { id: 'go', name: 'Go', role: 'CONCURRENT RUNTIME', zone: 'CORE', workflowId: 'chi' },
  { id: 'chi', name: 'Chi Router', role: 'MIDDLEWARE + RADIX MUX', zone: 'CORE', workflowId: 'chi' },
  { id: 'auth', name: 'Auth + RBAC', role: 'JWT AUTHN · ROLE GUARD', zone: 'CORE', workflowId: 'auth' },
  { id: 'mysql', name: 'MySQL', role: 'ACID RELATIONAL STORE', zone: 'DATA', workflowId: 'cache' },
  { id: 'redis', name: 'Redis', role: 'IN-MEMORY CACHE + DENYLIST', zone: 'DATA', workflowId: 'cache' },
  { id: 'asynq', name: 'Asynq', role: 'REDIS TASK QUEUE + WORKER', zone: 'DATA', workflowId: 'asynq' },
];
