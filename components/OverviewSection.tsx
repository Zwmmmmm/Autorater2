
import React from 'react';
import { EvaluationEntry } from '../types';

interface OverviewSectionProps {
  results: EvaluationEntry[];
}

const CATEGORY_CONFIG: Record<string, { color: string; label: string }> = {
  'Simple_Basic': { color: '#4A90E2', label: 'Simple Basic' },
  'Complex_Reasoning': { color: '#9013FE', label: 'Complex Reasoning' },
  'Multi_turn_Clarification': { color: '#F5A623', label: 'Multi-turn Clarification' },
  'Ambiguity_Robustness': { color: '#50E3C2', label: 'Ambiguity Robustness' },
};

const SCORE_COLORS = {
  exc: '#2ECC71', // 2 points
  acc: '#F1C40F', // 1 point
  fail: '#E74C3C', // 0 points
};

const OverviewSection: React.FC<OverviewSectionProps> = ({ results }) => {
  const stats = {
    total: results.length,
    avg: results.length ? (results.reduce((acc, curr) => acc + (curr.orchestration_eval.score + curr.tool_eval.score + curr.summary_eval.score), 0) / (results.length * 3)).toFixed(1) : '0',
    high: results.filter(e => (e.orchestration_eval.score + e.tool_eval.score + e.summary_eval.score) / 3 >= 1.5).length,
    low: results.filter(e => (e.orchestration_eval.score + e.tool_eval.score + e.summary_eval.score) / 3 < 0.7).length
  };

  const getDimensionAvg = (key: 'orchestration_eval' | 'tool_eval' | 'summary_eval') => {
    if (!results.length) return 0;
    return results.reduce((acc, curr) => acc + curr[key].score, 0) / results.length;
  };

  if (results.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="apple-card p-12 flex flex-col items-center text-center max-w-lg">
          <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center mb-6">
            <i className="fas fa-chart-line text-gray-400 text-2xl"></i>
          </div>
          <h2 className="text-xl font-bold mb-3">No Evaluation Data Yet</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Macro insights will appear here once you've uploaded and evaluated a test set. Please visit the Inspect page to begin.
          </p>
          <button 
            onClick={() => window.location.hash = 'inspect'}
            className="px-8 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all"
          >
            Go to Inspect
          </button>
        </div>
      </div>
    );
  }

  const dimensions = [
    { label: 'Orchestration Accuracy', key: 'orchestration_eval', color: 'bg-blue-500', icon: 'fa-compass' },
    { label: 'Tool Output Quality', key: 'tool_eval', color: 'bg-emerald-500', icon: 'fa-code-branch' },
    { label: 'Summarization Gain', key: 'summary_eval', color: 'bg-purple-500', icon: 'fa-message' }
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Queries', value: stats.total, icon: 'fa-layer-group', color: 'text-gray-900' },
          { label: 'Global Average', value: stats.avg, icon: 'fa-star', color: 'text-blue-600' },
          { label: 'Pass Rate (>=1.5)', value: `${((stats.high / stats.total) * 100).toFixed(0)}%`, icon: 'fa-circle-check', color: 'text-emerald-600' },
          { label: 'Critical Flaws', value: stats.low, icon: 'fa-triangle-exclamation', color: 'text-red-600' }
        ].map((kpi, i) => (
          <div key={i} className="apple-card p-6 flex items-center justify-between transition-transform hover:scale-[1.02] cursor-default">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{kpi.label}</p>
              <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300">
              <i className={`fas ${kpi.icon}`}></i>
            </div>
          </div>
        ))}
      </div>

      {/* Main Analysis Sections - Adjusted to 1:3 ratio */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left: Capabilities Distribution (1/4 Width) */}
        <div className="lg:col-span-1 apple-card p-8 flex flex-col h-full">
          <h3 className="text-lg font-bold mb-8">Capabilities</h3>
          <div className="space-y-10 flex-1">
            {dimensions.map((dim, i) => {
              const score = getDimensionAvg(dim.key as any);
              const percentage = (score / 2) * 100;
              return (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <i className={`fas ${dim.icon} text-gray-400 w-4`}></i>
                      <span className="font-semibold text-gray-700 text-xs truncate max-w-[120px]">{dim.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${dim.color} transition-all duration-1000 ease-out`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="font-bold text-gray-900 text-xs min-w-[50px] text-right">{score.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Category Performance (3/4 Width) */}
        <div className="lg:col-span-3 apple-card p-8 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold">Category Analysis</h3>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
              Intention Classification
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
            {Object.entries(CATEGORY_CONFIG).map(([key, config], i) => {
              const categoryResults = results.filter(r => r.category === key);
              const count = categoryResults.length;
              
              const subScoreAvg = count 
                ? (categoryResults.reduce((acc, curr) => acc + curr.orchestration_eval.score, 0) / count).toFixed(1)
                : "0.0";
              
              const excCount = categoryResults.filter(r => r.orchestration_eval.score === 2).length;
              const accCount = categoryResults.filter(r => r.orchestration_eval.score === 1).length;
              const failCount = categoryResults.filter(r => r.orchestration_eval.score === 0).length;

              const excPct = count ? (excCount / count) * 100 : 0;
              const accPct = count ? (accCount / count) * 100 : 0;
              const failPct = count ? (failCount / count) * 100 : 0;

              return (
                <div key={key} className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:border-blue-100/50 group">
                  {/* Layer 1: Header */}
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.color }}></div>
                      <h4 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{config.label}</h4>
                    </div>
                    <div className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 flex flex-col items-center min-w-[70px]">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Sub-Score</span>
                      <span className="text-xs font-bold text-gray-800">
                        <span className="text-base font-black">{subScoreAvg}</span><span className="text-[10px] text-gray-400 mx-0.5">/</span>2.0
                      </span>
                    </div>
                  </div>

                  {/* Layer 2: Meta */}
                  <div className="mb-6">
                    <p className="text-[10px] font-bold text-gray-400 tracking-[0.1em] uppercase">Samples: {count}</p>
                  </div>

                  {/* Layer 3: Multi-Segment Progress Bar */}
                  <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden flex mb-4 shadow-inner">
                    <div className="h-full transition-all duration-1000 ease-in-out" style={{ width: `${excPct}%`, backgroundColor: SCORE_COLORS.exc }}></div>
                    <div className="h-full transition-all duration-1000 ease-in-out" style={{ width: `${accPct}%`, backgroundColor: SCORE_COLORS.acc }}></div>
                    <div className="h-full transition-all duration-1000 ease-in-out" style={{ width: `${failPct}%`, backgroundColor: SCORE_COLORS.fail }}></div>
                  </div>

                  {/* Layer 4: Legend & Stats */}
                  <div className="flex items-center justify-between text-[11px] font-black tracking-tight pt-1">
                    <div className="flex items-center gap-1.5" style={{ color: SCORE_COLORS.exc }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SCORE_COLORS.exc }}></span>
                      <span>EXC: {Math.round(excPct)}%</span>
                    </div>
                    <div className="flex items-center gap-1.5" style={{ color: SCORE_COLORS.acc }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SCORE_COLORS.acc }}></span>
                      <span>ACC: {Math.round(accPct)}%</span>
                    </div>
                    <div className="flex items-center gap-1.5" style={{ color: SCORE_COLORS.fail }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SCORE_COLORS.fail }}></span>
                      <span>FAIL: {Math.round(failPct)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewSection;
