import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 6000,
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
  metadata_count?: number;
  cache_entries?: number;
  rate_limit_per_minute?: number;
  reasoner?: string;
  local_classifier?: string;
  vector_engine?: string;
  reranker?: string;
  ocr_available?: boolean;
  video_support?: boolean;
  groq_configured?: boolean;
  retrieval_status?: string;
  retrieval_message?: string;
  index_consistent?: boolean;
  status?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface SystemStatus {
  system: string;
  model_status: string;
  dataset_entries: number;
  faiss_vectors: number;
  metadata_count?: number;
  retrieval_status?: string;
  retrieval_message?: string;
  index_consistent?: boolean;
  api_status: string;
}

export interface RetrievalHealth {
  status: string;
  message: string;
  index_exists: boolean;
  metadata_exists: boolean;
  index_consistent: boolean;
  metadata_count: number;
  vector_count: number;
}

export interface InvestigationRecord {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  verdict: string;
  veracity: string;
  confidence: number | null;
  evidence_count: number;
  source_mode: string;
  summary: string;
  assignee_id?: string | null;
  assignee_name?: string | null;
}

export interface ReportRecord {
  id: string;
  title: string;
  status: string;
  owner: string;
  updated_at: string;
  verdict: string;
  confidence: number | null;
  evidence_count: number;
  summary: string;
  audience: string;
  highlights: string[];
  last_exported_at?: string | null;
  approval_status?: string;
  reviewer_notes?: string;
  reviewer_name?: string;
  approved_at?: string | null;
}

export interface ReportDetail extends ReportRecord {
  result: VerificationResult;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: string;
  contact: string;
  focus: string;
  queue: number;
  assigned_investigations: InvestigationRecord[];
}

export interface TeamWorkspace {
  summary: {
    analysts_online: number;
    cases_awaiting_approval: number;
    assignment_flow: string;
  };
  members: TeamMember[];
  investigations: InvestigationRecord[];
  unassigned_investigations: InvestigationRecord[];
  policy: {
    title: string;
    detail: string;
  };
}

export interface SettingControl {
  id: string;
  title: string;
  detail: string;
  value: string;
  status: string;
}

export interface SettingsWorkspace {
  summary: {
    control_sets: number;
    alert_routes: number;
    runtime_profile: string;
  };
  controls: SettingControl[];
  plan: {
    name: string;
    features: string[];
  };
  environment: {
    region: string;
    mode: string;
    audit_trail: string;
    retrieval: string;
  };
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

export const getRetrievalHealth = async (): Promise<RetrievalHealth> => {
  const response = await api.get<RetrievalHealth>('/retrieval-health');
  return response.data;
};

export const getInvestigations = async (): Promise<InvestigationRecord[]> => {
  const response = await api.get<InvestigationRecord[]>('/investigations');
  return response.data;
};

export const getReports = async (): Promise<ReportRecord[]> => {
  const response = await api.get<ReportRecord[]>('/reports');
  return response.data;
};

export const getReportDetail = async (reportId: string): Promise<ReportDetail> => {
  const response = await api.get<ReportDetail>(`/reports/${reportId}`);
  return response.data;
};

export const updateReportMetadata = async (
  reportId: string,
  payload: { title?: string; owner?: string; audience?: string; approval_status?: string; reviewer_notes?: string; reviewer_name?: string }
): Promise<ReportDetail> => {
  const response = await api.put<ReportDetail>(`/reports/${reportId}/metadata`, payload);
  return response.data;
};

export const downloadReport = async (reportId: string) => {
  const response = await api.get(`/reports/${reportId}/export`, { responseType: "blob" });
  return response.data;
};

export const getTeamWorkspace = async (): Promise<TeamWorkspace> => {
  const response = await api.get<TeamWorkspace>('/workspace/team');
  return response.data;
};

export const assignInvestigation = async (
  investigationId: string,
  memberId: string | null
): Promise<TeamWorkspace> => {
  const response = await api.post<TeamWorkspace>('/workspace/team/assign', {
    investigation_id: investigationId,
    member_id: memberId,
  });
  return response.data;
};

export const getSettingsWorkspace = async (): Promise<SettingsWorkspace> => {
  const response = await api.get<SettingsWorkspace>('/workspace/settings');
  return response.data;
};

export const updateWorkspaceSetting = async (
  settingId: string,
  payload: { value?: string; status?: string; detail?: string }
): Promise<SettingControl> => {
  const response = await api.put<SettingControl>(`/workspace/settings/${settingId}`, payload);
  return response.data;
};
