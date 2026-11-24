import { Component, HostListener, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AuthService } from './auth.service';
import { RepairsService } from './repairs.service';
import { ExperimentService } from './experiment.service';
import {
  ASSISTANCE_LABELS,
  AUTH_LABELS,
  AssistanceLevel,
  AuthorizationStatus,
  BudgetChange,
  ExperimentRecord,
  REPAIR_STATUSES,
  Repair,
  RepairStatus,
  STATUS_LABELS,
} from './repair.model';

type DetailTab = 'history' | 'edit' | 'add' | 'e1';

interface RepairFormModel {
  folio: string;
  clientAlias: string;
  deviceType: string;
  reportedIssue: string;
  status: RepairStatus;
  diagnosis: string;
  initialBudget: number | null;
  estimatedDate: string;
}

interface EditFormModel {
  status: RepairStatus;
  diagnosis: string;
  initialBudget: number | null;
  estimatedDate: string;
}

interface BudgetFormModel {
  reason: string;
  amount: number | null;
  authorizationStatus: AuthorizationStatus;
  authorizationNote: string;
}

interface ExperimentFormModel {
  journeyNumber: number | null;
  isEligible: boolean;
  eligibilityReason: string;
  requiredEvents: number | null;
  timelyEvents: number | null;
  captureAttempted: boolean;
  captureStartedAt: string;
  captureCompletedAt: string;
  additionalMinutes: number | null;
  assistanceLevel: AssistanceLevel;
  assistanceNote: string;
  incidentId: string;
  observations: string;
}

