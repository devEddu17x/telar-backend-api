import {
  Injectable,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ROLES, CREATABLE_ROLES } from 'src/auth/constants/roles';
import { CreateEmployeeDTO } from 'src/employee/dtos/create-employee.dto';
import { EmployeeWithRoles } from 'src/employee/interfaces/employee-with-roles.interface';
import { AuthService } from 'src/auth/services/auth.service';
import { EmployeeService } from 'src/employee/employee.service';
import { CognitoEmployeeParams } from 'src/auth/interfaces/cognito-user-interface';
import { maskEmail } from 'src/utils/mask-email.util';

@Injectable()
export class AdminService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly authService: AuthService,
    private readonly employeeService: EmployeeService,
  ) {
    this.logger.setContext(AdminService.name);
  }
  async getAllRoles() {
    return Object.values(ROLES);
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
        { err: error, email: maskEmail(employee.email) },
        'Failed to disable employee locally, rolling back Cognito state',
      );
      try {
        await this.authService.enableUser(employee.email);
      } catch (rollbackError) {
        this.logger.error(
          { err: rollbackError, email: maskEmail(employee.email) },
          'CRITICAL: Failed to rollback Cognito state',
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
        { err: error, email: maskEmail(employee.email) },
        'Failed to reactivate employee locally, rolling back Cognito state',
      );
      try {
        await this.authService.disableUser(employee.email);
      } catch (rollbackError) {
        this.logger.error(
          { err: rollbackError, email: maskEmail(employee.email) },
          'CRITICAL: Failed to rollback Cognito state',
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
    const targetEmployee =
      await this.employeeService.getEmployeeByEmail(targetEmail);

    if (!targetEmployee || targetEmployee.tenantId !== tenantId) {
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
    const targetEmployee =
      await this.employeeService.getEmployeeByEmail(targetEmail);

    if (!targetEmployee || targetEmployee.tenantId !== tenantId) {
      throw new ForbiddenException('Employee not found in your organization.');
    }

    if (targetEmployee.sub === callerSub) {
      throw new ForbiddenException('You cannot modify your own roles.');
    }

    if (roleToRevoke === ROLES.OWNER) {
      throw new ForbiddenException('No one can revoke the owner role.');
    }

    if (!callerRoles.includes(ROLES.OWNER) && roleToRevoke === ROLES.ADMIN) {
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
