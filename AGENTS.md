# Guía de Estilos y Reglas Generales del Backend (Textile SaaS)

Este archivo (AGENTS.md) es leído automáticamente por GitHub Copilot para darnos contexto cada vez que iniciamos un chat.

## Stack Tecnológico y Configuración

- **Framework**: NestJS (TypeScript).
- **Gestor de Paquetes**: `pnpm` (NUNCA usar npm o yarn).
- **Base de Datos**: PostgreSQL utilizando TypeORM.
- **Autenticación**: AWS Cognito (Identity Provider). Los tokens JWT se validan de forma asíncrona (`jwks-rsa`).
- **Autenticación Interna/Relaciones**:
  - El Claim `sub` de Cognito es el mapeo directo al empleado en la base de datos local.
  - Las operaciones usan el decorador `@CurrentUser()` que expone `sub`, `email`, `tenantId`, y `roles`.

## Reglas de Arquitectura

1. **Doble Escritura (Base de Datos + AWS)**:
   - Cualquier escritura destructiva o actualización compartida debe manejarse con **Transacciones Compensatorias**. Si se actualiza AWS Cognito y luego falla la Base de Datos Local, se DEBE hacer un `catch` para revertir el estado de Cognito a su estado original (Rollback manual).
2. **Aislamiento Multitenant**:
   - Cada Entidad fuerte en TypeORM debe vincularse a un `tenantId`.
   - Las validaciones del controlador siempre deben verificar que el `tenantId` del `@CurrentUser()` coincida con el objetivo. El guardia de autorización verifica esto globalmente con `RequireTenantGuard`.
3. **Manejo de Roles (RBAC)**:
   - Administrados en AWS Cognito y transportados en el Payload del token.
   - Jerarquía Inmutable: `OWNER` absolutos e intocables, luego `ADMIN`, luego otros (`SELLER`).
   - Ver validaciones de rol en la documentación completa: `docs/employees-roles.guide.md`.
4. **Resguardo de Datos Sensibles**:
   - Correos electrónicos y PII en logs DEBEN usar al utilitario de enmascaramiento: `maskEmail(email)`.
5. **Manejo de Errores (Safe Exceptions)**:
   - **Respuestas al Cliente**: NUNCA exponer detalles técnicos, confidenciales o de infraestructura en las respuestas HTTP (ej. errores literales como "Failed AWS Cognito Identity Provider", stack traces, o devolver objetos `{ error, cause }` al frontend). Los mensajes HTTP deben ser totalmente genéricos y limpios (ej. "Could not register user" en lugar de "Error in local database while inserting user. Making rollabck in Cognito").
   - **Logs Internos**: Por el contrario, los logs del servidor son OBLIGATORIOS y deben registrar absolutamente todo el contexto del error original (stack trace completo, causa real y variables implicadas) para garantizar un debugging efectivo.

## Comandos Típicos

- Formateo de código: `pnpm run format` (Requiere ser ejecutado tras grandes refactorizaciones a causa de las estrictas reglas del linter de TypeScript).
