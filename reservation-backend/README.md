# Reservation Backend

Este modulo contiene la API REST del sistema de reservas.

## Resumen

- puerto por defecto: `8081`
- base de datos por defecto: PostgreSQL `g3reservation`
- pruebas: H2 en memoria

## Ejecutar

```cmd
./mvnw spring-boot:run
```

## Probar

```cmd
mvnw.cmd test
```

## Endpoint principal

```text
http://localhost:8081/reservas
```

## Integracion Con El Frontend

El cliente Angular consume este endpoint desde un formulario reactivo para crear reservas nuevas.

Campos que recibe la API en el `POST /reservas`:

- `customerName`
- `date`
- `time`
- `service`

Si ocurre un error de negocio o de persistencia, el backend responde con un mensaje que el frontend muestra dentro de un toast para informar al usuario.

## Referencia principal

Consulta el README raiz del repositorio para la documentacion completa del sistema.
