# Reservation Frontend

Este modulo contiene el cliente Angular del sistema de reservas.

## Resumen

- framework: Angular 20
- URL de desarrollo: `http://localhost:4200`
- URL del backend: configurada por `environment.apiUrl`
- pantalla principal: formulario reactivo + tabla de reservas

## Instalar dependencias

```cmd
npm install
```

## Ejecutar

```cmd
npm start
```

## Compilar para producción

```cmd
npm run build
```

## Servicio principal

El servicio HTTP principal es:

- `src/app/reservation.service.ts`

## Formulario Reactivo De Reservas

La pantalla principal del frontend vive en:

- `src/app/pages/reservations-page.component.ts`
- `src/app/pages/reservations-page.component.html`
- `src/app/pages/reservations-page.component.css`

El formulario reactivo incluye estos controles obligatorios:

- `nombreCliente`
- `fecha`
- `hora`
- `servicio`

Al enviar el formulario:

- se valida que todos los campos tengan valor
- se transforma `nombreCliente` a `customerName` antes de llamar al backend
- se ejecuta `ReservationService.createReservation(...)`
- la reserva creada se agrega a la tabla sin recargar la pagina
- si ocurre un error al guardar, se muestra un toast con el mensaje recibido

Servicios recomendados para soporte tecnico de computadores:

- Diagnostico y mantenimiento preventivo
- Formateo e instalacion de sistema operativo
- Eliminacion de virus y optimizacion
- Reparacion de hardware y cambio de componentes
- Respaldo y recuperacion de informacion

## Referencia principal

Consulta el README raiz del repositorio para la documentacion completa del sistema.
