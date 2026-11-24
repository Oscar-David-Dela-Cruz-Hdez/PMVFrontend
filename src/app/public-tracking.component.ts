import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RepairsService } from './repairs.service';
import { AUTH_LABELS, PublicRepair, STATUS_LABELS } from './repair.model';

/**
 * Ruta pública /seguimiento/:token — solo lectura, sin sesión.
 * Muestra únicamente lo permitido: folio, equipo, falla, diagnóstico, estado,
 * fecha estimada, historial sin notas internas, cambios de presupuesto y
 * última actualización. Sin alias, token, IDs internos ni notas internas.
 */
@Component({
  selector: 'app-public-tracking',
  imports: [RouterLink, DatePipe, DecimalPipe],
  template: `
    <main class="public-page">
      <header class="public-head">
        <a class="brand" routerLink="/"><span class="brand-mark">R</span><span>Repara<span>Ya</span></span></a>
        <span class="workshop-label">Seguimiento público de reparación</span>
      </header>

      <section class="public-card" aria-label="Estado de la reparación">
        @if (loading()) { <p class="empty public-state">Cargando seguimiento…</p> }

        @if (error()) {
          <div class="public-state">
            <p class="banner error" role="alert">{{ error() }}</p>
            <button class="secondary-button" type="button" (click)="load()">Reintentar</button>
          </div>
        }

        @if (repair(); as r) {
          <p class="eyebrow">Estado del servicio</p>
          <h1>{{ r.folio }}</h1>
          <span [class]="'status ' + statusClass(r.status)">{{ statusLabel(r.status) }}</span>

          <dl class="public-grid">
            <div><dt>Equipo</dt><dd>{{ r.deviceType }}</dd></div>
            <div><dt>Falla reportada</dt><dd>{{ r.reportedIssue }}</dd></div>
            <div><dt>Diagnóstico</dt><dd>{{ r.diagnosis || 'Pendiente de diagnóstico' }}</dd></div>
            <div><dt>Fecha estimada</dt><dd>{{ r.estimatedDate ? (r.estimatedDate | date:'dd/MM/yyyy') : 'Sin definir' }}</dd></div>
            <div><dt>Presupuesto inicial</dt><dd>{{ r.initialBudget !== null && r.initialBudget !== undefined ? ('$' + (r.initialBudget | number:'1.0-0')) : 'Pendiente' }}</dd></div>
            <div><dt>Última actualización</dt><dd>{{ r.updatedAt | date:'dd/MM/yyyy HH:mm' }}</dd></div>
          </dl>

          <h2>Historial de estados</h2>
          @if (r.timeline.length) {
            <ol class="timeline-v2">
              @for (entry of r.timeline; track $index) {
                <li>
                  <span [class]="'status ' + statusClass(entry.status)">{{ statusLabel(entry.status) }}</span>
                  <small class="t-date">{{ entry.createdAt | date:'dd/MM/yyyy HH:mm' }}</small>
                </li>
              }
            </ol>
          } @else { <p class="empty">Sin movimientos todavía.</p> }

          <h2>Cambios de presupuesto</h2>
          @if (r.budgetChanges.length) {
            <ul class="budget-list">
              @for (bc of r.budgetChanges; track $index) {
                <li>
                  <strong class="amount">\${{ bc.amount | number:'1.0-0' }}</strong>
                  <span class="reason">{{ bc.reason }}<small class="t-date">{{ bc.createdAt | date:'dd/MM/yyyy HH:mm' }}</small></span>
                  <em [class]="'auth-chip ' + bc.authorizationStatus">{{ authLabel(bc.authorizationStatus) }}</em>
                </li>
              }
            </ul>
          } @else { <p class="empty">Sin cambios de presupuesto.</p> }
        }
      </section>
      <footer class="public-footer">PMV académico de ReparaYa · Enlace público de solo lectura</footer>
    </main>
  `,
})
export class PublicTrackingComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(RepairsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly repair = signal<PublicRepair | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly statusLabel = (s: PublicRepair['status']) => STATUS_LABELS[s];
  protected readonly authLabel = (s: PublicRepair['budgetChanges'][number]['authorizationStatus']) => AUTH_LABELS[s];
  protected statusClass(status: PublicRepair['status']): string {
    if (status === 'waiting_authorization') return 'waiting';
    if (status === 'ready_for_pickup') return 'ready';
    return '';
  }

  ngOnInit(): void {
    if (this.isBrowser) this.load();
  }

  async load(): Promise<void> {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    this.loading.set(true);
    this.error.set(null);
    try {
      this.repair.set(await firstValueFrom(this.api.getPublicRepair(token)));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.error.set('Este enlace público no es válido o la reparación no existe.');
      } else if (error instanceof HttpErrorResponse && error.status === 0) {
        this.error.set('Error de red: no se pudo consultar el seguimiento. Inténtalo de nuevo.');
      } else {
        this.error.set('No se pudo cargar el seguimiento.');
      }
      this.repair.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
