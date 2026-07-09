# Telar Backend API

Backend principal de Telar, construido con NestJS, PostgreSQL, TypeORM, AWS Cognito y almacenamiento compatible con S3.

## Requisitos

- Node.js 22
- pnpm
- Docker y Docker Compose

## Levantamiento En Local

Instala dependencias:

```bash
pnpm install
```

Crea el archivo de entorno local:

```bash
cp .env.example .env.local
```

Configura `.env.local` con tus valores locales o los valores entregados por la infraestructura.

Levanta PostgreSQL local:

```bash
docker compose -f compose.yml up -d
```

Inicia la API en modo desarrollo:

```bash
pnpm start:dev
```

La API usa el prefijo configurado en `API_PREFIX`. Por ejemplo, si `API_PREFIX=api/v1` y `API_PORT=3000`, Swagger queda disponible en:

```text
http://localhost:3000/api/v1/docs
```

Para apagar la base de datos local:

```bash
docker compose -f compose.yml down
```

## Tests

Los tests unitarios viven junto al código fuente en `src/**/*.spec.ts`.

```bash
pnpm test:unit
```

Los tests de integración viven en `test/integration` y usan servicios locales con Docker:

- PostgreSQL
- S3Mock
- cognito-local

Levanta los servicios de integración:

```bash
pnpm test:services:up
```

Ejecuta integración:

```bash
pnpm test:integration
```

Apaga los servicios:

```bash
pnpm test:services:down
```

Para reiniciar los servicios y limpiar volúmenes:

```bash
pnpm test:services:reset
```

Comandos útiles adicionales:

```bash
pnpm exec tsc --noEmit
pnpm run build
pnpm run lint
pnpm exec prettier --check .
```

## CI/CD

Este repositorio tiene workflows de GitHub Actions en `.github/workflows`.

El CI corre en pull requests hacia `develop`, `qa` y `prod`. Valida:

- instalación de dependencias
- formato con Prettier
- lint
- tests unitarios
- tests de integración
- build de NestJS

El CD corre en pushes a `develop`, `qa`, `prod`, tags `v*` o ejecución manual. Construye la imagen Docker, la publica en ECR y actualiza el servicio ECS usando parámetros de SSM creados por la infraestructura.
