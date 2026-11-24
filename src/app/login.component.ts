import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from './auth.service';

/** Pantalla de inicio de sesión con cuentas de demostración (E1-T01/T02/T03 e investigador). */
@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="auth-page">
      <section class="auth-card" aria-label="Inicio de sesión de demostración">
        <a class="brand" routerLink="/"><span class="brand-mark">R</span><span>Repara<span>Ya</span></span></a>
        <p class="eyebrow">PMV · Experimento E1</p>
        <h1>Inicia sesión de demostración</h1>
        <p class="auth-sub">Usa una cuenta ficticia de prueba. Las contraseñas demo solo sirven en entorno local.</p>

        @if (error()) { <p class="banner error" role="alert">{{ error() }}</p> }

        <div class="demo-accounts" aria-label="Cuentas de demostración">
          <span>Cuentas demo:</span>
          @for (acc of demoAccounts; track acc.label) {
            <button type="button" class="chip-button" (click)="fillDemo(acc)">{{ acc.label }}</button>
          }
        </div>

        <form (ngSubmit)="submit()" class="auth-form">
          <label>Código de taller
            <input type="text" name="workshopCode" [(ngModel)]="workshopCode" placeholder="E1-T01" autocomplete="username">
          </label>
          <label>o usuario de investigador
            <input type="text" name="username" [(ngModel)]="username" placeholder="investigador">
          </label>
          <label>Contraseña de demostración
            <input type="password" name="password" [(ngModel)]="password" placeholder="demo1234" autocomplete="current-password" required>
          </label>
          <button class="primary-button auth-submit" type="submit" [disabled]="loading()">
            {{ loading() ? 'Entrando…' : 'Entrar al panel' }}
          </button>
        </form>
        <p class="auth-note">PMV académico · datos ficticios de demostración · <a routerLink="/seguimiento/demo">seguimiento público de ejemplo</a></p>
      </section>
    </main>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected workshopCode = '';
  protected username = '';
  protected password = '';
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly demoAccounts = [
    { label: 'E1-T01', workshopCode: 'E1-T01', username: '', password: 'demo1234' },
    { label: 'E1-T02', workshopCode: 'E1-T02', username: '', password: 'demo1234' },
    { label: 'E1-T03', workshopCode: 'E1-T03', username: '', password: 'demo1234' },
    { label: 'Investigador', workshopCode: '', username: 'investigador', password: 'demo1234' },
  ];

  constructor() {
    if (this.isBrowser && this.auth.isAuthenticated()) void this.router.navigate(['/']);
  }

  protected fillDemo(acc: { workshopCode: string; username: string; password: string }): void {
    this.workshopCode = acc.workshopCode;
    this.username = acc.username;
    this.password = acc.password;
    this.error.set(null);
  }

  async submit(): Promise<void> {
    this.error.set(null);
    if (!this.password.trim()) {
      this.error.set('Escribe la contraseña de demostración.');
      return;
    }
    if (!this.workshopCode.trim() && !this.username.trim()) {
      this.error.set('Indica el código de taller o el usuario de investigador.');
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.login({
        ...(this.workshopCode.trim() ? { workshopCode: this.workshopCode.trim() } : {}),
        ...(this.username.trim() ? { username: this.username.trim() } : {}),
        password: this.password,
      });
      await this.router.navigate(['/']);
    } catch (error) {
      this.error.set(this.toMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  private toMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) return 'Credenciales de demostración inválidas.';
      if (error.status === 0) return 'Error de red: no se pudo contactar al backend.';
      return (error.error as { error?: string })?.error ?? `Error del servidor (${error.status}).`;
    }
    return 'No se pudo iniciar sesión.';
  }
}
