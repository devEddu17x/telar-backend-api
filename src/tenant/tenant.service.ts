import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity } from './entities/tenant.entity';
import { CreateTenantDto } from './dtos/create-tenant.dto';
import { CognitoService } from '../auth/services/cognito.service';
import { EmployeeService } from '../employee/employee.service';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    private readonly cognitoService: CognitoService,
    private readonly employeeService: EmployeeService,
  ) {}

  async createTenant(
    dto: CreateTenantDto,
    userEmail: string,
    userSub: string,
  ): Promise<TenantEntity> {
    const employee = await this.employeeService.getEmployeeBySub(userSub);
    if (employee.tenantId) {
      throw new BadRequestException(
        'User is already assigned to a tenant. Workspace already setup.',
      );
    }

    let savedTenant: TenantEntity | null = null;
    let cognitoUpdated = false;

    try {
      const tenant = this.tenantRepository.create(dto);
      savedTenant = await this.tenantRepository.save(tenant);

      await this.cognitoService.setTenantId(userEmail, savedTenant.id);
      cognitoUpdated = true;

      await this.employeeService.assignTenantToEmployee(
        userSub,
        savedTenant.id,
      );

      return savedTenant;
    } catch (error) {
      this.logger.error('Error creating setup payload, initiating rollback.', {
        cause: error,
      });

      if (cognitoUpdated) {
        await this.cognitoService.clearTenantId(userEmail);
      }
      if (savedTenant) {
        try {
          await this.tenantRepository.delete(savedTenant.id);
        } catch (rollbackError) {
          this.logger.error(
            `Critical Rollback Failure: Could not delete tenant ${savedTenant.id}`,
            { cause: rollbackError },
          );
        }
      }
      throw new InternalServerErrorException('Could not create tenant');
    }
  }

  async getTenantById(id: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }
    return tenant;
  }
}
