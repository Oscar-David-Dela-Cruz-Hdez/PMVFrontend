export type RepairStatus =
  | 'received'
  | 'diagnosis'
  | 'waiting_authorization'
  | 'in_repair'
  | 'waiting_part'
  | 'ready_for_pickup'
  | 'delivered'
  | 'cancelled';

export const REPAIR_STATUSES: RepairStatus[] = [
  'received',
  'diagnosis',
  'waiting_authorization',
  'in_repair',
  'waiting_part',
  'ready_for_pickup',
  'delivered',
  'cancelled',
];

export type AuthorizationStatus = 'pending' | 'approved' | 'rejected' | 'not_applicable';

export const STATUS_LABELS: Record<RepairStatus, string> = {
  received: 'Recibido',
  diagnosis: 'En diagnóstico',
  waiting_authorization: 'Esperando autorización',
  in_repair: 'En reparación',
  waiting_part: 'Esperando refacción',
  ready_for_pickup: 'Listo para recoger',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const AUTH_LABELS: Record<AuthorizationStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  not_applicable: 'No aplica',
};

// ---------- Autenticación de demostración ----------

export interface AuthUser {
  id: string;
  workshopCode: string | null;
  displayName: string;
  role: 'repairer' | 'admin';
}

export interface LoginRequest {
  workshopCode?: string;
  username?: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// ---------- Experimento E1 ----------

export type AssistanceLevel = 'none' | 'partial' | 'total';

export const ASSISTANCE_LABELS: Record<AssistanceLevel, string> = {
  none: 'Sin ayuda (autónomo)',
  partial: 'Parcial',
  total: 'Total',
};

export type IncidentType =
  | 'access_error' | 'network_error' | 'data_entry_error' | 'late_capture'
  | 'support_requested' | 'withdrawal' | 'privacy_incident' | 'other';

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  access_error: 'Error de acceso',
  network_error: 'Error de red',
  data_entry_error: 'Error de captura de datos',
  late_capture: 'Captura tardía',
  support_requested: 'Apoyo solicitado',
  withdrawal: 'Retiro',
  privacy_incident: 'Incidente de privacidad',
  other: 'Otro',
};

export interface ExperimentRecord {
  id: string;
  experimentId: 'E1';
  workshopCode: string;
  repairId: string;
  repairFolio: string;
  journeyNumber: number;
  isEligible: boolean;
  eligibilityReason?: string | null;
  requiredEvents: number;
  timelyEvents: number;
  isCompleteAndTimely: boolean;
  captureAttempted: boolean;
  captureStartedAt?: string | null;
  captureCompletedAt?: string | null;
  additionalMinutes?: number | null;
  assistanceLevel: AssistanceLevel;
  assistanceNote?: string | null;
  pmvVersion: string;
  incidentId?: string | null;
  observations?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentRecordRequest {
  repairFolio: string;
  journeyNumber: number;
  isEligible: boolean;
  eligibilityReason?: string;
  requiredEvents: number;
  timelyEvents: number;
  captureAttempted: boolean;
  captureStartedAt?: string | null;
  captureCompletedAt?: string | null;
  additionalMinutes?: number | null;
  assistanceLevel: AssistanceLevel;
  assistanceNote?: string;
  incidentId?: string;
  observations?: string;
  pmvVersion?: string;
}

export interface ExperimentIncident {
  id: string;
  experimentId: string;
  incidentId: string;
  workshopCode: string;
  journeyNumber: number;
  date: string;
  type: IncidentType;
  description: string;
  impact?: string | null;
  actionTaken?: string | null;
  resolution?: string | null;
  createdAt: string;
}

export interface ExperimentIncidentRequest {
  workshopCode?: string;
  journeyNumber: number;
  date: string;
  type: IncidentType;
  description: string;
  impact?: string;
  actionTaken?: string;
  resolution?: string;
  incidentId?: string;
}

export type ResultadoInterpretabilidad = 'apoyo exploratorio' | 'no cumple' | 'no interpretable' | 'detención';

export interface WorkshopSummary {
  workshopCode: string;
  jornadasRealizadas: number;
  nElegibles: number;
  cCompletos: number;
  aCompletosSinAyuda: number;
  completitudPorcentaje: number | null;
  autonomiaPorcentaje: number | 'no definida';
  tiemposMedidos: number;
  intentosDeCaptura: number;
  porcentajeTiemposMedidos: number | null;
  medianaMinutosAdicionales: number | null;
  incidentesGraves: number;
  resultadoInterpretabilidad: ResultadoInterpretabilidad;
}

export interface ExperimentSummary {
  experimentId: string;
  pmvVersion: string;
  generadoEn: string;
  umbrales: { completitud: number; autonomia: number; medianaMinutos: number; tiemposMedidos: number };
  porTaller: WorkshopSummary[];
  agregado: Omit<WorkshopSummary, 'workshopCode'> & { totalElegibles: number };
}

export interface TimelineEntry {
  status: RepairStatus;
  note?: string;
  createdAt: string;
}

export interface BudgetChange {
  reason: string;
  amount: number;
  authorizationStatus: AuthorizationStatus;
  authorizationNote?: string;
  createdAt: string;
}

export interface Repair {
  id?: string;
  folio: string;
  clientAlias?: string | null;
  deviceType: string;
  reportedIssue: string;
  diagnosis?: string | null;
  initialBudget?: number | null;
  estimatedDate?: string | null;
  status: RepairStatus;
  timeline: TimelineEntry[];
  budgetChanges: BudgetChange[];
  publicToken?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRepairRequest {
  folio: string;
  deviceType: string;
  reportedIssue: string;
  status: RepairStatus;
  clientAlias?: string;
  diagnosis?: string;
  initialBudget?: number;
  estimatedDate?: string;
}

export interface UpdateRepairRequest {
  status?: RepairStatus;
  diagnosis?: string | null;
  initialBudget?: number | null;
  estimatedDate?: string | null;
}

export interface BudgetChangeRequest {
  reason: string;
  amount: number;
  authorizationStatus: AuthorizationStatus;
  authorizationNote?: string;
}

/** Vista pública de solo lectura (sin notas internas ni datos sensibles). */
export interface PublicRepair {
  folio: string;
  deviceType: string;
  reportedIssue: string;
  diagnosis: string | null;
  status: RepairStatus;
  initialBudget: number | null;
  estimatedDate: string | null;
  timeline: Array<{ status: RepairStatus; createdAt: string }>;
  budgetChanges: Array<{
    reason: string;
    amount: number;
    authorizationStatus: AuthorizationStatus;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface HealthStatus {
  status: string;
  backend: string;
  mongodb: string;
  database?: string;
  timestamp?: string;
}
