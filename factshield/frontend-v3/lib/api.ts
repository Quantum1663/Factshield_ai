import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export interface FeedItem {
  id?: string;
  source: string;
  status: string;
  title: string;
  description: string;
  timestamp?: string;
  type?: string;
  link?: string;
}

export interface TrendingItem {
  title: string;
  description: string;
  impact?: string;
  tag?: string;
}

export interface NeuralStats {
  memory_count?: number;
  vector_count?: number;
  cache_entries?: number;
  rate_limit_per_minute?: number;
  reasoner?: string;
  local_classifier?: string;
  vector_engine?: string;
  reranker?: string;
  ocr_available?: boolean;
  video_support?: boolean;
  groq_configured?: boolean;
  status?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface SystemStatus {
  system: string;
  model_status: string;
  dataset_entries: number;
  faiss_vectors: number;
  api_status: string;
}

export interface XaiAttribution {
  word: string;
  attribution_score?: number;
  score?: number;
}

export interface DebateTrace {
  bias_analyst: string;
  prosecutor: string;
  defense: string;
  judge: string;
}

export interface ProvenanceSignals {
  has_visual_context: boolean;
  visual_context_excerpt: string | null;
  source_mode: string;
  evidence_count: number;
  c2pa_available: boolean;
  trusted_origin: boolean;
}

export interface EvidenceCitation {
  index: number;
  relation: string;
  confidence: number;
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  kind: string;
  group: string;
  size: number;
  mentions?: number;
  relation?: string;
  confidence?: number;
}

export interface KnowledgeGraphEdge {
  from: string;
  to: string;
  label: string;
  relation: string;
  weight?: number;
}

export interface KnowledgeGraphSummary {
  entity_count: number;
  evidence_count: number;
  groups: {
    person: number;
    org: number;
    place: number;
    topic: number;
  };
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  summary: KnowledgeGraphSummary;
}

export interface VerificationResult {
  claim: string;
  verdict: string;
  veracity: {
    prediction: string;
    confidence: number | null;
  };
  toxicity: {
    prediction: string;
    confidence: number | null;
  };
  propaganda_anatomy: string;
  detected_fallacies: string[];
  c2pa_verification: {
    is_verified: boolean;
    issuer?: string;
    details: string;
  };
  provenance_signals: ProvenanceSignals;
  debate_trace: DebateTrace;
  evidence_citations: EvidenceCitation[];
  graph_relations: string[];
  generated_reason: string;
  historical_context: string | null;
  evidence: string[];
  knowledge_graph: KnowledgeGraph;
  xai_attributions: XaiAttribution[];
  xai_target_label: string;
}

export const submitVerification = async (text: string) => {
  const response = await api.post('/verify', { text });
  return response.data;
};

export const verifyImage = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/verify-image', formData);
  return response.data;
};

export const verifyVideo = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/verify-video', formData);
  return response.data;
};

export const getTaskStatus = async (taskId: string) => {
  const response = await api.get(`/task-status/${taskId}`);
  return response.data;
};

export const getIntelligenceFeed = async (): Promise<FeedItem[]> => {
  const response = await api.get<FeedItem[]>('/feed');
  return response.data;
};

export const getTrending = async (): Promise<TrendingItem[]> => {
  const response = await api.get<TrendingItem[]>('/trending');
  return response.data;
};

export const getNeuralStats = async (): Promise<NeuralStats> => {
  const response = await api.get<NeuralStats>('/neural-stats');
  return response.data;
};

export const getSystemStatus = async (): Promise<SystemStatus> => {
  const response = await api.get<SystemStatus>('/system-status');
  return response.data;
};
