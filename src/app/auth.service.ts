import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthUser, LoginRequest, LoginResponse } from './repair.model';

const TOKEN_KEY = 'pmv_e1_token';

/** Maneja la sesión de demostración (token firmado del backend) en localStorage. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly token = signal<string | null>(this.isBrowser ? localStorage.getItem(TOKEN_KEY) : null);
  readonly user = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => !!this.token());
  readonly isAdmin = computed(() => this.user()?.role === 'admin');

  constructor() {
    if (this.isBrowser && this.token()) void this.loadMe();
  }

  async login(credentials: LoginRequest): Promise<AuthUser> {
    const res = await firstValueFrom(
      this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials),
    );
    this.setSession(res.token, res.user);
    return res.user;
  }

  async loadMe(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ user: AuthUser }>(`${environment.apiUrl}/auth/me`),
      );
      this.user.set(res.user);
    } catch {
      this.clearSession();
    }
  }

  logout(): void {
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  private setSession(token: string, user: AuthUser): void {
    if (this.isBrowser) localStorage.setItem(TOKEN_KEY, token);
    this.token.set(token);
    this.user.set(user);
  }

  private clearSession(): void {
    if (this.isBrowser) localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
    this.user.set(null);
  }
}
