import React from 'react';
import { ArrowRight } from 'lucide-react';
import { STACK_MAP_NODES, WorkflowId } from '../data/workflows';

interface StackArchitectureMapProps {
  activeWorkflowId: WorkflowId;
  onSelectWorkflow: (id: WorkflowId) => void;
}

const ZONE_META: Array<{ zone: 'DEPLOY' | 'EDGE' | 'CORE' | 'DATA'; label: string }> = [
  { zone: 'DEPLOY', label: '01. SOURCE & CONTAINER' },
  { zone: 'EDGE', label: '02. EDGE PROXY' },
  { zone: 'CORE', label: '03. GO API ENGINE' },
  { zone: 'DATA', label: '04. STORAGE & QUEUE' },
];

export const StackArchitectureMap: React.FC<StackArchitectureMapProps> = ({
  activeWorkflowId,
  onSelectWorkflow,
}) => {
  return (
    <section id="stack-map" aria-label="Full Stack Topology" className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Peta Arsitektur Stack
          </h2>
          <p className="text-xs font-mono uppercase text-slate-500 mt-0.5">
            KLIK KOMPONEN UNTUK BUKA WORKFLOW + LAB
          </p>
        </div>
        <span className="text-xs font-mono text-slate-500">
          9 KOMPONEN · 4 LAYER
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        {ZONE_META.map((z, idx) => {
          const items = STACK_MAP_NODES.filter((n) => n.zone === z.zone);
          return (
            <div key={z.zone} className="relative flex flex-col">
              <div className="text-xs font-mono font-semibold text-slate-500 mb-2.5 flex items-center justify-between">
                <span>{z.label}</span>
                {idx < ZONE_META.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden xl:block" aria-hidden="true" />
                )}
              </div>

              <div className="flex-1 flex flex-col gap-2.5 bg-slate-50 border border-slate-200 rounded-lg p-3">
                {items.map((item) => {
                  const isActive = item.workflowId === activeWorkflowId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectWorkflow(item.workflowId)}
                      className={`w-full text-left p-3 rounded-md border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-sky-50 border-sky-500 text-slate-900'
                          : 'bg-white border-slate-200 text-slate-900 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm font-semibold">{item.name}</span>
                        <span className="text-[11px] font-mono text-sky-700 uppercase">
                          {isActive ? 'ACTIVE' : 'OPEN'}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] font-mono uppercase text-slate-600">
                        {item.role}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
