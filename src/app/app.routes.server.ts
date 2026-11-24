import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Solo el login se pre-renderiza; el panel y las rutas dinámicas quedan en modo servidor
  // porque dependen de la sesión (localStorage) y de la API, que solo existen en el cliente.
  {
    path: 'login',
    renderMode: RenderMode.Prerender
  },
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
