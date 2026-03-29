# Sistema De Reservas

Monorepo con dos aplicaciones principales:

- `reservation-backend`: API REST construida con Spring Boot
- `reservation-frontend`: cliente Angular

El proyecto permite consultar reservas, crear nuevas reservas desde servicio HTTP y cancelar reservas existentes. En el estado actual del frontend, la vista principal incluye un formulario reactivo para registrar reservas nuevas, una tabla con la agenda actual y la opcion de cancelar reservas existentes.

## Arquitectura General

### Backend

El backend expone la API REST en Spring Boot y persiste la informacion en PostgreSQL. La entidad principal es `Reservation`, con estos campos:

- `id`
- `customerName`
- `date`
- `time`
- `service`
- `status`

Estados disponibles:

- `PENDING`
- `CONFIRMED`
- `CANCELLED`

### Frontend

El frontend esta hecho en Angular y consume la API por medio de `HttpClient`. La integracion principal vive en:

- `reservation-frontend/src/app/reservation.service.ts`
- `reservation-frontend/src/app/pages/reservations-page.component.ts`

La URL del backend se configura con archivos de entorno:

- `reservation-frontend/src/environments/environment.ts`
- `reservation-frontend/src/environments/environment.prod.ts`

## Estructura Del Repositorio

Las carpetas activas del proyecto son:

```text
reservation-backend/
  .mvn/
  src/
  pom.xml
  mvnw
  mvnw.cmd

reservation-frontend/
  src/
  angular.json
  package.json
  tsconfig.json

README.md
```

La raiz puede contener carpetas auxiliares, temporales o heredadas de iteraciones anteriores. Para trabajar en el proyecto, toma como referencia principal `reservation-backend/` y `reservation-frontend/`.

## Stack Tecnologico

### Backend

- Java 25
- Spring Boot 4.0.4
- Spring Web MVC
- Spring Data JPA
- PostgreSQL
- Maven Wrapper
- H2 para pruebas

### Frontend

- Angular 20
- TypeScript
- RxJS
- Angular HttpClient

## Requisitos Previos

Antes de ejecutar el proyecto, asegurate de tener:

- Java 25 instalado
- PostgreSQL corriendo localmente
- una base de datos creada, por ejemplo `g3reservation`
- Node.js instalado
- npm disponible

En esta maquina se ha usado correctamente:

- `JAVA_HOME=D:\Program Files\Eclipse Adoptium\jdk-25.0.2.10-hotspot`
- `D:\Program Files\nodejs\npm.cmd`

## Configuracion Del Backend

El backend usa estas propiedades por defecto en `reservation-backend/src/main/resources/application.properties`:

```properties
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/g3reservation}
spring.datasource.username=${DB_USERNAME:postgres}
spring.datasource.password=${DB_PASSWORD:arturo1}
server.port=8081
```

Eso significa:

- si defines `DB_URL`, `DB_USERNAME` y `DB_PASSWORD`, se usan tus valores
- si no defines nada, el backend intentara conectarse a PostgreSQL local con esos valores por defecto
- la API escucha en `http://localhost:8081`

Ademas, el backend ya incluye configuracion CORS para aceptar peticiones desde:

```text
http://localhost:4200
```

La clase responsable es `reservation-backend/src/main/java/com/dev/arturojm/reservation/config/CorsConfiguration.java`.

## Configuracion Del Frontend

