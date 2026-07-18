# AGENTS.md

## Project Context

Backend API for Telar, built with NestJS, TypeORM, PostgreSQL, AWS Cognito, and S3-compatible storage.

The current testing direction is to replace noisy mock-heavy tests with fewer tests that prove real behavior.

User preferences:

- Avoid tests that only assert mocked return values.
- Avoid controller delegation tests with no real behavior.
- Prefer integration/component tests for important workflows.
- Keep unit tests for guards, validators, pure utilities, and focused domain rules.
- Keep logs visible during tests; logs already helped catch behavior problems.

## Application Map And Domain Rules

Telar is a multi-tenant tailoring workflow. The API prefix is configured by
`API_PREFIX` (normally `api/v1`). The main business flow is:

```text
owner registration -> email confirmation -> tenant setup -> catalog and customers
-> quote -> order -> production / completion
```

### Identity, Roles, And Tenant Boundary

- Cognito is the identity provider; PostgreSQL keeps the application employee.
  The employee primary identity is Cognito's `sub`, never the email or Cognito
  `Username`.
- Roles are `owner`, `admin`, and `seller`. Owners bypass the role checks in
  `RolesGuard`. The admin module is available to owners and admins, but only
  an owner may create an employee with the `admin` role.
- Owners start without a tenant. `POST /tenant/setup` creates the tenant,
  assigns it to the local employee, and writes `custom:tenant_id` in Cognito.
  This is a compensating transaction: failures must roll back the local tenant
  and Cognito claim as applicable.
- `RequireTenantGuard` protects tenant-scoped routes. Do not bypass it except
  for intentional pre-setup routes using `@SkipTenantCheck()`.
- Every lookup, mutation, relation, and query builder for tenant-owned data
  must include `tenantId`. Never trust an ID from a DTO without checking that
  the referenced record belongs to the current tenant.

### Modules

- `auth`: owner registration, confirmation, login, Cognito adapters, JWT
  validation, roles, and tenant claims. Cognito admin operations still use the
  email alias; persist the returned `sub` in `EmployeeEntity`.
- `tenant`: one-time workspace setup and compensating rollback across
  PostgreSQL and Cognito.
- `employee` and `admin`: employee profile management plus owner/admin flows
  to create, promote, revoke, deactivate, and reactivate tenant employees.
- `customer`: tenant-scoped customers, including partial name/last-name/phone
  searches. Email is unique per tenant, not globally.
- `clothes`: tenant catalog. A garment has variants by size and gender and can
  have images. Draft creation supplies the default `M` / `UNISEX` variant;
  duplicate size/gender combinations must be rejected.
- `storage`: S3-compatible adapter for R2, AWS S3, and S3Mock. It produces
  tenant/clothe/UUID object keys and presigned PUT URLs; public image URLs are
  composed from `STORAGE_PUBLIC_URL`. The current clothes flow stores the
  public URL before the client finishes uploading; do not add an existence
  check unless that behavior is explicitly being addressed.
- `quote`: quotes and quote details. Unit price is garment base price plus the
  selected variant additional price. Customizations cannot exceed quantity.
  Variants and garments must be validated against the current tenant.
- `order`: creates an address and order from a non-final quote in a database
  transaction, then marks the quote `APPROVED`. Orders cannot be created from
  cancelled, rejected, or approved quotes, nor when any quoted garment is a
  draft. Order statuses are `IN_PRODUCTION`, `DONE`, and `CANCELLED`.

Quote statuses are `PENDING`, `APPROVED`, `REJECTED`, and `CANCELLED`. Keep
their state rules in services, not controllers.

### Persistence And Catalog Seed

- TypeORM uses `synchronize` outside production. Entities are listed directly
  in `src/core/config/env/typeorm.config.ts`; add new persisted entities there.
- `DatabaseSeederService` runs at module initialization and upserts the size
  and gender catalogs. Do not rely on manually seeded local catalog data.
- Use TypeORM transactions for a group of database writes. When a workflow
  spans PostgreSQL and Cognito/S3, use explicit compensating actions because
  there is no distributed transaction.

## Current Test Strategy

See `TESTS.md` for the roadmap and rationale.

Current split:

- Unit tests under `src` for guards, utilities, validators, and selected service rules.
- Integration tests under `test/integration` using real local services:
  - PostgreSQL for TypeORM persistence.
  - Adobe S3Mock for S3-compatible storage.
  - `jagregory/cognito-local` for Cognito-compatible flows.

The local services are not unit-test mocks. They are local service doubles used to exercise real adapters and Nest providers.

## Current Services

The current test compose file is `compose.test.yml`, not `docker-compose.test.yml`.

It starts:

```text
test_db      postgres:16-alpine          localhost:5433
test_s3      adobe/s3mock:4.10.0         localhost:9090
test_cognito jagregory/cognito-local:5.3.0 localhost:9229
```

