
export enum AppTab {
  TASKS_LIST = 'TASKS_LIST',
  TASK_OVERVIEW = 'TASK_OVERVIEW',
  TASK_INSPECT = 'TASK_INSPECT',
  SETTINGS = 'SETTINGS'
}

export interface EvalPrompts {
  orchestration: string;
  tool: string;
  summary: string;
}

export interface EvalStep {
  score: number;
  reason: string;
  rawData?: any;
}

export interface EvaluationEntry {
  id: string;
  user_query: string;
  category: string;
  ground_truth: string;
  agent_output: string;
  tool_name: string;
  tool_response: string;
  final_response: string;
  orchestration_eval: EvalStep;
  tool_eval: EvalStep;
  summary_eval: EvalStep;
  timestamp: number;
}

export interface EvalTask {
  id: string;
  fileName: string;
  timestamp: number;
  status: 'processing' | 'done';
  data: EvaluationEntry[];
  summary: {
    avgScore: number;
    total: number;
    passRate: number;
  };
}

export interface ImageResult {
  url: string;
  prompt: string;
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  groundingUrls?: { title: string; uri: string }[];
}
