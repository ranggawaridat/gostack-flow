import React, { useState, useEffect } from 'react';
import {
  Play,
  Terminal,
  Database,
  Layers,
  ShieldCheck,
  GitBranch,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { WorkflowId } from '../data/workflows';

interface CodingLabProps {
  workflowId: WorkflowId;
  onSyncScenario: (scenarioId: string) => void;
}

interface LabLog {
  id: number;
  tag: string;
  msg: string;
  type: 'info' | 'ok' | 'warn' | 'err';
}

interface AsynqJob {
  id: string;
  task: string;
  queue: 'critical' | 'default' | 'low';
  attempt: number;
  maxRetry: number;
  state: 'PENDING' | 'RETRY' | 'COMPLETED' | 'ARCHIVED';
}

export const CodingLab: React.FC<CodingLabProps> = ({ workflowId, onSyncScenario }) => {
  const [logs, setLogs] = useState<LabLog[]>([
    { id: 1, tag: 'LAB', msg: 'READY · PILIH AKSI ATAU EDIT KODE', type: 'info' },
  ]);

  const pushLog = (tag: string, msg: string, type: LabLog['type'] = 'info') => {
    setLogs((prev) => [{ id: Date.now() + Math.random(), tag, msg, type }, ...prev].slice(0, 7));
  };

  // --- LAB 1: CHI ---
  const [chiRecoverer, setChiRecoverer] = useState(true);
  const [chiRateLimit, setChiRateLimit] = useState(true);
  const [chiReqCount, setChiReqCount] = useState(0);
  const [chiCode, setChiCode] = useState(
`r := chi.NewRouter()
r.Use(middleware.Logger)
r.Use(middleware.Recoverer)
r.Use(httprate.LimitByIP(2, time.Minute))

r.Get("/api/users/{id}", GetUser)
r.Get("/api/panic", TriggerPanic)`
  );

  useEffect(() => {
    const lines = [
      'r := chi.NewRouter()',
      'r.Use(middleware.Logger)',
      chiRecoverer ? 'r.Use(middleware.Recoverer)' : '// Recoverer DISABLED',
      chiRateLimit ? 'r.Use(httprate.LimitByIP(2, time.Minute))' : '// RateLimit DISABLED',
      '',
      'r.Get("/api/users/{id}", GetUser)',
      'r.Get("/api/panic", TriggerPanic)',
    ];
    setChiCode(lines.join('\n'));
  }, [chiRecoverer, chiRateLimit]);

  const runChiRequest = (target: 'user' | 'panic' | 'reset') => {
    if (target === 'reset') {
      setChiReqCount(0);
      pushLog('CHI', 'BUCKET RESET → 0/2 REQ', 'info');
      onSyncScenario('valid');
      return;
    }

    const nextCount = chiReqCount + 1;
    setChiReqCount(nextCount);

    const hasRateInCode = chiRateLimit && !chiCode.includes('// RateLimit DISABLED');
    const hasRecoverInCode = chiRecoverer && !chiCode.includes('// Recoverer DISABLED');

    if (hasRateInCode && nextCount > 2) {
      pushLog('429', `REQ #${nextCount}/2 → BLOCKED BY RATE LIMIT`, 'err');
      onSyncScenario('ratelimit');
      return;
    }

    if (target === 'panic') {
      if (hasRecoverInCode) {
        pushLog('500', 'PANIC CAUGHT BY RECOVERER · SERVER UP', 'warn');
        onSyncScenario('panic');
      } else {
        pushLog('CRASH', 'UNHANDLED PANIC · GO PROCESS EXIT 2!', 'err');
        onSyncScenario('panic');
      }
      return;
    }

    pushLog('200', `GET /api/users/42 · MATCHED · REQ #${nextCount}`, 'ok');
    onSyncScenario('valid');
  };

  // --- LAB 2: AUTH + RBAC ---
  const [authRole, setAuthRole] = useState<'admin' | 'editor' | 'viewer'>('admin');
  const [authEndpoint, setAuthEndpoint] = useState<'GET /posts' | 'POST /posts' | 'DELETE /users/42'>('DELETE /users/42');
  const [tokenExpired, setTokenExpired] = useState(false);
  const [redisRevoked, setRedisRevoked] = useState(false);

  const rbacMatrix: Record<'admin' | 'editor' | 'viewer', Record<string, boolean>> = {
    admin: { 'GET /posts': true, 'POST /posts': true, 'DELETE /users/42': true },
    editor: { 'GET /posts': true, 'POST /posts': true, 'DELETE /users/42': false },
    viewer: { 'GET /posts': true, 'POST /posts': false, 'DELETE /users/42': false },
  };

  const runAuthTest = () => {
    if (tokenExpired) {
      pushLog('401', 'JWT EXP < NOW · AUTHN GAGAL', 'err');
      onSyncScenario('expired');
      return;
    }
    if (redisRevoked) {
      pushLog('401', 'REDIS EXISTS revoked:jti=1 · TOKEN REVOKED', 'err');
      onSyncScenario('revoked');
      return;
    }
    const allowed = rbacMatrix[authRole][authEndpoint];
    if (!allowed) {
      pushLog('403', `ROLE=${authRole.toUpperCase()} DENIED → ${authEndpoint}`, 'err');
      onSyncScenario('forbidden');
      return;
    }
    pushLog('200', `ROLE=${authRole.toUpperCase()} ALLOWED → ${authEndpoint}`, 'ok');
    onSyncScenario('admin');
  };

  // --- LAB 3: MYSQL + REDIS ---
  const [mysqlPrice, setMysqlPrice] = useState(75);
  const [redisCacheVal, setRedisCacheVal] = useState<number | null>(null);
  const [redisTtl, setRedisTtl] = useState(60);
  const [invalidateOnWrite, setInvalidateOnWrite] = useState(true);

  const runCacheGet = () => {
    if (redisCacheVal !== null) {
      const stale = redisCacheVal !== mysqlPrice;
      pushLog(
        stale ? 'STALE' : 'HIT',
        `REDIS HIT product:7 → price=${redisCacheVal} (0.8ms)${stale ? ' · DATA LAMA!' : ''}`,
        stale ? 'warn' : 'ok'
      );
      onSyncScenario('hit');
      return;
    }
    setRedisCacheVal(mysqlPrice);
    pushLog('MISS', `REDIS NIL → MYSQL SELECT price=${mysqlPrice} → SETEX ${redisTtl}s`, 'warn');
    onSyncScenario('miss');
  };

  const runCacheWrite = () => {
    const newPrice = mysqlPrice + 10;
    setMysqlPrice(newPrice);
    if (invalidateOnWrite) {
      setRedisCacheVal(null);
      pushLog('WRITE', `MYSQL UPDATE price=${newPrice} → REDIS DEL product:7`, 'ok');
    } else {
      pushLog('BUG', `MYSQL UPDATE price=${newPrice} · REDIS MASIH ${redisCacheVal ?? 'NIL'}!`, 'err');
    }
    onSyncScenario('write');
  };

  const runCacheFlush = () => {
    setRedisCacheVal(null);
    pushLog('FLUSH', 'REDIS FLUSHDB · CACHE KOSONG', 'info');
    onSyncScenario('miss');
  };

  // --- LAB 4: ASYNQ ---
  const [asynqQueue, setAsynqQueue] = useState<'critical' | 'default' | 'low'>('critical');
  const [asynqMaxRetry, setAsynqMaxRetry] = useState(3);
  const [smtpDown, setSmtpDown] = useState(false);
  const [jobs, setJobs] = useState<AsynqJob[]>([
    { id: 't-101', task: 'email:receipt', queue: 'critical', attempt: 0, maxRetry: 3, state: 'PENDING' },
  ]);

  const enqueueJob = () => {
    const id = `t-${Math.floor(102 + Math.random() * 890)}`;
    const taskName = asynqQueue === 'critical' ? 'email:otp' : asynqQueue === 'default' ? 'pdf:invoice' : 'digest:daily';
    const newJob: AsynqJob = { id, task: taskName, queue: asynqQueue, attempt: 0, maxRetry: asynqMaxRetry, state: 'PENDING' };
    setJobs((prev) => [newJob, ...prev].slice(0, 5));
    pushLog('202', `ENQUEUE ${taskName} [${asynqQueue.toUpperCase()}] · HTTP FAST EXIT`, 'ok');
    onSyncScenario('ok');
  };

  const processNextJob = () => {
    const priorityOrder: Array<'critical' | 'default' | 'low'> = ['critical', 'default', 'low'];
    let targetIdx = -1;
    for (const q of priorityOrder) {
      targetIdx = jobs.findIndex((j) => (j.state === 'PENDING' || j.state === 'RETRY') && j.queue === q);
      if (targetIdx !== -1) break;
    }

    if (targetIdx === -1) {
      pushLog('IDLE', 'SEMUA QUEUE KOSONG', 'info');
      return;
    }

    const job = jobs[targetIdx];
    const nextAttempt = job.attempt + 1;

    setJobs((prev) =>
      prev.map((j, idx): AsynqJob => {
        if (idx !== targetIdx) return j;
        if (!smtpDown) {
          return { ...j, attempt: nextAttempt, state: 'COMPLETED' };
        }
        if (nextAttempt >= j.maxRetry) {
          return { ...j, attempt: nextAttempt, state: 'ARCHIVED' };
        }
        return { ...j, attempt: nextAttempt, state: 'RETRY' };
      })
    );

    if (!smtpDown) {
      pushLog('DONE', `WORKER EXEC ${job.id} (${job.task}) → COMPLETED`, 'ok');
      onSyncScenario('ok');
    } else if (nextAttempt >= job.maxRetry) {
      pushLog('DLQ', `${job.id} GAGAL ${nextAttempt}/${job.maxRetry} → ARCHIVED`, 'err');
      onSyncScenario('dlq');
    } else {
      pushLog('RETRY', `${job.id} SMTP TIMEOUT · RETRY ${nextAttempt}/${job.maxRetry}`, 'warn');
      onSyncScenario('retry');
    }
  };

  // --- LAB 5: GIT + DOCKER COMPOSE + CADDY ---
  const [gitStep, setGitStep] = useState<number>(0);
  const [useHealthcheck, setUseHealthcheck] = useState(true);
  const [caddyTargetPort, setCaddyTargetPort] = useState('8080');
  const [activeConfigTab, setActiveConfigTab] = useState<'compose' | 'caddy'>('compose');

  const runDeployCommand = (step: number) => {
    if (step === 1) {
      setGitStep(1);
      pushLog('GIT', 'git add . && git commit -m "feat: api" → SHA 8f2a1c', 'info');
    } else if (step === 2) {
      setGitStep(2);
      pushLog('GIT', 'git push origin main → REMOTE UPDATED', 'ok');
    } else if (step === 3) {
      setGitStep(3);
      if (!useHealthcheck) {
        pushLog('ERR', 'docker compose up → API CRASH! MYSQL 3306 REFUSED', 'err');
        onSyncScenario('nohealth');
      } else {
        pushLog('UP', 'MYSQL HEALTHY → REDIS HEALTHY → GO API READY', 'ok');
        onSyncScenario('healthy');
      }
    } else if (step === 4) {
      if (!useHealthcheck) {
        pushLog('502', 'CADDY → API CONTAINER DOWN (502 BAD GATEWAY)', 'err');
        onSyncScenario('nohealth');
      } else if (caddyTargetPort !== '8080') {
        pushLog('502', `CADDY reverse_proxy api:${caddyTargetPort} → PORT WRONG!`, 'err');
        onSyncScenario('nohealth');
      } else {
        setGitStep(4);
        pushLog('200', 'CURL https://api.app.id → TLS OK · 200 HEALTHY', 'ok');
        onSyncScenario('healthy');
      }
    }
  };

  return (
    <section aria-label="Coding Lab" className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Lab Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-sky-600 shrink-0" />
          <h2 className="font-display text-base font-semibold text-slate-900">
            Coding Lab
          </h2>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="text-xs font-mono uppercase text-slate-500">
            EKSPERIMEN LANGSUNG · REAL-TIME TRACE
          </span>
        </div>

        <button
          type="button"
          onClick={() => setLogs([{ id: Date.now(), tag: 'LAB', msg: 'LOG CLEARED', type: 'info' }])}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-xs font-mono text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>CLEAR LOG</span>
        </button>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* LEFT: Interactive Code & State Controls (7 cols) */}
        <div className="lg:col-span-7 p-6 space-y-5">
          {workflowId === 'chi' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-mono font-semibold uppercase text-slate-700">
                  ROUTER.GO — EDITABLE MIDDLEWARE
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setChiRecoverer((v) => !v)}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      chiRecoverer
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-slate-100 border-slate-300 text-slate-600'
                    }`}
                  >
                    RECOVERER: {chiRecoverer ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChiRateLimit((v) => !v)}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      chiRateLimit
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-slate-100 border-slate-300 text-slate-600'
                    }`}
                  >
                    RATE LIMIT (2/m): {chiRateLimit ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              <textarea
                value={chiCode}
                onChange={(e) => setChiCode(e.target.value)}
                spellCheck={false}
                aria-label="Go Chi Router Code"
                className="w-full h-44 bg-slate-900 text-emerald-300 font-mono text-xs p-4 rounded-lg border border-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              />

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => runChiRequest('user')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-sky-600 text-white text-xs font-mono font-semibold hover:bg-sky-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>GET /api/users/42</span>
                </button>
                <button
                  type="button"
                  onClick={() => runChiRequest('panic')}
                  className="px-4 py-2 rounded-md bg-amber-600 text-white text-xs font-mono font-semibold hover:bg-amber-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  TRIGGER PANIC
                </button>
                <button
                  type="button"
                  onClick={() => runChiRequest('reset')}
                  className="px-3.5 py-2 rounded-md border border-slate-200 text-slate-700 text-xs font-mono hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  RESET BUCKET ({chiReqCount}/2)
                </button>
              </div>
            </>
          )}

          {workflowId === 'auth' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-mono font-semibold uppercase text-slate-700">
                  JWT CLAIMS + RBAC MATRIX
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTokenExpired((v) => !v)}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      tokenExpired
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    JWT EXP: {tokenExpired ? 'EXPIRED' : 'VALID'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRedisRevoked((v) => !v)}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      redisRevoked
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    REDIS REVOKED: {redisRevoked ? 'TRUE' : 'FALSE'}
                  </button>
                </div>
              </div>

              {/* Role & Endpoint Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono uppercase text-slate-500">1. PILIH ROLE (JWT CLAIM)</div>
                  <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                    {(['admin', 'editor', 'viewer'] as const).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setAuthRole(role)}
                        className={`flex-1 py-1.5 text-xs font-mono uppercase rounded-md transition-colors cursor-pointer ${
                          authRole === role ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono uppercase text-slate-500">2. PILIH ENDPOINT TARGET</div>
                  <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                    {(['GET /posts', 'POST /posts', 'DELETE /users/42'] as const).map((ep) => (
                      <button
                        key={ep}
                        type="button"
                        onClick={() => setAuthEndpoint(ep)}
                        className={`flex-1 px-2 py-1.5 text-[11px] font-mono rounded-md transition-colors truncate cursor-pointer ${
                          authEndpoint === ep ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        {ep}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live RBAC Matrix */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs font-mono text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">ROLE</th>
                      <th className="px-3 py-2">GET /posts</th>
                      <th className="px-3 py-2">POST /posts</th>
                      <th className="px-3 py-2">DELETE /users/42</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(['admin', 'editor', 'viewer'] as const).map((r) => (
                      <tr key={r} className={authRole === r ? 'bg-sky-50/70' : 'bg-white'}>
                        <td className="px-3 py-2 font-semibold uppercase text-slate-900">{r}</td>
                        {(['GET /posts', 'POST /posts', 'DELETE /users/42'] as const).map((ep) => {
                          const ok = rbacMatrix[r][ep];
                          const selectedCell = authRole === r && authEndpoint === ep;
                          return (
                            <td
                              key={ep}
                              className={`px-3 py-2 ${selectedCell ? 'ring-2 ring-inset ring-sky-500 font-semibold' : ''}`}
                            >
                              <span className={ok ? 'text-emerald-700' : 'text-red-600'}>
                                {ok ? 'ALLOW' : 'DENY 403'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={runAuthTest}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-sky-600 text-white text-xs font-mono font-semibold hover:bg-sky-700 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>TEST AUTHN + RBAC</span>
              </button>
            </>
          )}

          {workflowId === 'cache' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-mono font-semibold uppercase text-slate-700">
                  CACHE-ASIDE INSPECTOR (RAM vs DISK)
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInvalidateOnWrite((v) => !v)}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      invalidateOnWrite
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-red-50 border-red-300 text-red-700'
                    }`}
                  >
                    DEL ON WRITE: {invalidateOnWrite ? 'ON' : 'OFF (STALE!)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRedisTtl((t) => (t === 60 ? 10 : 60))}
                    className="px-3 py-1.5 rounded-md text-xs font-mono border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    TTL: {redisTtl}s
                  </button>
                </div>
              </div>

              {/* Dual Store Inspector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
                    <span className="font-semibold text-slate-900">REDIS (RAM)</span>
                    <span>LATENCY ~0.5ms</span>
                  </div>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded-md font-mono text-xs space-y-1">
                    <div className="text-slate-400">KEY: product:7</div>
                    {redisCacheVal !== null ? (
                      <div className="text-emerald-300">
                        VAL: {`{"id":7,"price":${redisCacheVal}}`} · TTL {redisTtl}s
                      </div>
                    ) : (
                      <div className="text-amber-300">VAL: (nil) — CACHE KOSONG</div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
                    <span className="font-semibold text-slate-900">MYSQL 8 (DISK)</span>
                    <span>LATENCY ~18ms</span>
                  </div>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded-md font-mono text-xs space-y-1">
                    <div className="text-slate-400">TABLE: products</div>
                    <div className="text-sky-300">
                      ROW: id=7 · name="API Pro" · price={mysqlPrice}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={runCacheGet}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-sky-600 text-white text-xs font-mono font-semibold hover:bg-sky-700 transition-colors cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>GET /products/7</span>
                </button>
                <button
                  type="button"
                  onClick={runCacheWrite}
                  className="px-4 py-2 rounded-md bg-slate-900 text-white text-xs font-mono font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  PUT /products/7 (+10)
                </button>
                <button
                  type="button"
                  onClick={runCacheFlush}
                  className="px-3.5 py-2 rounded-md border border-slate-200 text-slate-700 text-xs font-mono hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  FLUSH REDIS
                </button>
              </div>
            </>
          )}

          {workflowId === 'asynq' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-mono font-semibold uppercase text-slate-700">
                  ASYNQ QUEUE + WORKER SIMULATOR
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSmtpDown((v) => !v)}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      smtpDown
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    }`}
                  >
                    SMTP SERVER: {smtpDown ? 'DOWN (FAIL)' : 'UP'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAsynqMaxRetry((r) => (r === 3 ? 1 : 3))}
                    className="px-3 py-1.5 rounded-md text-xs font-mono border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    MAX RETRY: {asynqMaxRetry}
                  </button>
                </div>
              </div>

              {/* Queue Picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-500">PRIORITY QUEUE:</span>
                <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                  {(['critical', 'default', 'low'] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setAsynqQueue(q)}
                      className={`px-3 py-1 text-xs font-mono uppercase rounded-md cursor-pointer ${
                        asynqQueue === q ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Queue State Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs font-mono text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">JOB ID</th>
                      <th className="px-3 py-2">TASK</th>
                      <th className="px-3 py-2">QUEUE</th>
                      <th className="px-3 py-2">TRY</th>
                      <th className="px-3 py-2">STATE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {jobs.map((job) => (
                      <tr key={job.id} className="bg-white">
                        <td className="px-3 py-2 text-slate-700">{job.id}</td>
                        <td className="px-3 py-2 text-slate-900 font-medium">{job.task}</td>
                        <td className="px-3 py-2 uppercase text-slate-600">{job.queue}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {job.attempt}/{job.maxRetry}
                        </td>
                        <td className="px-3 py-2 font-semibold">
                          <span
                            className={
                              job.state === 'COMPLETED'
                                ? 'text-emerald-700'
                                : job.state === 'ARCHIVED'
                                ? 'text-red-600'
                                : job.state === 'RETRY'
                                ? 'text-amber-600'
                                : 'text-sky-700'
                            }
                          >
                            {job.state}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={enqueueJob}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-sky-600 text-white text-xs font-mono font-semibold hover:bg-sky-700 transition-colors cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>ENQUEUE TASK (HTTP 202)</span>
                </button>
                <button
                  type="button"
                  onClick={processNextJob}
                  className="px-4 py-2 rounded-md bg-slate-900 text-white text-xs font-mono font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  WORKER POP & EXEC
                </button>
              </div>
            </>
          )}

          {workflowId === 'deploy' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveConfigTab('compose')}
                    className={`px-3 py-1 text-xs font-mono rounded-md cursor-pointer ${
                      activeConfigTab === 'compose' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    compose.yaml
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveConfigTab('caddy')}
                    className={`px-3 py-1 text-xs font-mono rounded-md cursor-pointer ${
                      activeConfigTab === 'caddy' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Caddyfile
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUseHealthcheck((v) => !v)}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      useHealthcheck
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-red-50 border-red-300 text-red-700'
                    }`}
                  >
                    HEALTHCHECK: {useHealthcheck ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCaddyTargetPort((p) => (p === '8080' ? '9999' : '8080'))}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      caddyTargetPort === '8080'
                        ? 'bg-slate-50 border-slate-200 text-slate-700'
                        : 'bg-amber-50 border-amber-300 text-amber-800'
                    }`}
                  >
                    PROXY PORT: :{caddyTargetPort}
                  </button>
                </div>
              </div>

              <pre className="w-full h-44 bg-slate-900 text-sky-300 font-mono text-xs p-4 rounded-lg border border-slate-800 overflow-auto">
                {activeConfigTab === 'compose'
                  ? `services:
  mysql:
    image: mysql:8.0
    healthcheck:
      test: ["CMD", "mysqladmin", "ping"]
  redis:
    image: redis:7-alpine
  api:
    build: .
    depends_on:
      mysql:
        condition: ${useHealthcheck ? 'service_healthy' : 'service_started # BUG: NO WAIT!'}
  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]`
                  : `api.app.id {
  encode zstd gzip
  reverse_proxy api:${caddyTargetPort}
}`}
              </pre>

              {/* Step-by-step Git -> Docker -> Caddy CLI */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => runDeployCommand(1)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-mono border cursor-pointer ${
                    gitStep >= 1 ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>1. GIT COMMIT</span>
                </button>
                <button
                  type="button"
                  onClick={() => runDeployCommand(2)}
                  className={`px-3 py-2 rounded-md text-xs font-mono border cursor-pointer ${
                    gitStep >= 2 ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  2. GIT PUSH
                </button>
                <button
                  type="button"
                  onClick={() => runDeployCommand(3)}
                  className="px-3.5 py-2 rounded-md bg-sky-600 text-white text-xs font-mono font-semibold hover:bg-sky-700 cursor-pointer"
                >
                  3. COMPOSE UP -D
                </button>
                <button
                  type="button"
                  onClick={() => runDeployCommand(4)}
                  className="px-3.5 py-2 rounded-md bg-slate-900 text-white text-xs font-mono font-semibold hover:bg-slate-800 cursor-pointer"
                >
                  4. CURL HTTPS
                </button>
              </div>
            </>
          )}
        </div>

        {/* RIGHT: Execution Output Console (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950 text-slate-100 p-6 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-3 border-b border-slate-800">
              <span>OUTPUT TERMINAL</span>
              <span className="text-sky-400 uppercase">RUNTIME TRACE</span>
            </div>

            <div className="mt-4 space-y-2.5">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-2.5 text-xs font-mono leading-relaxed"
                >
                  {log.type === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />}
                  {log.type === 'warn' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />}
                  {log.type === 'err' && <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />}
                  {log.type === 'info' && <Terminal className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />}
                  <div className="min-w-0">
                    <span
                      className={`font-semibold mr-2 ${
                        log.type === 'ok'
                          ? 'text-emerald-400'
                          : log.type === 'warn'
                          ? 'text-amber-400'
                          : log.type === 'err'
                          ? 'text-red-400'
                          : 'text-sky-400'
                      }`}
                    >
                      [{log.tag}]
                    </span>
                    <span className="text-slate-200">{log.msg}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>CLICK STEPS DI ATAS UNTUK INSPEKSI</span>
            <span className="text-slate-300 uppercase">{workflowId} LAB</span>
          </div>
        </div>
      </div>
    </section>
  );
};
