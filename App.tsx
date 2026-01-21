
import React, { useState, useEffect } from 'react';
import { AppTab, EvalPrompts, EvaluationEntry } from './types';
import Sidebar from './components/Sidebar';
import OverviewSection from './components/OverviewSection';
import InspectSection from './components/InspectSection';
import SettingsSection from './components/SettingsSection';

const DEFAULT_PROMPTS: EvalPrompts = {
  orchestration: `## Dimension 1: Orchestration (编排准确率)
对比 Agent Output 与 Ground Truth。
- 2分 (优质): 意图、核心参数完全一致，或仅有格式归一化差异。
- 1分 (可用): 核心意图正确，但遗漏非核心参数或格式有瑕疵。
- 0分 (不可用): 意图错误、关键参数缺失或有幻觉参数。`,
  tool: `## Dimension 2: Tool Output (工具输出效果)
分析 Tool Response 是否满足 User Query。
- 2分 (优质): 精准命中，无噪声，信息丰富。
- 1分 (可用): 包含目标数据，但存在噪声或未排序。
- 0分 (不可用): 无结果、结果不相关或 API 报错。`,
  summary: `## Dimension 3: Summary (总结输出效果)
检查 Final Response 基于 Tool Response 的回复质量。
- 2分 (优质): 结构清晰（分点/表格），有信息增益，完全准确。
- 1分 (可用): 准确复述但平淡，无结构感。
- 0分 (不可用): 存在幻觉、拒答、格式错误或敏感内容。`
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.OVERVIEW);
  const [results, setResults] = useState<EvaluationEntry[]>([]);
  const [prompts, setPrompts] = useState<EvalPrompts>(() => {
    const saved = localStorage.getItem('eval_prompts');
    return saved ? JSON.parse(saved) : DEFAULT_PROMPTS;
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toUpperCase();
      if (Object.values(AppTab).includes(hash as AppTab)) {
        setActiveTab(hash as AppTab);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSavePrompts = (newPrompts: EvalPrompts) => {
    setPrompts(newPrompts);
    localStorage.setItem('eval_prompts', JSON.stringify(newPrompts));
  };

  const renderContent = () => {
    return (
      <div className="animate-in fade-in duration-500 h-full">
        {activeTab === AppTab.OVERVIEW && (
          <OverviewSection results={results} />
        )}
        {activeTab === AppTab.INSPECT && (
          <InspectSection 
            results={results} 
            setResults={setResults} 
            prompts={prompts} 
          />
        )}
        {activeTab === AppTab.SETTINGS && (
          <SettingsSection prompts={prompts} onSave={handleSavePrompts} />
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen apple-bg text-[#1D1D1F] overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={(tab) => {
        window.location.hash = tab.toLowerCase();
        setActiveTab(tab);
      }} />
      <main className="flex-1 relative flex flex-col overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-8 z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold tracking-tight">
              {activeTab === AppTab.OVERVIEW && 'Macro Overview'}
              {activeTab === AppTab.INSPECT && 'Detailed Inspection'}
              {activeTab === AppTab.SETTINGS && 'Engine Configuration'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {results.length > 0 ? `${results.length} Scenarios Loaded` : 'Ready'}
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto relative custom-scrollbar">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
