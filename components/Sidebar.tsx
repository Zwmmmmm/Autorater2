
import React from 'react';
import { AppTab } from '../types';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onNewEvaluation: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onNewEvaluation }) => {
  const menuItems = [
    { id: AppTab.TASKS_LIST, label: 'All Tasks', icon: 'fa-layer-group' },
    { id: AppTab.SETTINGS, label: 'Settings', icon: 'fa-gear' },
  ];

  return (
    <aside className="w-64 border-r border-gray-200 bg-white flex flex-col hidden md:flex z-20 shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-lg bg-[#1D1D1F] flex items-center justify-center">
            <i className="fas fa-apple-whole text-white text-sm"></i>
          </div>
          <span className="text-lg font-bold tracking-tight">AI Insights</span>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                activeTab === item.id || (item.id === AppTab.TASKS_LIST && (activeTab === AppTab.TASK_OVERVIEW || activeTab === AppTab.TASK_INSPECT))
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm border border-blue-100/50'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <i className={`fas ${item.icon} w-5 text-center text-sm`}></i>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 flex flex-col items-center">
        <button
          onClick={onNewEvaluation}
          title="New Evaluation"
          className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all mb-6"
        >
          <i className="fas fa-plus text-xl"></i>
        </button>

        <div className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100">
          <p className="text-[10px] text-gray-400 mb-2 font-bold uppercase tracking-widest">Evaluation Engine</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span className="text-[11px] font-medium">System Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
            <span className="text-[11px] font-medium">v2.5.1 Stable</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
