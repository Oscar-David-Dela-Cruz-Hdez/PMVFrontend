# Frontend de ReparaYa — PMV E1 (Angular)

Aplicación Angular del PMV de ReparaYa: panel del reparador con login de demostración, seguimiento público por token y pantallas del experimento E1 (registro por reparación, resumen agregado e incidencias). **No afirma que E1 se haya ejecutado o validado**; solo implementa la infraestructura de medición.

## Tecnologías y requisitos

- Angular 22 (standalone, zoneless, SSR), Tailwind 4, TypeScript 6.
- Node.js 20.12+ / npm.
- Backend corriendo (ver `../../Backend/README.md`); la URL está en `src/environments/environment.ts` (`apiUrl`, p. ej. `http://localhost:4000/api`).

## Instalación y arranque

```bash
npm install
npm start        # ng serve → http://localhost:4200
npm run build    # build de producción en dist/PMV
```

## Cuentas de demostración (ficticias, solo local)

| Cuenta | Contraseña | Rol |
| --- | --- | --- |
| `E1-T01`, `E1-T02`, `E1-T03` (código de taller) | `demo1234` | reparador |
| `investigador` (usuario) | `demo1234` | administrador / equipo investigador |

En la pantalla de login hay botones para autocompletar estas cuentas demo.

## Rutas

| Ruta | Acceso | Descripción |
| --- | --- | --- |
| `/login` | público | Inicio de sesión demo (token firmado del backend, guardado en `localStorage`). |
| `/` | sesión de taller | Panel del reparador: lista/filtros/búsqueda de reparaciones del taller autenticado, alta (modal), detalle (modal con pestañas: Historial, Actualizar, Falla adicional, **Registro E1**). |
| `/seguimiento/:token` | público | Vista de solo lectura para el cliente: folio, equipo, falla, diagnóstico, estado en español, fecha estimada, historial sin notas internas, cambios de presupuesto y última actualización. **Sin alias, token, IDs internos, notas internas ni datos del reparador.** Estados: cargando, enlace inválido/inexistente (404) y error de red. |
| `/resumen-e1` | solo `investigador` | Tabla por taller y agregada con las métricas E1 y etiqueta `pendiente` / `no interpretable` / `apoyo exploratorio` / `no cumple` / `detención`. |
| `/incidencias` | sesión | Lista de incidencias (taller propio; el admin ve todos) y formulario de registro. |

## Flujo de demostración

1. Backend arriba (`cd Backend && npm run dev`) y frontend (`npm start`).
2. Entra con `E1-T01` / `demo1234`.
3. Crea una reparación, cambia su estado, registra una falla adicional.
4. En el detalle, pestaña **Registro E1**: jornada, elegibilidad, eventos, captura (o registro manual de caso no capturado), nivel de ayuda y observaciones anonimizadas. Si ya existe registro, el formulario carga y actualiza (PATCH).
5. Copia el enlace público del detalle (`/seguimiento/<token>`) y ábrelo sin sesión.
6. Entra como `investigador` / `demo1234` para ver **Resumen E1** e **Incidencias**.

## Seguridad y privacidad

- El token de sesión viaja en `Authorization: Bearer …` (interceptor HTTP); ante un 401 se redirige a `/login`.
- El backend deriva taller y reparador de la sesión; el frontend nunca envía `workshopId`.
- Campos sensibles (IMEI, teléfonos, contraseñas, contactos…) se rechazan en backend con 400 y no se muestran en la vista pública.
- `.env` está en `.gitignore` (junto con `node_modules`, `dist`, logs); nunca se imprime ni se envía al cliente.

## Operación, exportación, respaldos, pausa y cierre

- Operación manual desde el panel; sin procesos automáticos.
- Exportación anonimizada de E1: formato en `../../ejemplos/ejemplo_exportacion_E1.csv`; datos demo en `../../ejemplos/datos_demo.json`.
- Respaldos con `mongodump` sobre una base de desarrollo identificada (nunca producción).
- Pausa: dejar de usar el panel. Cierre: dejar de recolectar, exportar y archivar; el PMV no elimina datos.

## Limitaciones del mecanismo de autenticación (PMV)

Token stateless firmado con HMAC-SHA256 (expira en 8 h), sin revocación server-side, secreto por defecto solo para local (`PMV_SESSION_SECRET` en el backend lo endurece), contraseñas demo hasheadas sin salt. **No es un sistema de producción.**

## Verificación

- `npm run build` → build de producción sin errores.
- `npm start` → `http://localhost:4200` (el backend debe estar arriba para ver datos).
