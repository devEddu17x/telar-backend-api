import {
  BadRequestException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EmployeeEntity } from './entities/employee.entity';
import { Repository } from 'typeorm/repository/Repository';
import { IsNull } from 'typeorm';
import { CreateEmployeeDTO } from './dtos/create-employee.dto';
import { UpdateEmployeeDTO } from './dtos/update-employee.dto';
import { Logger } from '@nestjs/common';
import { ROLES } from 'src/auth/constants/roles';

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);
  constructor(
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>,
  ) { }

  async createEmployee(
    sub: string,
    createEmployeDTO: CreateEmployeeDTO,
  ): Promise<EmployeeEntity> {
    try {
      const employee = this.employeeRepository.create({
        sub,
        ...createEmployeDTO,
      });
      return await this.employeeRepository.save(employee);
    } catch (error) {
      this.logger.error('Error creating employee', { cause: error });
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
        `Employee not found for sub ending with ${sub.slice(-6)}. Possible sync issue between Cognito and local DB.`,
      );
      throw new NotFoundException('Employee sub not found.');
    }
    return employee;
  }

  async assignTenantToEmployeeIfUnassigned(sub: string, tenantId: string): Promise<boolean> {
    const result = await this.employeeRepository.update(
      { sub, tenantId: IsNull() },
      { tenantId }
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
      this.logger.error('Error deleting employee or does not exist');
      throw new BadRequestException(
        'Error deleting employee or does not exist',
      );
    }
  }

  async getAllEmployees(): Promise<EmployeeEntity[]> {
    const employees = await this.employeeRepository.find();
    if (!employees || employees.length === 0) {
      throw new NotFoundException('No employees found');
    }
    return employees;
  }

  async updateEmployeeRole(email: string, role: ROLES): Promise<{ message: string }> {
    throw new NotImplementedException('Not implemented yet');
  }
  async getRolesForEmployee(email: string): Promise<string[]> {
    throw new NotImplementedException('Not implemented yet');
  }
  async revokeEmployeeRole(email: string, role: ROLES) {
    throw new NotImplementedException('Not implemented yet');
  }
}
