import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import {
  BudgetChangeRequest,
  CreateRepairRequest,
  HealthStatus,
  PublicRepair,
  Repair,
  UpdateRepairRequest,
} from './repair.model';

/**
 * Centraliza todas las llamadas HTTP al backend de ReparaYa (PMV).
 * El backend vive en environment.apiUrl (p. ej. http://localhost:4000/api).
 */
@Injectable({ providedIn: 'root' })
export class RepairsService {
  private readonly http = inject(HttpClient);
  readonly apiUrl = environment.apiUrl;

  getHealth(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>(`${this.apiUrl}/health`);
  }

  getRepairs(filters: { status?: string; q?: string } = {}): Observable<Repair[]> {
    let params = new HttpParams();
    if (filters.status && filters.status !== 'Todos') params = params.set('status', filters.status);
    if (filters.q?.trim()) params = params.set('q', filters.q.trim());
    return this.http.get<Repair[]>(`${this.apiUrl}/repairs`, { params });
  }

  getRepair(folio: string): Observable<Repair> {
    return this.http.get<Repair>(`${this.apiUrl}/repairs/${encodeURIComponent(folio)}`);
  }

  createRepair(payload: CreateRepairRequest): Observable<Repair> {
    return this.http.post<Repair>(`${this.apiUrl}/repairs`, payload);
  }

  updateRepair(folio: string, payload: UpdateRepairRequest): Observable<Repair> {
    return this.http.patch<Repair>(`${this.apiUrl}/repairs/${encodeURIComponent(folio)}`, payload);
  }

  addBudgetChange(folio: string, payload: BudgetChangeRequest): Observable<Repair> {
    return this.http.post<Repair>(
      `${this.apiUrl}/repairs/${encodeURIComponent(folio)}/budget-changes`,
      payload,
    );
  }

  getPublicRepair(token: string): Observable<PublicRepair> {
    return this.http.get<PublicRepair>(`${this.apiUrl}/public/repairs/${encodeURIComponent(token)}`);
  }

  /** URL pública de solo lectura para compartir con el cliente. */
  publicRepairUrl(token: string): string {
    return `${this.apiUrl}/public/repairs/${encodeURIComponent(token)}`;
  }
}
