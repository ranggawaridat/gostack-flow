import { useState, useEffect, useCallback } from 'react';
import { WORKFLOW_MODULES, WorkflowId } from './data/workflows';
import { WorkflowVisualizer } from './components/WorkflowVisualizer';
import { CodingLab } from './components/CodingLab';
import { StackArchitectureMap } from './components/StackArchitectureMap';
import { SequenceCheatSheet } from './components/SequenceCheatSheet';

export default function App() {
  const [activeWorkflowId, setActiveWorkflowId] = useState<WorkflowId>('chi');
  const [scenarioMap, setScenarioMap] = useState<Record<WorkflowId, string>>({
    chi: 'valid',
    auth: 'admin',
    cache: 'hit',
    asynq: 'ok',
    deploy: 'healthy',
  });
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const currentModule =
    WORKFLOW_MODULES.find((m) => m.id === activeWorkflowId) ?? WORKFLOW_MODULES[0];
  const currentScenarioId = scenarioMap[activeWorkflowId];
  const currentScenario =
    currentModule.scenarios.find((s) => s.id === currentScenarioId) ??
    currentModule.scenarios[0];

  const handleSelectWorkflow = useCallback((id: WorkflowId) => {
    setActiveWorkflowId(id);
    setActiveStepIndex(0);
    setIsPlaying(true);
    const el = document.getElementById('workflow');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleSelectScenario = useCallback(
    (scenarioId: string) => {
      setScenarioMap((prev) => ({ ...prev, [activeWorkflowId]: scenarioId }));
      setActiveStepIndex(0);
      setIsPlaying(true);
    },
    [activeWorkflowId]
  );

  const handleStepNext = useCallback(() => {
    setIsPlaying(false);
    setActiveStepIndex((prev) =>
      prev + 1 < currentScenario.activeSteps.length ? prev + 1 : 0
    );
  }, [currentScenario.activeSteps.length]);

  const handleStepPrev = useCallback(() => {
    setIsPlaying(false);
    setActiveStepIndex((prev) =>
      prev - 1 >= 0 ? prev - 1 : currentScenario.activeSteps.length - 1
    );
  }, [currentScenario.activeSteps.length]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setActiveStepIndex(0);
  }, []);

  const handleResetAll = useCallback(() => {
    setActiveWorkflowId('chi');
    setScenarioMap({
      chi: 'valid',
      auth: 'admin',
      cache: 'hit',
      asynq: 'ok',
      deploy: 'healthy',
    });
    setActiveStepIndex(0);
    setIsPlaying(true);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setActiveStepIndex((prev) =>
        prev + 1 < currentScenario.activeSteps.length ? prev + 1 : 0
      );
    }, 1150);
    return () => window.clearInterval(timer);
  }, [isPlaying, currentScenario.activeSteps.length]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
          <a
            href="#workflow"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            GoStack Flow
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#workflow"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Workflow
            </a>
            <a
              href="#coding-lab"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Coding Lab
            </a>
            <a
              href="#stack-map"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Stack Map
            </a>
            <a
              href="#sequence"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Sequence
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleResetAll}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Reset Lab
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Ultra-Concise Intro + Module Switcher */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance">
                Belajar Backend dengan Workflow
              </h1>
              <p className="mt-1.5 text-xs font-mono uppercase tracking-wider text-slate-500">
                GO · CHI · MYSQL · REDIS · AUTH & RBAC · ASYNQ · CADDY · DOCKER COMPOSE · GIT
              </p>
            </div>
            <div className="text-xs font-mono uppercase text-sky-700 font-semibold">
              URUTAN LANGKAH · VISUALISASI · CODING LAB
            </div>
          </div>

          {/* 5 Workflow Tabs */}
          <div
            id="workflow"
            role="tablist"
            aria-label="Pilih Modul Workflow"
            className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-200/70 rounded-xl"
          >
            {WORKFLOW_MODULES.map((mod) => {
              const active = mod.id === activeWorkflowId;
              return (
                <button
                  key={mod.id}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => {
                    setActiveWorkflowId(mod.id);
                    setActiveStepIndex(0);
                    setIsPlaying(true);
                  }}
                  className={`px-4 py-2 text-xs font-mono rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mod.index}. {mod.title}
                </button>
              );
            })}
          </div>
        </section>

        {/* Stage 1: Visual Step-by-Step Workflow */}
        <WorkflowVisualizer
          module={currentModule}
          scenario={currentScenario}
          onSelectScenario={handleSelectScenario}
          activeStepIndex={activeStepIndex}
          onSelectStepIndex={(idx) => {
            setIsPlaying(false);
            setActiveStepIndex(idx);
          }}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onStepNext={handleStepNext}
          onStepPrev={handleStepPrev}
          onReset={handleReset}
        />

        {/* Stage 2: Interactive Coding Lab */}
        <div id="coding-lab">
          <CodingLab
            workflowId={activeWorkflowId}
            onSyncScenario={handleSelectScenario}
          />
        </div>

        {/* Stage 3: Full Stack Architecture Map */}
        <StackArchitectureMap
          activeWorkflowId={activeWorkflowId}
          onSelectWorkflow={handleSelectWorkflow}
        />

        {/* Stage 4: Step Sequence Cheat Sheet */}
        <SequenceCheatSheet
          activeWorkflowId={activeWorkflowId}
          onSelectWorkflow={handleSelectWorkflow}
        />
      </main>

      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <span>GoStack Flow · Interactive Backend Workflow Lab</span>
          <span>GO · CHI · MYSQL · REDIS · RBAC · ASYNQ · CADDY · DOCKER · GIT</span>
        </div>
      </footer>
    </div>
  );
}
