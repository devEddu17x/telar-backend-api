import {
  Injectable,
  NotImplementedException,
  ForbiddenException,
} from '@nestjs/common';
import { ROLES, CREATABLE_ROLES } from 'src/auth/constants/roles';
import { CreateEmployeeDTO } from 'src/employee/dtos/create-employee.dto';
import { AuthService } from 'src/auth/services/auth.service';
import { CognitoEmployeeParams } from 'src/auth/interfaces/cognito-user-interface';
import { maskEmail } from 'src/utils/mask-email.util';
import { EmployeeEntity } from 'src/employee/entities/employee.entity';

@Injectable()
export class AdminService {
  constructor(
    private readonly authService: AuthService
  ) {}
  async getAllRoles() {
    throw new NotImplementedException('Not implemented yet');
  }

  async createEmployee(
    createEmployeeDTO: CreateEmployeeDTO,
    creatorTenantId: string,
    callerRoles: string[],
  ) {
    if (
      createEmployeeDTO.role === CREATABLE_ROLES.ADMIN &&
      !callerRoles.includes(ROLES.OWNER)
    ) {
      throw new ForbiddenException(
        'Only an owner can create an admin employee.'
      );
    }

    const employeeParams: CognitoEmployeeParams = {
      email: createEmployeeDTO.email,
      name: createEmployeeDTO.names,
      lastName: createEmployeeDTO.lastNames,
    };

    return await this.authService.createEmployee(
      employeeParams,
      createEmployeeDTO.role,
      creatorTenantId,
    );
  }

  // async updateEmployeeRole(email: string, role: ROLES) {
  //   throw new NotImplementedException('Not implemented yet');
  // }

  // async revokeEmployeeRole(email: string, role: ROLES) {
  //   throw new NotImplementedException('Not implemented yet');
  // }

  async getAllEmployees(): Promise<EmployeeEntity[]> {
    return await this.employeeService.getAllEmployees();
  }

  async revokeEmployeeRole(email: string, role: ROLES) {
    throw new NotImplementedException('Not implemented yet');
  }

  async getAllEmployees(): Promise<EmployeeWithRoles[]> {
    throw new NotImplementedException('Not implemented yet');
  }

  async deleteEmployee(email: string): Promise<{ message: string }> {
    throw new NotImplementedException('Not implemented yet');
  }
}
