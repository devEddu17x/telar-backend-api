import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity } from './entities/tenant.entity';
import { CreateTenantDto } from './dtos/create-tenant.dto';
import { CognitoService } from '../../modules/auth/services/cognito.service';
import { EmployeeService } from '../employee/employee.service';
import { maskEmail } from 'src/utils/mask-email.util';

@Injectable()
export class TenantService {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    private readonly cognitoService: CognitoService,
    private readonly employeeService: EmployeeService,
  ) {
    this.logger.setContext(TenantService.name);
  }

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

      const rowsAffected =
        await this.employeeService.assignTenantToEmployeeIfUnassigned(
          userSub,
          savedTenant.id,
        );

      if (!rowsAffected) {
        throw new ConflictException(
          'Tenant setup already completed or in progress for this user.',
        );
      }

      await this.cognitoService.setTenantId(userEmail, savedTenant.id);
      cognitoUpdated = true;

      return savedTenant;
    } catch (error) {
      this.logger.error(
        { err: error, email: maskEmail(userEmail), userSub },
        'Error creating setup payload, initiating rollback.',
      );

      if (cognitoUpdated) {
        await this.cognitoService.clearTenantId(userEmail);
      }
      if (savedTenant) {
        try {
          await this.tenantRepository.delete(savedTenant.id);
        } catch (rollbackError) {
          this.logger.error(
            { err: rollbackError, tenantId: savedTenant.id },
            'Critical Rollback Failure: Could not delete tenant',
          );
        }
      }
      throw new InternalServerErrorException('Could not create tenant');
    }
  }

  async getTenantById(id: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }
}
