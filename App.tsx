
import React, { useState, useEffect, useRef } from 'react';
import { AppTab, EvalPrompts, EvaluationEntry, EvalTask } from './types';
import Sidebar from './components/Sidebar';
import OverviewSection from './components/OverviewSection';
import InspectSection from './components/InspectSection';
import SettingsSection from './components/SettingsSection';
import TaskListSection from './components/TaskListSection';
import { GoogleGenAI } from '@google/genai';

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

const buildSystemInstruction = (prompts: EvalPrompts) => `# Role
你是一个专用于大模型应用评测的自动化评估引擎。你的核心任务是接收批量测试数据，进行多维度的质量打分，并输出结构化的 JSON 数据。
# Workflow
1. Query Categorization (Simple_Basic, Complex_Reasoning, Multi_turn_Clarification, Ambiguity_Robustness)
${prompts.orchestration}
${prompts.tool}
${prompts.summary}
# Output Format
严格输出 JSON：
{
  "category": "String",
  "orchestration_eval": { "score": 0|1|2, "reason": "String" },
  "tool_eval": { "score": 0|1|2, "reason": "String" },
  "summary_eval": { "score": 0|1|2, "reason": "String" }
}`;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.TASKS_LIST);
  const [tasks, setTasks] = useState<EvalTask[]>(() => {
    const saved = localStorage.getItem('eval_tasks_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<EvalPrompts>(() => {
    const saved = localStorage.getItem('eval_prompts');
    return saved ? JSON.parse(saved) : DEFAULT_PROMPTS;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('eval_tasks_history', JSON.stringify(tasks));
  }, [tasks]);

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const handleSavePrompts = (newPrompts: EvalPrompts) => {
    setPrompts(newPrompts);
    localStorage.setItem('eval_prompts', JSON.stringify(newPrompts));
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    const parseLine = (line: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map(h => h.toLowerCase());
    const qIdx = headers.findIndex(h => h.includes('query') || h.includes('指令'));
    const lIdx = headers.findIndex(h => h.includes('log') || h.includes('日志'));
    const tIdx = headers.findIndex(h => h.includes('tool') || h.includes('工具'));

    if (qIdx === -1) {
      alert('CSV 缺少必要的 "Query" 列');
      return [];
    }

    return lines.slice(1).map(line => {
      const cols = parseLine(line);
      return {
        query: cols[qIdx] || '',
        log: lIdx !== -1 ? cols[lIdx] : '',
        tool: tIdx !== -1 ? cols[tIdx] : ''
      };
    }).filter(row => row.query);
  };

  const runTaskEvaluation = async (taskId: string, rows: any[]) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const dynamicResults: EvaluationEntry[] = [];
    const sysInst = buildSystemInstruction(prompts);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let entry: EvaluationEntry | null = null;
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: JSON.stringify({ user_query: row.query, ground_truth: row.tool, log: row.log }),
            config: {
              systemInstruction: sysInst,
              responseMimeType: "application/json"
            }
          });

          const evalData = JSON.parse(response.text || '{}');
          entry = {
            id: `Case-${Date.now()}-${i}`,
            user_query: row.query,
            category: evalData.category || 'Standard',
            ground_truth: row.tool,
            agent_output: row.log,
            tool_name: row.tool,
            tool_response: row.log,
            final_response: row.log,
            orchestration_eval: evalData.orchestration_eval || { score: 0, reason: 'N/A' },
            tool_eval: evalData.tool_eval || { score: 0, reason: 'N/A' },
            summary_eval: evalData.summary_eval || { score: 0, reason: 'N/A' },
            timestamp: Date.now()
          };
          break;
        } catch (err: any) {
          attempts++;
          const is429 = err.message?.includes('429') || err.status === 429;
          if (is429 && attempts < maxAttempts) {
            console.log(`Quota reached for row ${i}, waiting 10s...`);
            await sleep(10000);
          } else {
            entry = {
              id: `Err-${Date.now()}-${i}`,
              user_query: row.query,
              category: 'Error',
              ground_truth: row.tool,
              agent_output: row.log,
              tool_name: row.tool,
              tool_response: row.log,
              final_response: row.log,
              orchestration_eval: { score: 0, reason: `API Error: ${err.message}` },
              tool_eval: { score: 0, reason: 'Error' },
              summary_eval: { score: 0, reason: 'Error' },
              timestamp: Date.now()
            };
            break;
          }
        }
      }

      if (entry) {
        dynamicResults.push(entry);
        // Partial update to show progress
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, data: [...dynamicResults] } : t));
      }

      if (i < rows.length - 1) await sleep(3000);
    }

    // Finalize summary
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const total = t.data.length;
        const totalPoints = t.data.reduce((acc, curr) => acc + (curr.orchestration_eval.score + curr.tool_eval.score + curr.summary_eval.score), 0);
        const avg = total > 0 ? (totalPoints / (total * 3)) : 0;
        const passCount = t.data.filter(e => (e.orchestration_eval.score + e.tool_eval.score + e.summary_eval.score) / 3 >= 1.5).length;
        const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0;

        return {
          ...t,
          status: 'done',
          summary: {
            avgScore: Number(avg.toFixed(1)),
            total,
            passRate
          }
        };
      }
      return t;
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const rows = parseCSV(content);
      if (rows.length === 0) return;

      const newId = `task-${Date.now()}`;
      const newTask: EvalTask = {
        id: newId,
        fileName: file.name,
        timestamp: Date.now(),
        status: 'processing',
        data: [],
        summary: { avgScore: 0, total: rows.length, passRate: 0 }
      };

      setTasks(prev => [newTask, ...prev]);
      setActiveTaskId(newId);
      setActiveTab(AppTab.TASK_OVERVIEW);
      runTaskEvaluation(newId, rows);
    };
    reader.readAsText(file);
  };

  const activeTask = tasks.find(t => t.id === activeTaskId);

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (activeTaskId === id) setActiveTaskId(null);
  };

  return (
    <div className="flex h-screen apple-bg text-[#1D1D1F] overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onNewEvaluation={() => fileInputRef.current?.click()} 
      />
      
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".csv" 
        onChange={handleFileUpload} 
      />

      <main className="flex-1 relative flex flex-col overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-8 z-10 sticky top-0">
          <div className="flex items-center gap-3">
            {(activeTab === AppTab.TASK_OVERVIEW || activeTab === AppTab.TASK_INSPECT) && (
              <button 
                onClick={() => setActiveTab(AppTab.TASKS_LIST)} 
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
            )}
            <h1 className="text-lg font-semibold tracking-tight">
              {activeTab === AppTab.TASKS_LIST && 'All Tasks'}
              {activeTab === AppTab.TASK_OVERVIEW && `Overview: ${activeTask?.fileName}`}
              {activeTab === AppTab.TASK_INSPECT && `Details: ${activeTask?.fileName}`}
              {activeTab === AppTab.SETTINGS && 'Engine Configuration'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {activeTab === AppTab.TASK_OVERVIEW && activeTask && (
              <button 
                onClick={() => setActiveTab(AppTab.TASK_INSPECT)}
                className="px-4 py-1.5 bg-[#1D1D1F] text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors shadow-sm"
              >
                View Details
              </button>
            )}
            {activeTask?.status === 'processing' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-[10px] font-bold uppercase tracking-wider text-blue-600 border border-blue-100 animate-pulse">
                <i className="fas fa-spinner fa-spin"></i>
                Rate Limited Processing...
              </div>
            )}
          </div>
        </header>
        
        <div className="flex-1 overflow-auto relative custom-scrollbar">
          {activeTab === AppTab.TASKS_LIST && (
            <TaskListSection 
              tasks={tasks} 
              onSelectTask={(task) => { setActiveTaskId(task.id); setActiveTab(AppTab.TASK_OVERVIEW); }}
              onDeleteTask={deleteTask}
            />
          )}
          {activeTab === AppTab.TASK_OVERVIEW && activeTask && (
            <OverviewSection results={activeTask.data} />
          )}
          {activeTab === AppTab.TASK_INSPECT && activeTask && (
            <InspectSection results={activeTask.data} prompts={prompts} setResults={() => {}} />
          )}
          {activeTab === AppTab.SETTINGS && (
            <SettingsSection prompts={prompts} onSave={handleSavePrompts} />
          )}
          
          {(activeTab === AppTab.TASK_OVERVIEW || activeTab === AppTab.TASK_INSPECT) && !activeTask && (
            <div className="h-full flex items-center justify-center text-gray-400">
               <p>No active task selected. Please go to History.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
