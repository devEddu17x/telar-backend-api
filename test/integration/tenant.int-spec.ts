import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { CognitoService } from 'src/modules/auth/services/cognito.service';
import { EmployeeEntity } from 'src/modules/employee/entities/employee.entity';
import { EmployeeService } from 'src/modules/employee/employee.service';
import { TenantEntity } from 'src/modules/tenant/entities/tenant.entity';
import { TenantService } from 'src/modules/tenant/tenant.service';
import { createOwnerFactory } from '../factories/auth.factory';
import { createTenantFactory } from '../factories/tenant.factory';
import { getCognitoAttribute } from '../helpers/cognito-attributes';
import {
  createTestUserPool,
  getTestCognitoUser,
} from '../helpers/cognito-local';
import { resetDatabase } from '../helpers/database';
import { createTestApp } from '../helpers/test-app';

describe('Tenant integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authService: AuthService;
  let cognitoService: CognitoService;
  let employeeService: EmployeeService;
  let tenantService: TenantService;
  let employeeRepository: Repository<EmployeeEntity>;
  let tenantRepository: Repository<TenantEntity>;

  beforeAll(async () => {
    await createTestUserPool();

    app = await createTestApp();
    dataSource = app.get(DataSource);
    authService = app.get(AuthService);
    cognitoService = app.get(CognitoService);
    employeeService = app.get(EmployeeService);
    tenantService = app.get(TenantService);
    employeeRepository = app.get(getRepositoryToken(EmployeeEntity));
    tenantRepository = app.get(getRepositoryToken(TenantEntity));
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    await resetDatabase(dataSource);
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await app?.close();
  });

  it('sets up a tenant for a new owner across Postgres and Cognito', async () => {
    const { owner, employee } = await createOwner();
    const tenantData = createTenantFactory({
      name: 'Primary Tenant',
      ruc: '20123456789',
      address: 'Main street 123',
    });

    const tenant = await tenantService.createTenant(
      tenantData,
      owner.email,
      employee.sub,
    );

    expect(tenant).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: tenantData.name,
        ruc: tenantData.ruc,
        address: tenantData.address,
      }),
    );

    const persistedEmployee = await employeeRepository.findOneByOrFail({
      id: employee.id,
    });
    expect(persistedEmployee.tenantId).toBe(tenant.id);

    const cognitoUser = await getTestCognitoUser(owner.email);
    expect(
      getCognitoAttribute(cognitoUser.UserAttributes, 'custom:tenant_id'),
    ).toBe(tenant.id);

    await expect(tenantService.getTenantById(tenant.id)).resolves.toEqual(
      expect.objectContaining({
        id: tenant.id,
        name: tenantData.name,
      }),
    );
  });

  it('rejects tenant setup for an owner that already belongs to a tenant', async () => {
    const { owner, employee } = await createOwner();

    await tenantService.createTenant(
      createTenantFactory({ name: 'Existing Tenant' }),
      owner.email,
      employee.sub,
    );

    await expect(
      tenantService.createTenant(
        createTenantFactory({ name: 'Second Tenant' }),
        owner.email,
        employee.sub,
      ),
    ).rejects.toThrow('Workspace already setup');

    await expect(tenantRepository.find()).resolves.toHaveLength(1);
  });

  it('rolls back tenant creation when the owner assignment is already taken', async () => {
    const { owner, employee } = await createOwner();
    jest
      .spyOn(employeeService, 'assignTenantToEmployeeIfUnassigned')
      .mockResolvedValueOnce(false);

    await expect(
      tenantService.createTenant(
        createTenantFactory({ name: 'Racing Tenant' }),
        owner.email,
        employee.sub,
      ),
    ).rejects.toThrow('Could not create tenant');

    await expect(tenantRepository.find()).resolves.toHaveLength(0);

    const cognitoUser = await getTestCognitoUser(owner.email);
    expect(
      getCognitoAttribute(cognitoUser.UserAttributes, 'custom:tenant_id'),
    ).toBeUndefined();
  });

  it('rolls back tenant creation and local employee assignment when Cognito tenant update fails', async () => {
    const { owner, employee } = await createOwner();
    jest
      .spyOn(cognitoService, 'setTenantId')
      .mockRejectedValueOnce(new Error('cognito unavailable'));

    await expect(
      tenantService.createTenant(
        createTenantFactory({ name: 'Rollback Tenant' }),
        owner.email,
        employee.sub,
      ),
    ).rejects.toThrow('Could not create tenant');

    await expect(tenantRepository.find()).resolves.toHaveLength(0);

    const persistedEmployee = await employeeRepository.findOneByOrFail({
      id: employee.id,
    });
    expect(persistedEmployee.tenantId).toBeNull();
  });

  async function createOwner() {
    const owner = createOwnerFactory();
    const employee = await authService.createOwner(owner);

    return { owner, employee };
  }
});