S3Mock does not need MinIO root credentials. The AWS SDK still needs dummy credentials to sign requests and presigned URLs:

```text
STORAGE_ACCESS_KEY_ID=test-access-key
STORAGE_SECRET_ACCESS_KEY=test-secret-key
```

These are configured in `test/helpers/test-env.ts`.

## Local Development Services

`compose.yml` is the local development stack. A single `docker compose up -d`
starts PostgreSQL, S3Mock, and cognito-local. It persists their data in named
volumes and generates `.env.local.docker` for the API.

- Do not edit `.env.local.docker`; it is generated by
  `scripts/cognito-local-bootstrap.ts`.
- The `telar_app_cognito_init` service must run as UID/GID `1000:1000` so the
  generated file remains editable from the host.
- Local Cognito uses the fixed confirmation code `123456`.
- The Cognito container configures `TokenConfig.IssuerDomain` as
  `http://localhost:9229`. `JwtStrategy` must use `cognito.endpoint` for both
  issuer and JWKS only when that endpoint exists; otherwise it must retain the
  AWS Cognito authority.
- S3Mock is permissive for local CORS preflight requests. Production S3/R2 CORS
  remains bucket infrastructure configuration, not application configuration.

## Commands

Unit tests:

```bash
pnpm test:unit
```

Integration services:

```bash
pnpm test:services:up
pnpm test:services:down
pnpm test:services:reset
```

Integration tests:

```bash
pnpm test:integration
```

Type check:

```bash
pnpm exec tsc --noEmit
```

Default `pnpm test` currently runs unit tests only.

In Codex sandbox, Docker/localhost integration tests require escalation. If integration fails with connection errors to `localhost:5433`, `localhost:9090`, or `localhost:9229`, first ensure `pnpm test:services:up` has run.

## Current Unit Tests

The intentionally kept unit specs are:

```text
src/modules/admin/admin.service.spec.ts
src/modules/auth/guards/require-tenant.guard.spec.ts
src/modules/auth/guards/roles.guard.spec.ts
src/modules/auth/services/cognito.service.spec.ts
src/modules/auth/strategies/jwt.strategy.spec.ts
src/modules/order/validators/delivery-date.validator.spec.ts
src/utils/mask-email.util.spec.ts
```

Last known green unit result:

```text
7 suites, 49 tests
```

Unit cleanup notes:

- Removed `jwt-auth.guard.spec.ts`; it only asserted Nest's `AuthGuard('jwt')` inheritance.
- Removed `auth.service.spec.ts`; its important behavior is covered by auth integration tests.
- Removed `tenant.service.spec.ts`; tenant setup and rollback are covered by tenant integration tests.
- Reduced `admin.service.spec.ts` to authorization rule branches that stop dangerous calls.
- Reduced `cognito.service.spec.ts` to error mapping and rollback branches that are hard to provoke reliably against cognito-local.
- Kept pure/high-signal unit tests for guards, JWT payload mapping, delivery-date validation, and `maskEmail`.

## Current Integration Tests

Integration specs now present:

```text
test/integration/auth.int-spec.ts
test/integration/storage.int-spec.ts
test/integration/tenant.int-spec.ts
test/integration/customer.int-spec.ts
test/integration/clothes.int-spec.ts
test/integration/quote.int-spec.ts
test/integration/order.int-spec.ts
test/integration/commerce-flow.int-spec.ts
```

Last known green integration result:

```text
8 suites, 31 tests
```

## Current Helpers And Factories

Factories:

```text
test/factories/auth.factory.ts
test/factories/customer.factory.ts
test/factories/tenant.factory.ts
test/factories/storage.factory.ts
test/factories/clothes.factory.ts
test/factories/quote.factory.ts
test/factories/order.factory.ts
```

Helpers:

```text
test/helpers/test-env.ts
test/helpers/test-app.ts
test/helpers/database.ts
test/helpers/retry.ts
test/helpers/cognito-local.ts
test/helpers/cognito-attributes.ts
test/helpers/jwt.ts
test/helpers/s3-mock.ts
test/helpers/catalog.ts
```

Use factories to keep specs readable. Prefer passing optional overrides for case-specific values instead of hardcoding large DTOs inside tests.

## PR 1: Cleanup And Test Infrastructure

Completed previously:

- Removed low-value specs that only asserted mocked returns or controller delegation.
- Added integration Jest config.
- Added local service stack.
- Added DB reset helper.
- Kept high-value unit tests green.

## PR 2: Storage And Auth

Implemented:

- `storage.int-spec.ts`
  - key generation includes tenant ID, clothes ID, UUID, and extension.
  - presigned PUT is exercised against S3Mock.
  - upload uses a tiny PNG body, not plain text.
  - existence, public URL composition, key extraction, and deletion are verified.
  - the `.bin` fallback test was removed because the user does not want to lock that behavior.
