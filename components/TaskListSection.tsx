
import React from 'react';
import { EvalTask } from '../types';

interface TaskListSectionProps {
  tasks: EvalTask[];
  onSelectTask: (task: EvalTask) => void;
  onDeleteTask: (id: string) => void;
}

const TaskListSection: React.FC<TaskListSectionProps> = ({ tasks, onSelectTask, onDeleteTask }) => {
  if (tasks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center mb-6">
          <i className="fas fa-box-open text-gray-300 text-2xl"></i>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No History Found</h2>
        <p className="text-gray-500 text-sm max-w-sm text-center">
          Click the "+" button in the sidebar to upload a CSV and start your first evaluation.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Historical Evaluations</h2>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'} Saved
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tasks.map((task) => (
          <div 
            key={task.id} 
            className="apple-card p-6 flex items-center justify-between group hover:border-blue-200 transition-all cursor-pointer"
            onClick={() => onSelectTask(task)}
          >
            <div className="flex items-center gap-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${
                task.status === 'processing' ? 'bg-blue-50 text-blue-500 animate-pulse' : 'bg-green-50 text-green-500'
              }`}>
                <i className={`fas ${task.status === 'processing' ? 'fa-spinner fa-spin' : 'fa-circle-check'}`}></i>
              </div>
              <div>
                <h3 className="text-lg font-bold group-hover:text-blue-600 transition-colors">{task.fileName}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                  <span>{new Date(task.timestamp).toLocaleString()}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span>{task.summary.total} Scenarios</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Avg Score</p>
                <p className="text-xl font-black text-gray-900">{task.summary.avgScore}<span className="text-xs font-normal text-gray-400 ml-0.5">/2.0</span></p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pass Rate</p>
                <p className={`text-xl font-black ${task.summary.passRate >= 80 ? 'text-green-500' : 'text-orange-500'}`}>
                  {task.summary.passRate}%
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onSelectTask(task); }}
                  className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                  title="View Report"
                >
                  <i className="fas fa-chart-simple text-xs"></i>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                  className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                  title="Delete Task"
                >
                  <i className="fas fa-trash-can text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskListSection;
