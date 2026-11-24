import { Routes } from '@angular/router';
import { PanelComponent } from './panel.component';
import { authGuard } from './auth.guard';
import { LoginComponent } from './login.component';
import { PublicTrackingComponent } from './public-tracking.component';
import { SummaryE1Component } from './summary-e1.component';
import { IncidentsComponent } from './incidents.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: PanelComponent, canActivate: [authGuard] },
  { path: 'seguimiento/:token', component: PublicTrackingComponent }, // pública, sin sesión
  { path: 'resumen-e1', component: SummaryE1Component, canActivate: [authGuard] },
  { path: 'incidencias', component: IncidentsComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
