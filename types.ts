
export enum AppTab {
  OVERVIEW = 'OVERVIEW',
  INSPECT = 'INSPECT',
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

/**
 * Fix for Error in file components/ImageGenSection.tsx on line 4: Module '"../types"' has no exported member 'ImageResult'.
 * Interface defining the structure of an image generation result.
 */
export interface ImageResult {
  url: string;
  prompt: string;
  timestamp: number;
}

/**
 * Fix for Error in file components/SearchSection.tsx on line 4: Module '"../types"' has no exported member 'ChatMessage'.
 * Interface defining the structure of a chat message with potential grounding URLs.
 */
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  groundingUrls?: { title: string; uri: string }[];
}
