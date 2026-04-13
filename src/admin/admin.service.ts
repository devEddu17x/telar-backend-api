import {
  Injectable,
  NotImplementedException,
  ForbiddenException,
} from '@nestjs/common';
import { ROLES, CREATABLE_ROLES } from 'src/auth/constants/roles';
import { CreateEmployeeDTO } from 'src/employee/dtos/create-employee.dto';
import { EmployeeWithRoles } from 'src/employee/interfaces/employee-with-roles.interface';
import { AuthService } from 'src/auth/services/auth.service';
import { EmployeeService } from 'src/employee/employee.service';
import { CognitoEmployeeParams } from 'src/auth/interfaces/cognito-user-interface';

@Injectable()
export class AdminService {
  constructor(
    private readonly authService: AuthService,
    private readonly employeeService: EmployeeService,
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
        'Only an owner can create an admin employee.',
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

  async getAllEmployees(): Promise<EmployeeWithRoles[]> {
    throw new NotImplementedException('Not implemented yet');
  }

  async deleteEmployee(
    id: string,
    tenantId: string,
    callerRoles: string[],
    callerEmail: string,
  ): Promise<{ message: string }> {
    const employee = await this.employeeService.getEmployee(id);

    if (employee.tenantId !== tenantId) {
      throw new ForbiddenException(
        'You cannot delete an employee outside of your organization.',
      );
    }

    if (employee.email === callerEmail) {
      throw new ForbiddenException('You cannot disable your own account.');
    }

    const targetRoles = await this.authService.getUserRoles(employee.email);

    if (targetRoles.includes(ROLES.OWNER)) {
      throw new ForbiddenException('The owner account cannot be disabled.');
    }

    if (
      !callerRoles.includes(ROLES.OWNER) &&
      callerRoles.includes(ROLES.ADMIN) &&
      targetRoles.includes(ROLES.ADMIN)
    ) {
      throw new ForbiddenException(
        'An administrator cannot disable another administrator.',
      );
    }

    await this.authService.disableUser(employee.email);

    await this.employeeService.updateEmployee(id, { isActive: false } as any);

    return { message: 'Employee has been disabled successfully' };
  }

  async reactivateEmployee(
    id: string,
    tenantId: string,
    callerRoles: string[],
    callerEmail: string,
  ): Promise<{ message: string }> {
    const employee = await this.employeeService.getEmployee(id);

    if (employee.tenantId !== tenantId) {
      throw new ForbiddenException(
        'You cannot reactivate an employee outside of your organization.',
      );
    }

    if (employee.email === callerEmail) {
      throw new ForbiddenException(
        'You cannot modify your own profile this way.',
      );
    }

    const targetRoles = await this.authService.getUserRoles(employee.email);

    if (
      !callerRoles.includes(ROLES.OWNER) &&
      callerRoles.includes(ROLES.ADMIN) &&
      targetRoles.includes(ROLES.ADMIN)
    ) {
      throw new ForbiddenException(
        'An administrator cannot reactivate another administrator.',
      );
    }

    await this.authService.enableUser(employee.email);

    await this.employeeService.updateEmployee(id, { isActive: true } as any);

    return { message: 'Employee has been reactivated successfully' };
  }
}
