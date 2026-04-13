import {
  Injectable,
  NotImplementedException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ROLES, CREATABLE_ROLES } from 'src/auth/constants/roles';
import { CreateEmployeeDTO } from 'src/employee/dtos/create-employee.dto';
import { EmployeeWithRoles } from 'src/employee/interfaces/employee-with-roles.interface';
import { AuthService } from 'src/auth/services/auth.service';
import { EmployeeService } from 'src/employee/employee.service';
import { CognitoEmployeeParams } from 'src/auth/interfaces/cognito-user-interface';
import { maskEmail } from 'src/utils/mask-email.util';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
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

  async getAllEmployees(tenantId: string): Promise<EmployeeWithRoles[]> {
    const employees = await this.employeeService.getAllEmployees(tenantId);

    const employeesWithRoles = await Promise.all(
      employees.map(async (employee) => {
        const roles = await this.authService.getUserRoles(employee.email);
        return {
          id: employee.id,
          sub: employee.sub,
          email: employee.email,
          names: employee.names,
          lastNames: employee.lastNames,
          tenantId: employee.tenantId,
          isActive: employee.isActive,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt,
          roles,
        } as EmployeeWithRoles;
      }),
    );

    return employeesWithRoles;
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

    try {
      await this.employeeService.updateEmployee(id, { isActive: false } as any);
    } catch (error) {
      this.logger.error(
        `Failed to disable employee locally, rolling back Cognito state for ${maskEmail(employee.email)}`,
        error,
      );
      try {
        await this.authService.enableUser(employee.email);
      } catch (rollbackError) {
        this.logger.error(
          `CRITICAL: Failed to rollback Cognito state for ${maskEmail(employee.email)}`,
          rollbackError,
        );
      }
      throw new InternalServerErrorException(
        'An error occurred during disable operation.',
      );
    }

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

    try {
      await this.employeeService.updateEmployee(id, { isActive: true } as any);
    } catch (error) {
      this.logger.error(
        `Failed to reactivate employee locally, rolling back Cognito state for ${maskEmail(employee.email)}`,
        error,
      );
      try {
        await this.authService.disableUser(employee.email);
      } catch (rollbackError) {
        this.logger.error(
          `CRITICAL: Failed to rollback Cognito state for ${maskEmail(employee.email)}`,
          rollbackError,
        );
      }
      throw new InternalServerErrorException(
        'An error occurred during reactivation.',
      );
    }

    return { message: 'Employee has been reactivated successfully' };
  }

  async updateEmployeeRole(
    targetEmail: string,
    roleToAssign: ROLES,
    tenantId: string,
    callerRoles: string[],
    callerSub: string,
  ): Promise<{ message: string }> {
    const employees = await this.employeeService.getAllEmployees(tenantId);
    const targetEmployee = employees.find((e) => e.email === targetEmail);

    if (!targetEmployee) {
      throw new ForbiddenException('Employee not found in your organization.');
    }

    if (targetEmployee.sub === callerSub) {
      throw new ForbiddenException('You cannot modify your own roles.');
    }

    if (roleToAssign === ROLES.OWNER) {
      throw new ForbiddenException('No one can promote to owner.');
    }

    if (roleToAssign === ROLES.ADMIN && !callerRoles.includes(ROLES.OWNER)) {
      throw new ForbiddenException('Only an owner can create admins.');
    }

    const isAdmin =
      callerRoles.includes(ROLES.ADMIN) && !callerRoles.includes(ROLES.OWNER);
    if (isAdmin && roleToAssign === ROLES.ADMIN) {
      throw new ForbiddenException(
        'An admin can assign any role except admin or owner.',
      );
    }

    const currentRoles = await this.authService.getUserRoles(targetEmail);
    if (currentRoles.includes(ROLES.OWNER)) {
      throw new ForbiddenException('The owner account cannot be modified.');
    }

    if (currentRoles.includes(roleToAssign)) {
      return {
        message: `Employee ${maskEmail(targetEmail)} already has the role ${roleToAssign}`,
      };
    }

    await this.authService.addRole(targetEmail, roleToAssign);
    return {
      message: `Role ${roleToAssign} assigned successfully to ${maskEmail(targetEmail)}`,
    };
  }

  async revokeEmployeeRole(
    targetEmail: string,
    roleToRevoke: ROLES,
    tenantId: string,
    callerRoles: string[],
    callerSub: string,
  ): Promise<{ message: string }> {
    const employees = await this.employeeService.getAllEmployees(tenantId);
    const targetEmployee = employees.find((e) => e.email === targetEmail);

    if (!targetEmployee) {
      throw new ForbiddenException('Employee not found in your organization.');
    }

    if (targetEmployee.sub === callerSub) {
      throw new ForbiddenException('You cannot modify your own roles.');
    }

    if (roleToRevoke === ROLES.OWNER) {
      throw new ForbiddenException('No one can revoke the owner role.');
    }

    const isAdmin =
      callerRoles.includes(ROLES.ADMIN) && !callerRoles.includes(ROLES.OWNER);
    if (isAdmin && roleToRevoke === ROLES.ADMIN) {
      throw new ForbiddenException('An admin cannot revoke the admin role.');
    }

    const currentRoles = await this.authService.getUserRoles(targetEmail);
    if (currentRoles.includes(ROLES.OWNER)) {
      throw new ForbiddenException('The owner account cannot be modified.');
    }

    if (!currentRoles.includes(roleToRevoke)) {
      return {
        message: `Employee ${maskEmail(targetEmail)} does not have the role ${roleToRevoke}`,
      };
    }

    await this.authService.removeRole(targetEmail, roleToRevoke);
    return {
      message: `Role ${roleToRevoke} revoked successfully from ${maskEmail(targetEmail)}`,
    };
  }
}
