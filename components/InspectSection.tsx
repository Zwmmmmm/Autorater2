
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { EvaluationEntry, EvalPrompts } from '../types';

interface InspectSectionProps {
  results: EvaluationEntry[];
  setResults: (data: EvaluationEntry[]) => void;
  prompts: EvalPrompts;
}

const buildSystemInstruction = (prompts: EvalPrompts) => `# Role
你是一个专用于大模型应用评测的自动化评估引擎（Evaluation Engine）。你的核心任务是接收批量测试数据，进行多维度的质量打分，并输出结构化的 JSON 数据。

# Context Note
注意：在输入数据中，agent_output、tool_response 和 final_response 可能共用同一个 "log" 文本。你需要从该日志文本中解析出模型的编排意图、工具返回的具体结果以及给用户的最终回复，然后基于这些提取出的信息进行评估。

# Style & Tone
- 风格：Objective (客观), Analytical (分析性), Concise (简洁)。
- 输出：仅输出标准的 JSON 格式，严禁包含 markdown 代码块标记。

# Workflow
1. Query Categorization (Simple_Basic, Complex_Reasoning, Multi_turn_Clarification, Ambiguity_Robustness)

${prompts.orchestration}

${prompts.tool}

${prompts.summary}

# Output Format
严格输出 JSON：
{
  "category": "String",
  "orchestration_eval": { "score": Integer (0-2), "reason": "String" },
  "tool_eval": { "score": Integer (0-2), "reason": "String" },
  "summary_eval": { "score": Integer (0-2), "reason": "String" }
}`;

interface RawCSVRow {
  query: string;
  log: string;
  tool: string;
}

