import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import {
  ExperimentIncident,
  ExperimentIncidentRequest,
  ExperimentRecord,
  ExperimentRecordRequest,
  ExperimentSummary,
} from './repair.model';

/** Centraliza las llamadas HTTP del experimento E1 (autenticadas por el interceptor). */
@Injectable({ providedIn: 'root' })
export class ExperimentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getRecords(filters: { workshopCode?: string; repairFolio?: string; journeyNumber?: number } = {}): Observable<ExperimentRecord[]> {
    let params = new HttpParams();
    if (filters.workshopCode) params = params.set('workshopCode', filters.workshopCode);
    if (filters.repairFolio) params = params.set('repairFolio', filters.repairFolio);
    if (filters.journeyNumber) params = params.set('journeyNumber', String(filters.journeyNumber));
    return this.http.get<ExperimentRecord[]>(`${this.apiUrl}/experiment-records`, { params });
  }

  createRecord(payload: ExperimentRecordRequest): Observable<ExperimentRecord> {
    return this.http.post<ExperimentRecord>(`${this.apiUrl}/experiment-records`, payload);
  }

  updateRecord(id: string, payload: Partial<ExperimentRecordRequest>): Observable<ExperimentRecord> {
    return this.http.patch<ExperimentRecord>(`${this.apiUrl}/experiment-records/${encodeURIComponent(id)}`, payload);
  }

  /** Resumen agregado E1 (solo cuenta admin / equipo investigador). */
  getSummary(): Observable<ExperimentSummary> {
    return this.http.get<ExperimentSummary>(`${this.apiUrl}/experiment-records/summary`);
  }

  getIncidents(filters: { workshopCode?: string; type?: string; journeyNumber?: number } = {}): Observable<ExperimentIncident[]> {
    let params = new HttpParams();
    if (filters.workshopCode) params = params.set('workshopCode', filters.workshopCode);
    if (filters.type) params = params.set('type', filters.type);
    if (filters.journeyNumber) params = params.set('journeyNumber', String(filters.journeyNumber));
    return this.http.get<ExperimentIncident[]>(`${this.apiUrl}/experiment-incidents`, { params });
  }

  createIncident(payload: ExperimentIncidentRequest): Observable<ExperimentIncident> {
    return this.http.post<ExperimentIncident>(`${this.apiUrl}/experiment-incidents`, payload);
  }
}
