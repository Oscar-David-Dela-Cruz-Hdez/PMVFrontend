import { PLATFORM_ID, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';

/** Protege las rutas privadas; la ruta pública /seguimiento/:token no lo usa. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true; // en SSR se resuelve en el cliente
  return auth.isAuthenticated() ? true : router.parseUrl('/login');
};
