import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { ExperimentService } from './experiment.service';
import {
  ExperimentIncident, INCIDENT_TYPE_LABELS, IncidentType,
} from './repair.model';

interface IncidentFormModel {
  workshopCode: string;
  journeyNumber: number | null;
  date: string;
  type: IncidentType;
  description: string;
  impact: string;
  actionTaken: string;
  resolution: string;
  incidentId: string;
}

/** Pantalla de incidencias E1: listar (taller propio o todos si admin) y registrar. */
@Component({
  selector: 'app-incidents',
  imports: [RouterLink, FormsModule, DatePipe],
  template: `
    <main class="page">
      <header class="page-head">
        <div>
          <p class="eyebrow">Experimento E1</p>
          <h1>Incidencias</h1>
          <p class="page-sub">Registro de incidentes operativos por taller y jornada. {{ auth.user()?.role === 'admin' ? 'Como equipo investigador ves todos los talleres.' : 'Solo ves las incidencias de tu taller (' + (auth.user()?.workshopCode ?? '') + ').' }}</p>
        </div>
        <a class="secondary-button" routerLink="/">← Volver al panel</a>
      </header>

      <div class="incidents-grid">
        <form class="card mini-form" (ngSubmit)="save()">
          <h3>Registrar incidencia</h3>
          @if (formError()) { <p class="banner error" role="alert">{{ formError() }}</p> }
          @if (formSuccess()) { <p class="banner success" role="status">{{ formSuccess() }}</p> }
          @if (auth.user()?.role === 'admin') {
            <label>Taller
              <select name="incWorkshop" [(ngModel)]="form.workshopCode">
                <option value="E1-T01">E1-T01</option>
                <option value="E1-T02">E1-T02</option>
                <option value="E1-T03">E1-T03</option>
              </select>
            </label>
          }
          <div class="form-grid">
            <label>Jornada (1–7) <span class="req">*</span><input type="number" name="incJourney" min="1" max="7" [(ngModel)]="form.journeyNumber"></label>
            <label>Fecha <span class="req">*</span><input type="date" name="incDate" [(ngModel)]="form.date"></label>
          </div>
          <label>Tipo <span class="req">*</span>
            <select name="incType" [(ngModel)]="form.type">
              @for (t of incidentTypes; track t) { <option [value]="t">{{ typeLabel(t) }}</option> }
            </select>
          </label>
          <label>Descripción <span class="req">*</span><textarea name="incDesc" rows="3" [(ngModel)]="form.description" placeholder="Qué pasó (sin datos sensibles)"></textarea></label>
          <label>ID de incidencia (opcional)<input type="text" name="incId" [(ngModel)]="form.incidentId" placeholder="Se genera automático si lo dejas vacío"></label>
          <label>Impacto<textarea name="incImpact" rows="2" [(ngModel)]="form.impact"></textarea></label>
          <label>Acción tomada<textarea name="incAction" rows="2" [(ngModel)]="form.actionTaken"></textarea></label>
          <label>Resolución<textarea name="incResolution" rows="2" [(ngModel)]="form.resolution"></textarea></label>
          <button class="primary-button" type="submit" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Registrar incidencia' }}</button>
        </form>

        <section class="card">
          <h3>Incidencias registradas</h3>
          @if (loadError()) { <div class="banner error" role="alert">{{ loadError() }} <button class="secondary-button" type="button" (click)="load()">Reintentar</button></div> }
          @if (loading()) { <p class="empty">Cargando incidencias…</p> }
          @if (incidents().length) {
            <ul class="incident-list">
              @for (inc of incidents(); track inc.id) {
                <li>
                  <div class="incident-head">
                    <strong>{{ inc.incidentId }}</strong>
                    <em [class]="'auth-chip ' + (inc.type === 'privacy_incident' || inc.type === 'withdrawal' ? 'rejected' : 'pending')">{{ typeLabel(inc.type) }}</em>
                  </div>
                  <p>{{ inc.description }}</p>
                  <small class="t-date">{{ inc.workshopCode }} · jornada {{ inc.journeyNumber }} · {{ inc.date | date:'dd/MM/yyyy' }} · registrado {{ inc.createdAt | date:'dd/MM/yyyy HH:mm' }}</small>
                  @if (inc.impact || inc.actionTaken || inc.resolution) {
                    <small class="t-note">Impacto: {{ inc.impact || '—' }} · Acción: {{ inc.actionTaken || '—' }} · Resolución: {{ inc.resolution || '—' }}</small>
                  }
                </li>
              }
            </ul>
          } @else if (!loading()) { <p class="empty">Sin incidencias registradas.</p> }
        </section>
      </div>
    </main>
  `,
})
export class IncidentsComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly exp = inject(ExperimentService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly incidentTypes = Object.keys(INCIDENT_TYPE_LABELS) as IncidentType[];
  protected readonly typeLabel = (t: IncidentType) => INCIDENT_TYPE_LABELS[t];

  protected readonly incidents = signal<ExperimentIncident[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly formSuccess = signal<string | null>(null);

  protected form: IncidentFormModel = {
    workshopCode: 'E1-T01',
    journeyNumber: null,
    date: '',
    type: 'other',
    description: '',
    impact: '',
    actionTaken: '',
    resolution: '',
    incidentId: '',
  };

  ngOnInit(): void {
    if (this.isBrowser) void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.incidents.set(await firstValueFrom(this.exp.getIncidents()));
    } catch (error) {
      this.loadError.set(error instanceof HttpErrorResponse
        ? ((error.error as { error?: string })?.error ?? `Error del servidor (${error.status}).`)
        : 'Error de red al cargar incidencias.');
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    this.formError.set(null);
    this.formSuccess.set(null);
    const f = this.form;
    if (!f.journeyNumber || f.journeyNumber < 1 || f.journeyNumber > 7) {
      this.formError.set('La jornada debe ser un entero de 1 a 7.');
      return;
    }
    if (!f.date) {
      this.formError.set('Indica la fecha del incidente.');
      return;
    }
    if (!f.description.trim()) {
      this.formError.set('La descripción es obligatoria.');
      return;
    }
    this.saving.set(true);
    try {
      const payload = {
        ...(this.auth.user()?.role === 'admin' ? { workshopCode: f.workshopCode } : {}),
        journeyNumber: Number(f.journeyNumber),
        date: f.date,
        type: f.type,
        description: f.description.trim(),
        ...(f.impact.trim() ? { impact: f.impact.trim() } : {}),
        ...(f.actionTaken.trim() ? { actionTaken: f.actionTaken.trim() } : {}),
        ...(f.resolution.trim() ? { resolution: f.resolution.trim() } : {}),
        ...(f.incidentId.trim() ? { incidentId: f.incidentId.trim() } : {}),
      };
      const created = await firstValueFrom(this.exp.createIncident(payload));
      this.formSuccess.set(`Incidencia ${created.incidentId} registrada.`);
      this.form = { workshopCode: this.auth.user()?.role === 'admin' ? f.workshopCode : 'E1-T01', journeyNumber: null, date: '', type: 'other', description: '', impact: '', actionTaken: '', resolution: '', incidentId: '' };
      await this.load();
    } catch (error) {
      this.formError.set(error instanceof HttpErrorResponse
        ? ((error.error as { error?: string })?.error ?? (error.error as { details?: Record<string, string> })?.details?.['description'] ?? `Error del servidor (${error.status}).`)
        : 'Error de red al registrar la incidencia.');
    } finally {
      this.saving.set(false);
    }
  }
}