/** Panel del reparador: lista, formulario de alta y detalle con registro E1. */
@Component({
  imports: [FormsModule, DatePipe, RouterLink, RouterLinkActive],
  selector: 'app-panel',
  styleUrl: './app.css',
  templateUrl: './panel.component.html',
})
export class PanelComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(RepairsService);
  private readonly exp = inject(ExperimentService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly apiUrl = this.api.apiUrl;

  protected readonly repairStatuses = REPAIR_STATUSES;
  protected readonly statusLabel = (s: RepairStatus) => STATUS_LABELS[s];
  protected readonly authLabel = (s: AuthorizationStatus) => AUTH_LABELS[s];
  protected readonly assistanceLabel = (s: AssistanceLevel) => ASSISTANCE_LABELS[s];

  // Lista
  protected readonly repairs = signal<Repair[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly selectedStatus = signal<'Todos' | RepairStatus>('Todos');
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly statusOptions: Array<{ value: 'Todos' | RepairStatus; label: string }> = [
    { value: 'Todos', label: 'Todos' },
    ...REPAIR_STATUSES.map((s) => ({ value: s as RepairStatus, label: STATUS_LABELS[s] })),
  ];

  protected readonly activeCount = computed(
    () => this.repairs().filter((r) => r.status !== 'delivered' && r.status !== 'cancelled').length,
  );
  protected readonly waitingAuthCount = computed(
    () => this.repairs().filter((r) => r.status === 'waiting_authorization').length,
  );
  protected readonly readyCount = computed(
    () => this.repairs().filter((r) => r.status === 'ready_for_pickup').length,
  );

  // Formulario nueva reparación
  protected readonly showForm = signal(false);
  protected readonly formSaving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly formSuccess = signal<string | null>(null);
  protected form: RepairFormModel = this.emptyForm();

  // Detalle
  protected readonly detailFolio = signal<string | null>(null);
  protected readonly detail = signal<Repair | null>(null);
  protected readonly detailLoading = signal(false);
  protected readonly detailError = signal<string | null>(null);
  protected readonly detailTab = signal<DetailTab>('history');
  protected readonly editSaving = signal(false);
  protected readonly editError = signal<string | null>(null);
  protected readonly editSuccess = signal<string | null>(null);
  protected editForm: EditFormModel = this.emptyEditForm();
  protected readonly budgetSaving = signal(false);
  protected readonly budgetError = signal<string | null>(null);
  protected readonly budgetSuccess = signal<string | null>(null);
  protected budgetForm: BudgetFormModel = this.emptyBudgetForm();

  // Registro E1 dentro del detalle
  protected readonly expRecord = signal<ExperimentRecord | null>(null);
  protected readonly expLoading = signal(false);
  protected readonly expSaving = signal(false);
  protected readonly expError = signal<string | null>(null);
  protected readonly expSuccess = signal<string | null>(null);
  protected expForm: ExperimentFormModel = this.emptyExperimentForm();

  ngOnInit(): void {
    // En SSR no se llama a la API; solo en el navegador.
    if (this.isBrowser) void this.loadRepairs();
  }

  // ------------------------------------------------------------------ lista

  async loadRepairs(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const filters: { status?: RepairStatus; q?: string } = {};
      if (this.selectedStatus() !== 'Todos') filters.status = this.selectedStatus() as RepairStatus;
      const q = this.search().trim();
      if (q) filters.q = q;
      this.repairs.set(await firstValueFrom(this.api.getRepairs(filters)));
    } catch (error) {
      this.loadError.set(this.toMessage(error, 'No se pudieron cargar las reparaciones.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.loadRepairs(), 350);
  }

  protected setStatus(status: 'Todos' | RepairStatus): void {
    this.selectedStatus.set(status);
    void this.loadRepairs();
  }

  // ------------------------------------------------------------- formulario

  protected openForm(): void {
    this.form = this.emptyForm();
    this.formError.set(null);
    this.formSuccess.set(null);
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
  }

  async saveRepair(): Promise<void> {
    this.formError.set(null);
    this.formSuccess.set(null);
    const f = this.form;
    if (!f.folio.trim() || !f.deviceType.trim() || !f.reportedIssue.trim() || !f.status) {
      this.formError.set('Completa los campos obligatorios: folio, equipo, falla reportada y estado.');
      return;
    }
    this.formSaving.set(true);
    try {
      const payload = {
        folio: f.folio.trim(),
        deviceType: f.deviceType.trim(),
        reportedIssue: f.reportedIssue.trim(),
        status: f.status,
        ...(f.clientAlias.trim() ? { clientAlias: f.clientAlias.trim() } : {}),
        ...(f.diagnosis.trim() ? { diagnosis: f.diagnosis.trim() } : {}),
        ...(f.initialBudget !== null && f.initialBudget !== undefined ? { initialBudget: Number(f.initialBudget) } : {}),
        ...(f.estimatedDate ? { estimatedDate: f.estimatedDate } : {}),
      };
      const created = await firstValueFrom(this.api.createRepair(payload));
      this.formSuccess.set(`Reparación ${created.folio} creada correctamente.`);
      this.showForm.set(false);
      await this.loadRepairs();
    } catch (error) {
      this.formError.set(this.toMessage(error, 'No se pudo crear la reparación.'));
    } finally {
      this.formSaving.set(false);
    }
  }

  // ---------------------------------------------------------------- detalle

  protected setDetailTab(tab: DetailTab): void {
    this.detailTab.set(tab);
  }

  async openDetail(folio: string): Promise<void> {
    this.detailFolio.set(folio);
    this.detail.set(null);
    this.detailError.set(null);
    this.detailTab.set('history');
    this.expRecord.set(null);
    this.expError.set(null);
    this.expSuccess.set(null);
    this.detailLoading.set(true);
    try {
      const repair = await firstValueFrom(this.api.getRepair(folio));
      this.detail.set(repair);
      this.editForm = {
        status: repair.status,
        diagnosis: repair.diagnosis ?? '',
        initialBudget: repair.initialBudget ?? null,
        estimatedDate: repair.estimatedDate ? repair.estimatedDate.slice(0, 10) : '',
      };
      await this.loadExperimentRecord(folio);
    } catch (error) {
      this.detailError.set(this.toMessage(error, 'No se pudo cargar el detalle.'));
    } finally {
      this.detailLoading.set(false);
    }
  }

  protected closeDetail(): void {
    this.detailFolio.set(null);
    this.detail.set(null);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.showForm()) this.closeForm();
    else if (this.detailFolio()) this.closeDetail();
  }

  async saveDetail(): Promise<void> {
    const folio = this.detailFolio();
    if (!folio) return;
    this.editError.set(null);
    this.editSuccess.set(null);
    const f = this.editForm;
    if (!f.status) {
      this.editError.set('Selecciona un estado válido.');
      return;
    }
    this.editSaving.set(true);
    try {
      const payload = {
        status: f.status,
        diagnosis: f.diagnosis.trim() ? f.diagnosis.trim() : null,
        initialBudget: f.initialBudget !== null && f.initialBudget !== undefined ? Number(f.initialBudget) : null,
        estimatedDate: f.estimatedDate ? f.estimatedDate : null,
      };
      const updated = await firstValueFrom(this.api.updateRepair(folio, payload));
      this.detail.set(updated);
      this.editSuccess.set('Cambios guardados correctamente.');
      this.detailTab.set('history');
      await this.loadRepairs();
    } catch (error) {
      this.editError.set(this.toMessage(error, 'No se pudieron guardar los cambios.'));
    } finally {
      this.editSaving.set(false);
    }
  }

  async saveBudgetChange(): Promise<void> {
    const folio = this.detailFolio();
    if (!folio) return;
    this.budgetError.set(null);
    this.budgetSuccess.set(null);
    const f = this.budgetForm;
    if (!f.reason.trim()) {
      this.budgetError.set('Describe la razón de la falla adicional.');
      return;
    }
    if (f.amount === null || f.amount === undefined || Number.isNaN(Number(f.amount)) || Number(f.amount) < 0) {
      this.budgetError.set('Ingresa un monto válido (mayor o igual a 0).');
      return;
    }
    this.budgetSaving.set(true);
    try {
      const payload = {
        reason: f.reason.trim(),
        amount: Number(f.amount),
        authorizationStatus: f.authorizationStatus,
        ...(f.authorizationNote.trim() ? { authorizationNote: f.authorizationNote.trim() } : {}),
      };
      const updated = await firstValueFrom(this.api.addBudgetChange(folio, payload));
      this.detail.set(updated);
      this.budgetForm = this.emptyBudgetForm();
      this.budgetSuccess.set('Falla adicional registrada correctamente.');
      this.detailTab.set('history');
      await this.loadRepairs();
    } catch (error) {
      this.budgetError.set(this.toMessage(error, 'No se pudo registrar la falla adicional.'));
    } finally {
      this.budgetSaving.set(false);
    }
  }

  // ------------------------------------------------------------- registro E1

  private async loadExperimentRecord(folio: string): Promise<void> {
    this.expLoading.set(true);
    this.expError.set(null);
    try {
      const records = await firstValueFrom(this.exp.getRecords({ repairFolio: folio }));
      const record = records[0] ?? null;
      this.expRecord.set(record);
      this.expForm = record ? this.formFromRecord(record) : this.emptyExperimentForm();
    } catch (error) {
      // Si el rol no puede consultar E1, el formulario queda en modo "nuevo".
      this.expError.set(this.toMessage(error, 'No se pudo cargar el registro E1.'));
      this.expForm = this.emptyExperimentForm();
    } finally {
      this.expLoading.set(false);
    }
  }

  async saveExperimentRecord(): Promise<void> {
    const folio = this.detailFolio();
    if (!folio) return;
    this.expError.set(null);
    this.expSuccess.set(null);
    const f = this.expForm;

    if (!f.journeyNumber || !Number.isInteger(Number(f.journeyNumber)) || Number(f.journeyNumber) < 1 || Number(f.journeyNumber) > 7) {
      this.expError.set('La jornada debe ser un entero de 1 a 7.');
      return;
    }
    if (f.isEligible === false && !f.eligibilityReason.trim()) {
      this.expError.set('Indica el motivo cuando la reparación no es elegible.');
      return;
    }
    if (f.requiredEvents === null || f.timelyEvents === null || Number(f.requiredEvents) < 0 || Number(f.timelyEvents) < 0) {
      this.expError.set('Indica eventos exigibles y oportunos (números mayores o iguales a 0).');
      return;
    }
    if (Number(f.timelyEvents) > Number(f.requiredEvents)) {
      this.expError.set('Los eventos oportunos no pueden ser más que los exigibles.');
      return;
    }
    if (f.captureAttempted && f.additionalMinutes !== null && f.additionalMinutes !== undefined && Number(f.additionalMinutes) < 0) {
      this.expError.set('Los minutos adicionales no pueden ser negativos (déjalo vacío si no se midió).');
      return;
    }

    this.expSaving.set(true);
    try {
      const toIso = (value: string) => (value ? new Date(value).toISOString() : null);
      const payload = {
        repairFolio: folio,
        journeyNumber: Number(f.journeyNumber),
        isEligible: f.isEligible,
        ...(!f.isEligible && f.eligibilityReason.trim() ? { eligibilityReason: f.eligibilityReason.trim() } : {}),
        requiredEvents: Number(f.requiredEvents),
        timelyEvents: Number(f.timelyEvents),
        captureAttempted: f.captureAttempted,
        ...(f.captureAttempted
          ? {
              captureStartedAt: toIso(f.captureStartedAt),
              captureCompletedAt: toIso(f.captureCompletedAt),
              ...(f.additionalMinutes !== null && f.additionalMinutes !== undefined && f.additionalMinutes !== ('' as unknown as number)
                ? { additionalMinutes: Number(f.additionalMinutes) }
                : {}),
            }
          : {}),
        assistanceLevel: f.assistanceLevel,
        ...(f.assistanceNote.trim() ? { assistanceNote: f.assistanceNote.trim() } : {}),
        ...(f.incidentId.trim() ? { incidentId: f.incidentId.trim() } : {}),
        ...(f.observations.trim() ? { observations: f.observations.trim() } : {}),
      };
      const existing = this.expRecord();
      const saved = existing
        ? await firstValueFrom(this.exp.updateRecord(existing.id, payload))
        : await firstValueFrom(this.exp.createRecord(payload));
      this.expRecord.set(saved);
      this.expForm = this.formFromRecord(saved);
      this.expSuccess.set(existing ? 'Registro E1 actualizado.' : 'Registro E1 guardado.');
    } catch (error) {
      this.expError.set(this.toMessage(error, 'No se pudo guardar el registro E1.'));
    } finally {
      this.expSaving.set(false);
    }
  }

  // ---------------------------------------------------------------- helpers

  protected budgetLabel(repair: Repair): string {
    if (repair.initialBudget === null || repair.initialBudget === undefined) return 'Pendiente';
    return this.formatMoney(repair.initialBudget);
  }

  protected pendingExtra(repair: Repair): number {
    return (repair.budgetChanges ?? [])
      .filter((c: BudgetChange) => c.authorizationStatus === 'pending')
      .reduce((sum: number, c: BudgetChange) => sum + c.amount, 0);
  }

  protected formatMoney(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'Pendiente';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(value);
  }

  protected publicUrl(repair: Repair): string {
    return repair.publicToken ? `/seguimiento/${repair.publicToken}` : '';
  }

  protected statusClass(status: RepairStatus): string {
    if (status === 'waiting_authorization') return 'status waiting';
    if (status === 'ready_for_pickup') return 'status ready';
    return 'status';
  }

  private emptyForm(): RepairFormModel {
    return {
      folio: '',
      clientAlias: '',
      deviceType: '',
      reportedIssue: '',
      status: 'received',
      diagnosis: '',
      initialBudget: null,
      estimatedDate: '',
    };
  }

  private emptyEditForm(): EditFormModel {
    return { status: 'received', diagnosis: '', initialBudget: null, estimatedDate: '' };
  }

  private emptyBudgetForm(): BudgetFormModel {
    return { reason: '', amount: null, authorizationStatus: 'pending', authorizationNote: '' };
  }

  private emptyExperimentForm(): ExperimentFormModel {
    return {
      journeyNumber: null,
      isEligible: true,
      eligibilityReason: '',
      requiredEvents: null,
      timelyEvents: null,
      captureAttempted: true,
      captureStartedAt: '',
      captureCompletedAt: '',
      additionalMinutes: null,
      assistanceLevel: 'none',
      assistanceNote: '',
      incidentId: '',
      observations: '',
    };
  }

  private formFromRecord(r: ExperimentRecord): ExperimentFormModel {
    const toLocal = (iso?: string | null) => (iso ? iso.slice(0, 16) : '');
    return {
      journeyNumber: r.journeyNumber,
      isEligible: r.isEligible,
      eligibilityReason: r.eligibilityReason ?? '',
      requiredEvents: r.requiredEvents,
      timelyEvents: r.timelyEvents,
      captureAttempted: r.captureAttempted,
      captureStartedAt: toLocal(r.captureStartedAt),
      captureCompletedAt: toLocal(r.captureCompletedAt),
      additionalMinutes: r.additionalMinutes ?? null,
      assistanceLevel: r.assistanceLevel,
      assistanceNote: r.assistanceNote ?? '',
      incidentId: r.incidentId ?? '',
      observations: r.observations ?? '',
    };
  }

  private toMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { error?: string; details?: Record<string, string> } | null;
      if (body?.details) {
        return `${body.error ?? 'Datos inválidos.'} ${Object.values(body.details).join(' ')}`;
      }
      if (body?.error) return body.error;
      if (error.status === 0) return 'Error de red: no se pudo contactar al backend. Verifica que esté corriendo.';
      if (error.status === 401) return 'Sesión expirada o inválida. Vuelve a iniciar sesión.';
      if (error.status === 403) return 'Acceso denegado para tu taller o rol.';
      return `Error del servidor (${error.status}).`;
    }
    return fallback;
  }
}
