export type MeshModuleType = 'dia8' | 'dia9' | 'bando' | 'quiz' | 'hub';

export interface GeoEntityPayload {
  topicId: string;
  category: 'L8_NATURAL' | 'L9_SOCIO_ECON' | 'SKILL_GRAPH' | 'HSG_STRATEGY';
  title: string;
  targetModule: MeshModuleType;
  metadata?: {
    lat?: number;
    lng?: number;
    zoomLevel?: number;
    layerId?: string;
    datasetKey?: string;
  };
  timestamp: number;
}

export interface MeshEventMessage {
  protocol: 'TEACHER_OS_MESH_V1';
  source: 'chat-expert';
  event: 'NAVIGATE_TOPIC' | 'REQUEST_ASSESSMENT' | 'SYNC_FACTS';
  payload: GeoEntityPayload;
}