- `auth.int-spec.ts`
  - owner registration creates Cognito user and local employee.
  - owner role is verified from issued access-token groups.
  - duplicate owner registration does not duplicate local employee.
  - confirmed owner login returns tokens.
  - invalid password returns `Invalid credentials`.
  - employee creation persists local employee and Cognito tenant metadata.
  - add/remove role reflected in issued tokens.
  - tenant claim set/clear.
  - disable/enable user state.

Production code changes already made for this:

- `AWS_COGNITO_ENDPOINT` is optional and used only for local cognito-local tests.
- `CognitoService.initiateAuth` treats `InvalidPasswordException` as unauthorized.
- `AuthService.login` logs expected auth rejection as `info`, not `error`.
- Pino test logs remain visible.

## PR 3: Tenant And Customer

Implemented:

- `tenant.int-spec.ts`
  - successful tenant setup across Postgres and Cognito.
  - employee receives tenant ID.
  - Cognito receives `custom:tenant_id`.
  - repeated setup is rejected.
  - rollback when employee assignment reports no rows affected.
  - rollback when Cognito tenant update fails.
- `customer.int-spec.ts`
  - customer creation persists current tenant ID and data.
  - listing and lookup are isolated by tenant.
  - search by partial names, last names, and phone is tenant scoped.
  - search with no filters returns `[]`.

Note on rollback tests:

- Some tenant tests intentionally force failures with `jest.spyOn(...).mockResolvedValueOnce(false)` or `mockRejectedValueOnce(...)`.
- This is fault injection, not low-value mocking. The app, DB, and most providers are real; the test forces a specific failure point to verify real rollback effects.
- Expected rollback logs may appear as `ERROR` and the tests still pass.

## PR 4: Clothes, Quote, Order

Implemented:

- `clothes.int-spec.ts`
  - explicit catalog seeding and catalog assertions.
  - clothes creation with variants.
  - draft clothes creation with default `M` and `UNISEX` variant.
  - duplicate size/gender combinations rejected before creating rows.
- `quote.int-spec.ts`
  - quote total calculation from real clothes base price plus variant additional.
  - detail unit prices and customizations persisted.
  - customizations cannot exceed quantity.
  - variants from another tenant are rejected.
  - quote summaries include customer data, total clothes, and total units.
- `order.int-spec.ts`
  - order creation from pending quote.
  - quote becomes `APPROVED`.
  - cancelled quote cannot create order.
  - order summary includes customer, address, totals.
  - status rules for `DONE`, `CANCELLED`, and final states.
- `commerce-flow.int-spec.ts`
  - owner registration.
  - owner confirmation/login.
  - tenant setup.
  - customer creation.
  - clothes creation.
  - image registration and upload through presigned URL.
  - quote creation.
  - order creation.
  - quote approval and order summary verification.

Production code change in PR 4:

- `src/modules/quote/quote.service.ts`
  - `getDetailUnitPrice` now receives `tenantId`.
  - quote creation/update now rejects variants or clothes that do not belong to the current tenant.
  - This fixed a real tenant-isolation gap discovered while writing PR 4 tests.

## Cognito Local Notes

cognito-local quirks discovered:

- `AdminListGroupsForUser` by email returns empty arrays even when the user is
  assigned to groups. Cognito Local stores the canonical username as the `sub`;
  resolve the user with `AdminGetUser` and use `response.Username` when this
  operation must work locally and in AWS.
- Issued tokens do include `cognito:groups`, so role integration tests assert groups from decoded access tokens.
- `AdminDisableUser` updates `Enabled`, but cognito-local may still allow login. Tests verify `Enabled`.
- `ResendConfirmationCode` is intentionally skipped.
- Wrong password raises `InvalidPasswordException`; production Cognito often uses `NotAuthorizedException`.
- Cognito Local does not send real email. With `CODE=123456`, confirmation
  accepts that fixed value. `ConfirmSignUp` can still leave `email_verified`
  as `false`, so local development must not use that claim as evidence of an
  actual inbox verification.

## Logging Decision

Do not silence logs in `NODE_ENV=test`.

Current desired behavior:

- Logs are visible during tests.
- Expected invalid login logs as `info` with `Login attempt rejected`.
- Unexpected login failures still log as `error`.
- Rollback tests may intentionally emit error logs.

## Validation Last Known Good

Last verified successfully after PR 4:

```bash
pnpm exec tsc --noEmit
pnpm test:integration
pnpm test:unit
```

Results:

```text
TypeScript: OK
Integration: 8 suites, 31 tests
Unit: 10 suites, 88 tests
```

Services were up via:

```bash
pnpm test:services:up
```
