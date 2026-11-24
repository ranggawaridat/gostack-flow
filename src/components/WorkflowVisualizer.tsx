import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { WorkflowModule, WorkflowScenario, NodeStatus } from '../data/workflows';

interface WorkflowVisualizerProps {
  module: WorkflowModule;
  scenario: WorkflowScenario;
  onSelectScenario: (scenarioId: string) => void;
  activeStepIndex: number;
  onSelectStepIndex: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepNext: () => void;
  onStepPrev: () => void;
  onReset: () => void;
}

export const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({
  module,
  scenario,
  onSelectScenario,
  activeStepIndex,
  onSelectStepIndex,
  isPlaying,
  onTogglePlay,
  onStepNext,
  onStepPrev,
  onReset,
}) => {
  const activeStepId = scenario.activeSteps[activeStepIndex] ?? scenario.activeSteps[0];
  const activeNode = module.nodes.find((n) => n.id === activeStepId) ?? module.nodes[0];

  const getNodeStatus = (nodeId: string): { status: NodeStatus; isIncluded: boolean; isCurrent: boolean } => {
    const stepPos = scenario.activeSteps.indexOf(nodeId);
    const isIncluded = stepPos !== -1;
    const isCurrent = nodeId === activeStepId;
    const node = module.nodes.find((n) => n.id === nodeId);
    const scenarioStatus = node?.statusOnScenario?.[scenario.id];

    if (!isIncluded) {
      return { status: 'nominal', isIncluded: false, isCurrent: false };
    }

    if (scenarioStatus && stepPos <= activeStepIndex) {
      return { status: scenarioStatus, isIncluded: true, isCurrent };
    }

    if (isCurrent) {
      return { status: 'active', isIncluded: true, isCurrent: true };
    }

    return { status: 'nominal', isIncluded: true, isCurrent: false };
  };

  const renderOutcomeIcon = (type: 'nominal' | 'warning' | 'error') => {
    if (type === 'nominal') return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
    if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
    return <XCircle className="w-4 h-4 text-red-600 shrink-0" />;
  };

  return (
    <section aria-label="Workflow Visualizer" className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Top Control Bar */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <span className="font-semibold text-slate-900">{module.index}.</span>
            <span>{module.title}</span>
            <span aria-hidden="true">·</span>
            <span className="uppercase tracking-wider text-sky-700 font-semibold">{module.essence}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs font-mono text-slate-500">
            {module.stackTags.map((tag, idx) => (
              <React.Fragment key={tag}>
                <span>{tag}</span>
                {idx < module.stackTags.length - 1 && <span aria-hidden="true">·</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Scenario Switcher */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {module.scenarios.map((sc) => {
            const active = sc.id === scenario.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => onSelectScenario(sc.id)}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sc.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Blueprint Stage */}
      <div className="p-6 blueprint-grid bg-slate-50/60">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 items-stretch">
          {module.nodes.map((node, idx) => {
            const { status, isIncluded, isCurrent } = getNodeStatus(node.id);
            const stepOrderInScenario = scenario.activeSteps.indexOf(node.id);
            const isVisited = isIncluded && stepOrderInScenario <= activeStepIndex;

            const coreText = node.coreOnScenario?.[scenario.id] ?? node.core;
            const ioText = node.ioOnScenario?.[scenario.id] ?? node.io;

            let cardStyle = 'bg-white border-slate-200 text-slate-900';
            if (!isIncluded) {
              cardStyle = 'bg-slate-100/70 border-slate-200/70 text-slate-400 opacity-50';
            } else if (isCurrent && status === 'error') {
              cardStyle = 'bg-red-50 border-red-500 ring-2 ring-red-200 text-slate-900';
            } else if (isCurrent && status === 'warning') {
              cardStyle = 'bg-amber-50 border-amber-500 ring-2 ring-amber-200 text-slate-900';
            } else if (isCurrent) {
              cardStyle = 'bg-sky-50 border-sky-600 ring-2 ring-sky-200 text-slate-900';
            } else if (isVisited && status === 'error') {
              cardStyle = 'bg-white border-red-300 text-slate-900';
            } else if (isVisited && status === 'warning') {
              cardStyle = 'bg-white border-amber-300 text-slate-900';
            } else if (isVisited) {
              cardStyle = 'bg-white border-emerald-400 text-slate-900';
            }

            return (
              <div key={node.id} className="relative flex items-stretch">
                <button
                  type="button"
                  onClick={() => {
                    if (stepOrderInScenario !== -1) {
                      onSelectStepIndex(stepOrderInScenario);
                    }
                  }}
                  disabled={!isIncluded}
                  className={`w-full text-left p-3.5 rounded-lg border transition-all duration-150 flex flex-col justify-between gap-2.5 ${cardStyle} ${
                    isIncluded ? 'cursor-pointer hover:border-sky-400' : 'cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="font-semibold text-slate-500 tabular-nums">
                        {isIncluded ? `STEP ${node.step}` : 'SKIPPED'}
                      </span>
                      <span className="text-slate-400 tabular-nums">{node.latency}</span>
                    </div>
                    <div className="mt-1 font-display text-sm font-semibold tracking-tight">
                      {node.layer}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div
                      className={`text-[11px] font-mono font-semibold uppercase tracking-wide ${
                        !isIncluded
                          ? 'text-slate-400'
                          : status === 'error'
                          ? 'text-red-700'
                          : status === 'warning'
                          ? 'text-amber-700'
                          : isCurrent
                          ? 'text-sky-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {coreText}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 truncate" title={ioText}>
                      {ioText}
                    </div>
                  </div>
                </button>

                {idx < module.nodes.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="hidden xl:flex items-center justify-center -mr-2.5 pl-0.5 z-10 text-slate-400"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Playback + Active Step Focus Strip */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Controls */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-3.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onTogglePlay}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-sky-600 text-white text-xs font-mono font-semibold hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>
              <button
                type="button"
                onClick={onStepPrev}
                aria-label="Step Back"
                className="p-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onStepNext}
                aria-label="Step Forward"
                className="p-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onReset}
                aria-label="Reset Flow"
                className="p-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-xs font-mono text-slate-600 tabular-nums whitespace-nowrap shrink-0">
              {activeStepIndex + 1} / {scenario.activeSteps.length}
            </div>
          </div>

          {/* Active Step Code Snippet */}
          <div className="lg:col-span-5 bg-slate-900 text-slate-100 rounded-lg p-3.5 flex flex-col justify-center">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>EXECUTION · STEP {activeNode.step} ({activeNode.layer})</span>
              <span className="text-sky-400 uppercase">{activeNode.coreOnScenario?.[scenario.id] ?? activeNode.core}</span>
            </div>
            <pre className="text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre">
              {activeNode.codeSnippet}
            </pre>
          </div>

          {/* Scenario Outcome */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              {renderOutcomeIcon(scenario.outcomeType)}
              <span
                className={`text-xs font-mono font-semibold uppercase ${
                  scenario.outcomeType === 'nominal'
                    ? 'text-emerald-700'
                    : scenario.outcomeType === 'warning'
                    ? 'text-amber-700'
                    : 'text-red-700'
                }`}
              >
                {scenario.outcome}
              </span>
            </div>
            <div className="mt-1.5 text-[11px] font-mono text-slate-500 truncate" title={scenario.packet.output}>
              OUT: {scenario.packet.output}
            </div>
          </div>
        </div>

        {/* Packet Trace Bar */}
        <div className="mt-3 bg-white border border-slate-200 rounded-lg px-4 py-2.5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="truncate">
            <span className="text-slate-400 mr-2">IN:</span>
            <span className="text-slate-800">{scenario.packet.input}</span>
          </div>
          <div className="truncate">
            <span className="text-slate-400 mr-2">CTX:</span>
            <span className="text-slate-800">{scenario.packet.context}</span>
          </div>
          <div className="truncate">
            <span className="text-slate-400 mr-2">OUT:</span>
            <span className="text-slate-900 font-semibold">{scenario.packet.output}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
