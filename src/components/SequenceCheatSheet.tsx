import React from 'react';
import { WORKFLOW_MODULES, WorkflowId } from '../data/workflows';

interface SequenceCheatSheetProps {
  activeWorkflowId: WorkflowId;
  onSelectWorkflow: (id: WorkflowId) => void;
}

export const SequenceCheatSheet: React.FC<SequenceCheatSheetProps> = ({
  activeWorkflowId,
  onSelectWorkflow,
}) => {
  return (
    <section id="sequence" aria-label="Urutan Langkah Inti" className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Urutan Langkah Inti
          </h2>
          <p className="text-xs font-mono uppercase text-slate-500 mt-0.5">
            RINGKASAN STEP-BY-STEP TANPA BASI-BASI
          </p>
        </div>
        <span className="text-xs font-mono text-slate-500">5 WORKFLOW UTAMA</span>
      </div>

      <div className="divide-y divide-slate-200">
        {WORKFLOW_MODULES.map((mod) => {
          const isCurrent = mod.id === activeWorkflowId;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => onSelectWorkflow(mod.id)}
              className={`w-full text-left px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center transition-colors cursor-pointer ${
                isCurrent ? 'bg-sky-50/60' : 'bg-white hover:bg-slate-50'
              }`}
            >
              <div className="lg:col-span-3">
                <div className="text-xs font-mono text-slate-500">
                  {mod.index} · {mod.title}
                </div>
                <div className="text-xs font-mono font-semibold uppercase text-sky-700 mt-0.5">
                  {mod.essence}
                </div>
              </div>

              <div className="lg:col-span-9 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs font-mono">
                {mod.nodes.map((node, i) => (
                  <React.Fragment key={node.id}>
                    <span className="text-slate-800">
                      <span className="text-slate-400 mr-1">{node.step}</span>
                      <span className="font-semibold uppercase">{node.layer}</span>
                    </span>
                    {i < mod.nodes.length - 1 && (
                      <span className="text-slate-400" aria-hidden="true">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
