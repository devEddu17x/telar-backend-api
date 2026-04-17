<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Textile SaaS Backend

API principal para el sistema SaaS Multitenant, construido con NestJS, PostgreSQL y AWS Cognito.

## 1. Configuración Inicial (Rapida)

```bash
# 1. Instalar dependencias (Obligatorio usar pnpm)
$ pnpm install

# 2. Configurar variables de entorno
$ cp .env.example .env.local
# Y rellena los valores necesarios en .env.local
```

## 2. Guía de Uso de Docker Compose

El proyecto cuenta con dos entornos de Docker para diferentes escenarios.

### Opción A: Entorno de Desarrollo (Para trabajar en el Backend)

**Archivo:** `docker-compose.dev.yml`

Este entorno levanta **únicamente la infraestructura** (Base de Datos PostgreSQL, Loki y Grafana). La API de NestJS queda libre para que la ejecutes tú localmente y así aproveches el _Hot-Reload_ (recarga en caliente).

```bash
# 1. Levantar infraestructura en segundo plano
$ docker compose -f docker-compose.dev.yml up -d

# 2. Iniciar la API localmente (lee el .env.local de forma automática)
$ pnpm start:dev
```

### Opción B: Entorno Completo (Para Frontends o Pruebas de Integración)

**Archivo:** `docker-compose.yml` (por defecto)

Este entorno Dockeriza **TODO el proyecto**, incluyendo la propia API de NestJS. Es ideal para cuando otras áreas (ej. Frontend) solo quieren levantar la API y consumirla sin tener que lidiar con comandos de Node.js o el código fuente directo.

> **⚠️ IMPORTANTE (Solo para desarrollo local):** Si vas a ejecutar este entorno en tu máquina y requieres conexión a los servicios de AWS (como Cognito o S3), asegúrate de descomentar la línea del volumen de AWS en el archivo `docker-compose.yml` (`- ~/.aws:/home/nestjs/.aws:ro`). Esto inyectará tus credenciales locales de AWS CLI al contenedor. En producción (AWS ECS/EKS/EC2) esto NO es necesario, ya que los roles se inyectan automáticamente.

```bash
# Levantar el ecosistema completo inyectando las variables del entorno local
$ docker compose --env-file .env.local up -d --build

# Ver únicamente los logs generados por la API
$ docker compose logs -f api
```

### Limpiar Contenedores

Para apagar y remover los contenedores de cualquier entorno:

```bash
# Si usaste la opción A (Backend Dev)
$ docker compose -f docker-compose.dev.yml down

# Si usaste la opción B (Completo / Frontend)
$ docker compose down
```
