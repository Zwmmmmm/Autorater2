
import React, { useState, useEffect } from 'react';
import { EvaluationEntry, EvalPrompts } from '../types';

interface InspectSectionProps {
  results: EvaluationEntry[];
  prompts: EvalPrompts;
  setResults: (data: EvaluationEntry[]) => void;
}

const InspectSection: React.FC<InspectSectionProps> = ({ results, prompts }) => {
  const [selectedEntry, setSelectedEntry] = useState<EvaluationEntry | null>(results[0] || null);

  useEffect(() => {
    if (results.length > 0 && !selectedEntry) {
      setSelectedEntry(results[0]);
    }
  }, [results]);

  const ScoreBadge = ({ score }: { score: number }) => {
    const colors = ['bg-red-100 text-red-600', 'bg-orange-100 text-orange-600', 'bg-green-100 text-green-600'];
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[score]}`}>{score} PTS</span>;
  };

  if (results.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-gray-400">
        <i className="fas fa-hourglass-start text-4xl mb-4 opacity-10"></i>
        <p className="text-sm font-medium">Evaluation processing... Please wait.</p>
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col gap-6 max-w-[1600px] mx-auto overflow-hidden">
      <div className="flex-1 flex gap-8 overflow-hidden min-h-0">
        <div className="w-80 md:w-96 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar pb-4">
            {results.map(entry => (
              <button
                key={entry.id} 
                onClick={() => setSelectedEntry(entry)}
                className={`w-full text-left p-4 rounded-2xl transition-all border ${
                  selectedEntry?.id === entry.id ? 'bg-[#1D1D1F] border-gray-900 text-white shadow-md' : 'bg-white border-transparent hover:border-gray-200 text-gray-900 shadow-sm'
                } ${entry.category === 'Error' ? 'border-red-200' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${selectedEntry?.id === entry.id ? 'text-gray-400' : 'text-gray-400'}`}>
                    {entry.category.replace('_', ' ')}
                  </span>
                  {selectedEntry?.id !== entry.id && entry.category !== 'Error' && <ScoreBadge score={entry.orchestration_eval.score} />}
                  {entry.category === 'Error' && <i className="fas fa-circle-exclamation text-red-500 text-xs"></i>}
                </div>
                <p className={`text-sm font-semibold line-clamp-1 ${selectedEntry?.id === entry.id ? 'text-white' : 'text-gray-900'}`}>
                  {entry.user_query}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 apple-card p-0 flex flex-col overflow-hidden">
          {selectedEntry ? (
            <div className="h-full flex flex-col">
              <div className="p-8 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-600 text-[9px] font-black uppercase tracking-tighter">Evaluation Report</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">ID: {selectedEntry.id}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 leading-tight">{selectedEntry.user_query}</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
                <div className="space-y-12">
                  {[
                    { label: 'Parsed User Instruction', icon: 'fa-compass', eval: selectedEntry.orchestration_eval, raw: [{ label: 'Ground Truth Tool', val: selectedEntry.ground_truth }, { label: 'Extracted Log Segment', val: selectedEntry.agent_output }] },
                    { label: 'Tool Interaction Result', icon: 'fa-code-branch', eval: selectedEntry.tool_eval, raw: [{ label: 'Raw Log Detail', val: selectedEntry.tool_response }] },
                    { label: 'Final Output Summary', icon: 'fa-message', eval: selectedEntry.summary_eval, raw: [{ label: 'Model Response', val: selectedEntry.final_response }] }
                  ].map((step, idx) => (
                    <div key={idx} className="relative flex gap-6 timeline-item">
                      <div className="flex flex-col items-center timeline-line relative z-10 pt-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-sm ${selectedEntry.category === 'Error' ? 'bg-red-500 text-white' : step.eval.score === 2 ? 'bg-emerald-500 text-white' : step.eval.score === 1 ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'}`}>
                          <i className={`fas ${step.icon}`}></i>
                        </div>
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400">{step.label}</h4>
                          {selectedEntry.category !== 'Error' && <ScoreBadge score={step.eval.score} />}
                        </div>
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                          <p className="text-sm font-medium text-gray-800 leading-relaxed italic border-l-2 border-blue-500 pl-4 bg-blue-50/20 py-1">{step.eval.reason}</p>
                          <div className="space-y-4 pt-2">
                            {step.raw.map((r, ri) => (
                              <div key={ri}>
                                <p className="text-[9px] font-black text-gray-300 uppercase mb-2 tracking-tighter">{r.label}</p>
                                <div className="bg-gray-50 rounded-xl p-4 font-mono text-[11px] text-gray-500 border border-gray-100 break-all max-h-40 overflow-y-auto custom-scrollbar">
                                  {typeof r.val === 'string' ? r.val : JSON.stringify(r.val, null, 2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-gray-300">
              <i className="fas fa-magnifying-glass-chart text-4xl mb-4 opacity-10"></i>
              <p className="text-sm font-medium">Please select a scenario from the list to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InspectSection;
