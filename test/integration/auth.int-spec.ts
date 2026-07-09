import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { CognitoService } from 'src/modules/auth/services/cognito.service';
import { EmployeeEntity } from 'src/modules/employee/entities/employee.entity';
import { TenantEntity } from 'src/modules/tenant/entities/tenant.entity';
import { CREATABLE_ROLES, ROLES } from 'src/common/enum/roles';
import { createTestApp } from '../helpers/test-app';
import { resetDatabase } from '../helpers/database';
import {
  adminConfirmTestUser,
  createTestUserPool,
  getTestCognitoUser,
} from '../helpers/cognito-local';
import {
  createEmployeeFactory,
  createOwnerFactory,
} from '../factories/auth.factory';
import { createTenantEntityFactory } from '../factories/tenant.factory';
import { decodeJwtPayload } from '../helpers/jwt';
import { randomUUID } from 'crypto';

describe('Auth and Cognito integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authService: AuthService;
  let cognitoService: CognitoService;
  let employeeRepository: Repository<EmployeeEntity>;
  let tenantRepository: Repository<TenantEntity>;

  beforeAll(async () => {
    await createTestUserPool();

    app = await createTestApp();
    dataSource = app.get(DataSource);
    authService = app.get(AuthService);
    cognitoService = app.get(CognitoService);
    employeeRepository = app.get(getRepositoryToken(EmployeeEntity));
    tenantRepository = app.get(getRepositoryToken(TenantEntity));
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('registers an owner in Cognito, assigns owner role and creates the local employee', async () => {
    const owner = createOwnerFactory({
      name: 'Olivia',
      lastName: 'Owner',
    });

    const employee = await authService.createOwner(owner);

    expect(employee.id).toBeDefined();
    expect(employee.email).toBe(owner.email);
    expect(employee.names).toBe(owner.name);
    expect(employee.lastNames).toBe(owner.lastName);
    expect(employee.tenantId).toBeNull();

    const persistedEmployee = await employeeRepository.findOneByOrFail({
      email: owner.email,
    });
    expect(persistedEmployee.sub).toBe(employee.sub);

    await adminConfirmTestUser(owner.email);
    const tokens = await authService.login(owner.email, owner.password);
    expect(decodeJwtPayload(tokens.accessToken)['cognito:groups']).toEqual([
      ROLES.OWNER,
    ]);
  });

  it('rejects duplicate owner registration without creating a second local employee', async () => {
    const owner = createOwnerFactory({
      name: 'Diana',
      lastName: 'Duplicate',
    });

    await authService.createOwner(owner);

    await expect(authService.createOwner(owner)).rejects.toThrow(
      'User already exists',
    );

    const employees = await employeeRepository.find({
      where: { email: owner.email },
    });
    expect(employees).toHaveLength(1);
  });

  it('logs in a confirmed owner and rejects invalid credentials', async () => {
    const owner = createOwnerFactory({
      name: 'Lina',
      lastName: 'Login',
    });

    await authService.createOwner(owner);
    await adminConfirmTestUser(owner.email);

    const tokens = await authService.login(owner.email, owner.password);

    expect(tokens.accessToken).toEqual(expect.any(String));
    expect(tokens.idToken).toEqual(expect.any(String));
    expect(tokens.refreshToken).toEqual(expect.any(String));

    await expect(
      authService.login(owner.email, 'WrongPass123!'),
    ).rejects.toThrow('Invalid credentials');
  });

  it('creates an employee in Cognito with tenant metadata, assigns the requested role and persists it locally', async () => {
    const tenant = await createTenantEntityFactory(tenantRepository, {
      name: 'Employee Tenant',
    });
    const employeeParams = createEmployeeFactory({
      name: 'Sofia',
      lastName: 'Seller',
    });

    const employee = await authService.createEmployee(
      employeeParams,
      CREATABLE_ROLES.SELLER,
      tenant.id,
    );

    expect(employee.email).toBe(employeeParams.email);
    expect(employee.tenantId).toBe(tenant.id);

    const cognitoUser = await getTestCognitoUser(employeeParams.email);
    expect(cognitoUser.UserAttributes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Name: 'custom:tenant_id',
          Value: tenant.id,
        }),
      ]),
    );
  });

  it('adds and removes Cognito roles reflected in issued tokens', async () => {
    const owner = createOwnerFactory({
      name: 'Rita',
      lastName: 'Roles',
    });

    await authService.createOwner(owner);
    await adminConfirmTestUser(owner.email);

    await cognitoService.addRole(owner.email, ROLES.ADMIN);

    let tokens = await authService.login(owner.email, owner.password);
    expect(decodeJwtPayload(tokens.accessToken)['cognito:groups']).toEqual(
      expect.arrayContaining([ROLES.OWNER, ROLES.ADMIN]),
    );

    await cognitoService.removeRole(owner.email, ROLES.ADMIN);

    tokens = await authService.login(owner.email, owner.password);
    expect(decodeJwtPayload(tokens.accessToken)['cognito:groups']).toEqual([
      ROLES.OWNER,
    ]);
  });

  it('writes and clears the Cognito tenant claim', async () => {
    const owner = createOwnerFactory({
      name: 'Tania',
      lastName: 'Tenant',
    });
    const tenantId = randomUUID();

    await authService.createOwner(owner);
    await cognitoService.setTenantId(owner.email, tenantId);

    let cognitoUser = await getTestCognitoUser(owner.email);
    expect(cognitoUser.UserAttributes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Name: 'custom:tenant_id', Value: tenantId }),
      ]),
    );

    await cognitoService.clearTenantId(owner.email);

    cognitoUser = await getTestCognitoUser(owner.email);
    expect(cognitoUser.UserAttributes).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Name: 'custom:tenant_id' }),
      ]),
    );
  });

  it('disables and re-enables a confirmed Cognito user', async () => {
    const owner = createOwnerFactory({
      name: 'Ema',
      lastName: 'Enabled',
    });

    await authService.createOwner(owner);
    await adminConfirmTestUser(owner.email);

    await cognitoService.disableUser(owner.email);
    let cognitoUser = await getTestCognitoUser(owner.email);
    expect(cognitoUser.Enabled).toBe(false);

    await cognitoService.enableUser(owner.email);
    cognitoUser = await getTestCognitoUser(owner.email);
    expect(cognitoUser.Enabled).toBe(true);

    await expect(
      authService.login(owner.email, owner.password),
    ).resolves.toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        idToken: expect.any(String),
        refreshToken: expect.any(String),
      }),
    );
  });
});
