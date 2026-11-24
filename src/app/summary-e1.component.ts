import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { ExperimentService } from './experiment.service';
import { ExperimentSummary, ResultadoInterpretabilidad, WorkshopSummary } from './repair.model';

/** Pantalla de resumen E1 para el equipo investigador (cuenta admin de prueba). */
@Component({
  selector: 'app-summary-e1',
  imports: [RouterLink, DatePipe, DecimalPipe],
  template: `
    <main class="page">
      <header class="page-head">
        <div>
          <p class="eyebrow">Experimento E1</p>
          <h1>Resumen de métricas</h1>
          <p class="page-sub">Vista agregada para el equipo investigador. No afirma validación de E1; solo muestra lo registrado.</p>
        </div>
        <a class="secondary-button" routerLink="/">← Volver al panel</a>
      </header>

      @if (!isAdmin()) {
        <div class="banner error" role="alert">Esta vista es solo para la cuenta administradora de prueba (equipo investigador).</div>
      }

      @if (error()) { <div class="banner error" role="alert">{{ error() }} <button class="secondary-button" type="button" (click)="load()">Reintentar</button></div> }
      @if (loading()) { <p class="empty">Cargando resumen E1…</p> }

      @if (summary(); as s) {
        <p class="summary-meta">Generado: {{ s.generadoEn | date:'dd/MM/yyyy HH:mm' }} · PMV {{ s.pmvVersion }} · Umbrales: completitud ≥ {{ s.umbrales.completitud }}%, autonomía ≥ {{ s.umbrales.autonomia }}%, mediana ≤ {{ s.umbrales.medianaMinutos }} min, tiempos medidos ≥ {{ s.umbrales.tiemposMedidos }}%</p>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Taller</th><th>Jornadas</th><th>N elegibles</th><th>C completos</th><th>A sin ayuda</th>
                <th>Completitud</th><th>Autonomía</th><th>Tiempos medidos</th><th>Intentos</th><th>% tiempos</th>
                <th>Mediana min</th><th>Incidentes graves</th><th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              @for (w of s.porTaller; track w.workshopCode) {
                <tr>
                  <td><strong>{{ w.workshopCode }}</strong></td>
                  <td>{{ w.jornadasRealizadas }}/7</td>
                  <td>{{ w.nElegibles }}</td>
                  <td>{{ w.cCompletos }}</td>
                  <td>{{ w.aCompletosSinAyuda }}</td>
                  <td>{{ pct(w.completitudPorcentaje) }}</td>
                  <td>{{ w.autonomiaPorcentaje === 'no definida' ? 'no definida' : pct(w.autonomiaPorcentaje) }}</td>
                  <td>{{ w.tiemposMedidos }}</td>
                  <td>{{ w.intentosDeCaptura }}</td>
                  <td>{{ pct(w.porcentajeTiemposMedidos) }}</td>
                  <td>{{ w.medianaMinutosAdicionales === null ? '—' : (w.medianaMinutosAdicionales | number:'1.0-2') }}</td>
                  <td>{{ w.incidentesGraves }}</td>
                  <td><span [class]="'result-chip ' + resultClass(w)">{{ resultLabel(w) }}</span></td>
                </tr>
              }
              <tr class="agg-row">
                <td><strong>Agregado</strong></td>
                <td>—</td>
                <td>{{ s.agregado.totalElegibles }}</td>
                <td>{{ s.agregado.cCompletos }}</td>
                <td>{{ s.agregado.aCompletosSinAyuda }}</td>
                <td>{{ pct(s.agregado.completitudPorcentaje) }}</td>
                <td>{{ s.agregado.autonomiaPorcentaje === 'no definida' ? 'no definida' : pct(s.agregado.autonomiaPorcentaje) }}</td>
                <td>{{ s.agregado.tiemposMedidos }}</td>
                <td>{{ s.agregado.intentosDeCaptura }}</td>
                <td>{{ pct(s.agregado.porcentajeTiemposMedidos) }}</td>
                <td>{{ s.agregado.medianaMinutosAdicionales === null ? '—' : (s.agregado.medianaMinutosAdicionales | number:'1.0-2') }}</td>
                <td>{{ s.agregado.incidentesGraves }}</td>
                <td><span [class]="'result-chip ' + resultClassAgg(s.agregado)">{{ resultLabelAgg(s.agregado) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="page-note">La mediana agregada se calcula desde todos los tiempos individuales (nunca promedio de medianas por taller). Los casos elegibles no capturados permanecen dentro de N con <code>captureAttempted: false</code>.</p>
      }
    </main>
  `,
})
export class SummaryE1Component implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly exp = inject(ExperimentService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly summary = signal<ExperimentSummary | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isAdmin = this.auth.isAdmin;

  ngOnInit(): void {
    if (this.isBrowser && this.isAdmin()) void this.load();
    else if (this.isBrowser) this.error.set('Inicia sesión como "investigador" para ver el resumen E1.');
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.summary.set(await firstValueFrom(this.exp.getSummary()));
    } catch (error) {
      this.error.set(error instanceof HttpErrorResponse
        ? ((error.error as { error?: string })?.error ?? `Error del servidor (${error.status}).`)
        : 'Error de red al cargar el resumen.');
    } finally {
      this.loading.set(false);
    }
  }

  protected pct(value: number | null): string {
    return value === null ? '—' : `${value}%`;
  }

  protected resultLabel(w: WorkshopSummary): string {
    if (w.nElegibles === 0 && w.intentosDeCaptura === 0) return 'pendiente';
    return w.resultadoInterpretabilidad;
  }

  protected resultLabelAgg(a: ExperimentSummary['agregado']): string {
    if (a.totalElegibles === 0 && a.intentosDeCaptura === 0) return 'pendiente';
    return a.resultadoInterpretabilidad;
  }

  protected resultClass(w: WorkshopSummary): string {
    return this.classFor(this.resultLabel(w));
  }

  protected resultClassAgg(a: ExperimentSummary['agregado']): string {
    return this.classFor(this.resultLabelAgg(a));
  }

  private classFor(label: string): string {
    if (label === 'apoyo exploratorio') return 'ok';
    if (label === 'no cumple') return 'bad';
    if (label === 'detención') return 'severe';
    return 'muted'; // pendiente / no interpretable
  }
}