La URL base de la API no esta escrita directamente en los componentes. Se centraliza en:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8081'
};
```

El servicio Angular `ReservationService` construye sus endpoints a partir de `environment.apiUrl`.

## Como Ejecutar El Proyecto Desde CMD

### 1. Levantar el backend

Abre una ventana de `cmd` y ejecuta:

```cmd
cd /d "D:\Archivos AJM\Arturo DEV\Proyecto Full Stack Sistema de reservas + IA\reservation-backend arturojm\reservation-backend"
set JAVA_HOME=D:\Program Files\Eclipse Adoptium\jdk-25.0.2.10-hotspot
mvnw.cmd spring-boot:run
```

Si la aplicacion arranca correctamente, la API quedara disponible en:

```text
http://localhost:8081
```

### 2. Levantar el frontend

Abre otra ventana de `cmd` y ejecuta:

```cmd
cd /d "D:\Archivos AJM\Arturo DEV\Proyecto Full Stack Sistema de reservas + IA\reservation-backend arturojm\reservation-frontend"
"D:\Program Files\nodejs\npm.cmd" install
"D:\Program Files\nodejs\npm.cmd" start
```

Si `npm` ya esta bien configurado en tu PATH, tambien puedes usar:

```cmd
npm install
npm start
```

La aplicacion Angular quedara disponible en:

```text
http://localhost:4200
```

## URLs Importantes

### Frontend

```text
http://localhost:4200
```

### Backend

```text
http://localhost:8081
```

### Endpoint principal de reservas

```text
http://localhost:8081/reservas
```

## Endpoints De La API

### GET /reservas

Lista todas las reservas.

Respuesta esperada:

- `200 OK`

Ejemplo:

```json
[
  {
    "id": 1,
    "customerName": "Ana Perez",
    "date": "2026-03-25",
    "time": "14:30:00",
    "service": "Corte premium",
    "status": "PENDING"
  }
]
```

Si no existen reservas, actualmente la API devuelve una lista vacia con `200 OK`.

### POST /reservas

Crea una reserva nueva.

Consideraciones:

- el `id` se ignora y se genera en backend
- el estado final siempre se establece como `PENDING`

Ejemplo de request:

```json
{
  "customerName": "Luis Gomez",
  "date": "2026-04-02",
  "time": "10:00:00",
  "service": "Manicure express"
}
```

Respuesta esperada:

- `201 Created`

### DELETE /reservas/ {id}

Cancela una reserva existente.

Consideraciones:

- no elimina fisicamente el registro
- cambia el estado a `CANCELLED`

Respuesta esperada:

- `204 No Content`

Si no existe la reserva:

- `404 Not Found`

Ejemplo de error:

```json
{
  "message": "No existe una reserva con id 999."
}
```

## Frontend: Componentes Y Flujo Actual

La vista principal del frontend es una pagina dedicada que muestra una tabla de reservas:

- `reservation-frontend/src/app/pages/reservations-page.component.ts`
- `reservation-frontend/src/app/pages/reservations-page.component.html`

Este componente:

- obtiene las reservas desde `ReservationService`
- muestra un formulario reactivo con campos obligatorios para crear reservas
- recomienda servicios frecuentes para soporte tecnico de computadores
- registra la reserva mediante `createReservation()`
- agrega la nueva reserva a la tabla sin recargar la pagina
- permite cancelar una reserva con un boton
- muestra mensajes de exito y un toast cuando ocurre un error al guardar

## ReservationService En Angular

El servicio principal es `reservation-frontend/src/app/reservation.service.ts`.

Expone estos metodos:

- `getReservations()`
- `createReservation(payload)`
- `cancelReservation(id)`

La pagina principal ya consume `createReservation()` desde un formulario reactivo con estos controles:

- `nombreCliente`
- `fecha`
- `hora`
- `servicio`

Internamente, el frontend transforma esos valores al payload que espera la API:

```json
{
  "customerName": "Karla Martinez Rodriguez",
  "date": "2026-03-28",
  "time": "10:30:00",
  "service": "Diagnostico y mantenimiento preventivo"
}
```

Servicios sugeridos para un negocio de soporte tecnico de computadores:

- Diagnostico y mantenimiento preventivo
- Formateo e instalacion de sistema operativo
- Eliminacion de virus y optimizacion
- Reparacion de hardware y cambio de componentes
- Respaldo y recuperacion de informacion

## Comandos Utiles

### Backend

Ejecutar la aplicacion:

```cmd
./mvnw spring-boot:run
```

Ejecutar pruebas:

```cmd
mvnw.cmd test
```

### Frontend

Levantar en desarrollo:

```cmd
npm start
```

Compilar para producción:

```cmd
npm run build
```

Ejecutar pruebas:

```cmd
 test
```

## Verificaciones Realizadas

Durante la configuracion actual del proyecto ya se verifico que:

- `mvn test` en `reservation-backend` pasa correctamente
- `npm run build` en `reservation-frontend` compila correctamente

## Solucion De Problemas

### Error: Not Found

Revisa que:

- el backend este corriendo en `http://localhost:8081`
- estes consultando `http://localhost:8081/reservas` y no solo la raiz `/`
- el frontend este apuntando a `environment.apiUrl = 'http://localhost:8081'`

### Error: No se pudo conectar con la base de datos

Revisa que:

- PostgreSQL este corriendo
- la base de datos exista
- `DB_URL`, `DB_USERNAME` y `DB_PASSWORD` sean correctos

### Error: El frontend no conecta con el backend

Revisa que:

- Angular este corriendo en `http://localhost:4200`
- Spring Boot este corriendo en `http://localhost:8081`
- no hayas cambiado la URL en los archivos `environment`
- el backend no haya fallado al iniciar por conexion a PostgreSQL

## Notas Finales

- el backend expone documentacion Swagger cuando la aplicacion esta corriendo
- la cancelacion de reservas es logica, no fisica
- el README principal de referencia es este archivo
- si necesitas documentacion mas breve por modulo, revisa tambien los README dentro de cada aplicacion
