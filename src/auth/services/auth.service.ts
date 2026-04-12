import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CognitoService } from './cognito.service';
import {
  CognitoOwnerParams,
  CognitoEmployeeParams,
} from '../interfaces/cognito-user-interface';
import { ROLES } from '../constants/roles';
import { EmployeeService } from 'src/employee/employee.service';
import { CreateEmployeeDTO } from 'src/employee/dtos/create-employee.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly cognitoService: CognitoService,
    private readonly employeeService: EmployeeService,
  ) { }

  async createOwner(params: CognitoOwnerParams) {
    const cognitoResult = await this.cognitoService.createOwner(params);

    try {
      const sub = cognitoResult.user.UserSub;

      const employeeDTO: CreateEmployeeDTO = {
        email: params.email,
        names: params.name,
        lastNames: params.lastName,
      };
      const employeeResult = await this.employeeService.createEmployee(
        sub,
        employeeDTO,
      );
      return employeeResult;
    } catch (error) {
      try {
        await this.cognitoService.deleteUser(params.email);
      } catch (rollbackError) {
        this.logger.error(
          `Critical Rollback Failure: Could not delete user ${params.email} from Cognito after local DB failure.`,
          { cause: rollbackError },
        );
      }
      this.logger.error(
        'Error creating owner locally. Cognito user was rolled back (if possible).',
        { cause: error },
      );
      throw new BadRequestException('Could not create user', { cause: error });
    }
  }

  async createEmployee(params: CognitoEmployeeParams, role: ROLES) {
    if (role === ROLES.OWNER) {
      throw new BadRequestException('Cannot assign OWNER role to an employee');
    }

    const allowedRoles = [ROLES.ADMIN, ROLES.SELLER];
    if (!allowedRoles.includes(role)) {
      throw new BadRequestException(`Invalid role: ${role}`);
    }
    const cognitoResult = await this.cognitoService.createEmployee(
      params,
      role,
    );

    const sub = cognitoResult.user?.User?.Username;

    try {
      const employeDTO: CreateEmployeeDTO = {
        email: params.email,
        names: params.name,
        lastNames: params.lastName,
      };

      const employeeResult = await this.employeeService.createEmployee(
        sub,
        employeDTO,
      );
      return employeeResult;
    } catch (error) {
      try {
        await this.cognitoService.deleteUser(params.email);
      } catch (rollbackError) {
        this.logger.error(
          `Critical Rollback Failure: Could not delete user ${params.email} from Cognito after local DB failure.`,
          { cause: rollbackError },
        );
      }
      this.logger.error(
        'Error creating employee locally. Cognito user was rolled back.',
        { cause: error },
      );
      throw new BadRequestException('Could not create user');
    }
  }

  async confirmEmail(email: string, code: string) {
    return await this.cognitoService.confirmSignUp(email, code);
  }

  async resendConfirmationCode(email: string) {
    return await this.cognitoService.resendConfirmationCode(email);
  }
}
