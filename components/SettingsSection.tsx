
import React, { useState } from 'react';
import { EvalPrompts } from '../types';

interface SettingsSectionProps {
  prompts: EvalPrompts;
  onSave: (newPrompts: EvalPrompts) => void;
}

type TabKey = keyof EvalPrompts;

const SettingsSection: React.FC<SettingsSectionProps> = ({ prompts, onSave }) => {
  const [localPrompts, setLocalPrompts] = useState<EvalPrompts>(prompts);
  const [activeTab, setActiveTab] = useState<TabKey>('orchestration');
  const [showToast, setShowToast] = useState(false);

  const handleSave = () => {
    onSave(localPrompts);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'orchestration', label: 'Orchestration', icon: 'fa-compass' },
    { key: 'tool', label: 'Tool Output', icon: 'fa-code-branch' },
    { key: 'summary', label: 'Summary', icon: 'fa-message' },
  ];

  return (
    <div className="p-8 h-full flex flex-col max-w-[1200px] mx-auto overflow-hidden">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Evaluation Criteria</h2>
        <p className="text-gray-500 text-sm">Fine-tune the scoring logic and reasoning instructions for the evaluation model.</p>
      </div>

      <div className="flex-1 apple-card flex overflow-hidden">
        {/* Left Side List */}
        <div className="w-64 border-r border-gray-100 p-4 space-y-2 bg-gray-50/30">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                activeTab === tab.key
                  ? 'bg-white shadow-sm border border-gray-100 text-blue-600 font-bold'
                  : 'text-gray-500 hover:bg-white/50'
              }`}
            >
              <i className={`fas ${tab.icon} w-4 text-center text-sm`}></i>
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right Side Content */}
        <div className="flex-1 flex flex-col p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 capitalize">{activeTab} Scoring Logic</h3>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded">
              Standard: 0-2 Points
            </span>
          </div>

          <div className="flex-1 relative mb-6">
            <textarea
              value={localPrompts[activeTab]}
              onChange={(e) => setLocalPrompts({ ...localPrompts, [activeTab]: e.target.value })}
              className="w-full h-full bg-gray-50 rounded-2xl p-6 text-sm font-mono text-gray-600 border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none leading-relaxed"
              placeholder={`Enter instructions for evaluating ${activeTab}...`}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setLocalPrompts(prompts)}
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-all"
            >
              Reset to Default
            </button>
            <button
              onClick={handleSave}
              className="px-8 py-2.5 rounded-full bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-500 active:scale-95 transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 apple-card px-6 py-3 bg-white/90 backdrop-blur shadow-2xl flex items-center gap-3 border border-blue-100 animate-bounce">
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <i className="fas fa-check text-white text-[10px]"></i>
          </div>
          <span className="text-sm font-bold text-gray-800">Prompt Configuration Updated</span>
        </div>
      )}
    </div>
  );
};

export default SettingsSection;
