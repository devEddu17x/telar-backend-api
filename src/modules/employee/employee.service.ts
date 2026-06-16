import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EmployeeEntity } from './entities/employee.entity';
import { Repository } from 'typeorm/repository/Repository';
import { IsNull } from 'typeorm';
import { UpdateEmployeeDTO } from './dtos/update-employee.dto';
import { PinoLogger } from 'nestjs-pino';
import { maskEmail } from 'src/utils/mask-email.util';
import { AuthService } from '../../modules/auth/services/auth.service';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {
    this.logger.setContext(EmployeeService.name);
  }

  async createEmployee(
    sub: string,
    employeeData: { email: string; names: string; lastNames: string },
    tenantId?: string,
  ): Promise<EmployeeEntity> {
    try {
      const employee = this.employeeRepository.create({
        sub,
        ...employeeData,
        tenantId,
      });
      return await this.employeeRepository.save(employee);
    } catch (error) {
      this.logger.error(
        { err: error, sub, tenantId },
        'Error creating employee',
      );
      throw error;
    }
  }

  async getEmployee(id: string): Promise<EmployeeEntity> {
    const employee = await this.employeeRepository.findOneBy({ id });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
  }

  async getEmployeeBySub(sub: string): Promise<EmployeeEntity> {
    const employee = await this.employeeRepository.findOneBy({ sub });
    if (!employee) {
      this.logger.error(
        { sub: sub.slice(-6) },
        'Employee not found for sub. Possible sync issue between Cognito and local DB.',
      );
      throw new NotFoundException('Employee sub not found.');
    }
    return employee;
  }

  async getEmployeeByEmail(email: string): Promise<EmployeeEntity> {
    const employee = await this.employeeRepository.findOneBy({ email });
    if (!employee) {
      this.logger.error(
        { email: maskEmail(email) },
        'Employee not found for email. Possible sync issue between Cognito and local DB.',
      );
      throw new NotFoundException('Employee email not found.');
    }
    return employee;
  }

  async assignTenantToEmployeeIfUnassigned(
    sub: string,
    tenantId: string,
  ): Promise<boolean> {
    const result = await this.employeeRepository.update(
      { sub, tenantId: IsNull() },
      { tenantId },
    );
    return (result.affected ?? 0) > 0;
  }

  async updateEmployee(
    id: string,
    updateEmployeeDTO: UpdateEmployeeDTO,
  ): Promise<EmployeeEntity> {
    if (!id)
      throw new BadRequestException(
        'Employee id is required. Verify your session',
      );
    const response = await this.employeeRepository.update(
      id,
      updateEmployeeDTO,
    );
    if (response.affected === 0) {
      throw new BadRequestException('Employee not found');
    }
    return await this.employeeRepository.findOneBy({ id });
  }

  async deleteEmployee(id: string): Promise<void> {
    try {
      const result = await this.employeeRepository.delete(id);
      if (result.affected === 0) {
        throw new BadRequestException('Employee not found');
      }
    } catch (error) {
      this.logger.error({ id }, 'Error deleting employee or does not exist');
      throw new BadRequestException(
        'Error deleting employee or does not exist',
      );
    }
  }

  async getAllEmployees(tenantId: string): Promise<EmployeeEntity[]> {
    const employees = await this.employeeRepository.find({
      where: { tenantId },
    });
    if (!employees || employees.length === 0) {
      return [];
    }
    return employees;
  }

  async getMe(
    sub: string,
    roles: string[],
  ): Promise<EmployeeEntity & { roles: string[] }> {
    const employee = await this.getEmployeeBySub(sub);
    return { ...employee, roles };
  }

  async updateMe(
    sub: string,
    email: string,
    updateEmployeeDTO: UpdateEmployeeDTO,
  ): Promise<EmployeeEntity> {
    const employee = await this.getEmployeeBySub(sub);
    const originalLocalData = {
      names: employee.names,
      lastNames: employee.lastNames,
    };

    const updatedEmployee = await this.updateEmployee(
      employee.id,
      updateEmployeeDTO,
    );

    if (updateEmployeeDTO.names || updateEmployeeDTO.lastNames) {
      try {
        await this.authService.updateUserAttributes(
          email,
          updateEmployeeDTO.names,
          updateEmployeeDTO.lastNames,
        );
      } catch (error) {
        this.logger.error(
          { err: error, email: maskEmail(email) },
          'Failed to update Cognito attributes, rolling back local database',
        );
        await this.updateEmployee(employee.id, originalLocalData);
        throw error;
      }
    }
    return updatedEmployee;
  }
}