const InspectSection: React.FC<InspectSectionProps> = ({ results, setResults, prompts }) => {
  const [rawRows, setRawRows] = useState<RawCSVRow[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<EvaluationEntry | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 辅助函数：显示临时反馈信息
  const notify = (msg: string) => {
    setStatusMessage(msg);
    console.log(`[Eval System]: ${msg}`);
    setTimeout(() => setStatusMessage(null), 3000);
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
    // 灵活匹配表头
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

  const handleFile = (file: File) => {
    notify(`Detected file: ${file.name}`);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const rows = parseCSV(content);
      if (rows.length > 0) {
        notify(`Parsed ${rows.length} rows successfully.`);
        setRawRows(rows);
        setResults([]);
        setSelectedEntry(null);
        // 自动触发评估逻辑
        triggerEvaluation(rows);
      } else {
        notify('Failed to parse CSV. Check your headers.');
      }
    };
    reader.onerror = () => notify('Error reading file.');
    reader.readAsText(file);
  };

  const triggerEvaluation = async (rowsToProcess: RawCSVRow[]) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setProgress(0);
    notify('Starting automated evaluation...');

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const dynamicResults: EvaluationEntry[] = [];
    const dynamicSystemInstruction = buildSystemInstruction(prompts);

    for (let i = 0; i < rowsToProcess.length; i++) {
      const row = rowsToProcess[i];
      const payload = {
        user_query: row.query,
        ground_truth: row.tool,
        agent_output: row.log,
        tool_response: row.log,
        final_response: row.log
      };

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: JSON.stringify(payload),
          config: {
            systemInstruction: dynamicSystemInstruction,
            responseMimeType: "application/json"
          }
        });

        const evalData = JSON.parse(response.text || '{}');
        const entry: EvaluationEntry = {
          id: `Case-${i + 1}`,
          user_query: row.query, // Parsed User Instruction
          category: evalData.category || 'Standard',
          ground_truth: row.tool, // Correct Ground Truth
          agent_output: row.log, // Raw Log
          tool_name: row.tool,
          tool_response: row.log,
          final_response: row.log,
          orchestration_eval: evalData.orchestration_eval || { score: 0, reason: 'Pending Analysis' },
          tool_eval: evalData.tool_eval || { score: 0, reason: 'Pending Analysis' },
          summary_eval: evalData.summary_eval || { score: 0, reason: 'Pending Analysis' },
          timestamp: Date.now()
        };

        dynamicResults.push(entry);
        setResults([...dynamicResults]);
        if (i === 0) setSelectedEntry(entry);
      } catch (err) {
        console.error(`Evaluation Error (Row ${i}):`, err);
      }
      setProgress(((i + 1) / rowsToProcess.length) * 100);
    }
    setIsProcessing(false);
    notify('Evaluation completed.');
  };

  const ScoreBadge = ({ score }: { score: number }) => {
    const colors = ['bg-red-100 text-red-600', 'bg-orange-100 text-orange-600', 'bg-green-100 text-green-600'];
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[score]}`}>{score} PTS</span>;
  };

  // UI 处理：点击上传区域
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset to allow same file re-upload
      fileInputRef.current.click();
    }
  };

  // UI 处理：文件选择
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  if (rawRows.length === 0 && results.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <input 
          type="file" 
          accept=".csv" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleInputChange} 
        />
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => { 
            e.preventDefault(); 
            setIsDragOver(false); 
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file); 
          }}
          onClick={handleUploadClick}
          className={`w-full max-w-2xl apple-card p-16 border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer ${
            isDragOver ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
          }`}
        >
          <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center mb-6">
            <i className={`fas fa-file-csv text-blue-500 text-3xl ${isProcessing ? 'fa-spin' : ''}`}></i>
          </div>
          <h2 className="text-2xl font-bold mb-2">批量上传评测数据集</h2>
          <p className="text-gray-500 mb-8 text-center max-w-sm text-sm">
            支持拖拽或点击上传 <b>.csv</b> 文件。需包含列：<i>Query, Log, Correct Tool</i>。
          </p>
          <button className="px-10 py-3 rounded-full bg-[#1D1D1F] text-white font-semibold shadow-lg shadow-black/10 hover:bg-gray-800 transition-colors">
            选择文件并开始评估
          </button>
          
          {statusMessage && (
            <div className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold animate-pulse">
              {statusMessage}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col gap-6 max-w-[1600px] mx-auto overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
             <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">分析进度</span>
             <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
               <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
             </div>
             <span className="text-xs font-bold text-blue-600">{Math.round(progress)}%</span>
          </div>
          {statusMessage && <span className="text-xs font-medium text-blue-400 animate-pulse">{statusMessage}</span>}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => triggerEvaluation(rawRows)} 
            disabled={isProcessing || rawRows.length === 0}
            className="px-6 py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/10"
          >
            {isProcessing ? <i className="fas fa-sync fa-spin"></i> : <i className="fas fa-play"></i>}
            {isProcessing ? '评估中...' : '重新评估'}
          </button>
          <button 
            onClick={() => { setRawRows([]); setResults([]); setProgress(0); setSelectedEntry(null); }}
            className="px-6 py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-500 text-sm font-bold hover:text-red-500 transition-all shadow-sm"
          >
            重置任务
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-8 overflow-hidden min-h-0">
        <div className="w-80 md:w-96 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar pb-4">
            {results.map(entry => (
              <button
                key={entry.id} onClick={() => setSelectedEntry(entry)}
                className={`w-full text-left p-4 rounded-2xl transition-all border ${
                  selectedEntry?.id === entry.id ? 'bg-[#1D1D1F] border-gray-900 text-white shadow-md' : 'bg-white border-transparent hover:border-gray-200 text-gray-900 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${selectedEntry?.id === entry.id ? 'text-gray-400' : 'text-gray-400'}`}>
                    {entry.category.replace('_', ' ')}
                  </span>
                  {selectedEntry?.id !== entry.id && <ScoreBadge score={entry.orchestration_eval.score} />}
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
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-sm ${step.eval.score === 2 ? 'bg-emerald-500 text-white' : step.eval.score === 1 ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'}`}>
                          <i className={`fas ${step.icon}`}></i>
                        </div>
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400">{step.label}</h4>
                          <ScoreBadge score={step.eval.score} />
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
              <p className="text-sm font-medium">请从左侧列表选择一条评测结果进行查看</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InspectSection;
