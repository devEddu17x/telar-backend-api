import {
  BadRequestException,
  Injectable,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CognitoService } from './cognito.service';
import {
  CognitoOwnerParams,
  CognitoEmployeeParams,
} from '../interfaces/cognito-user-interface';
import { CREATABLE_ROLES } from '../constants/roles';
import { EmployeeService } from 'src/employee/employee.service';
import { maskEmail } from '../../utils/mask-email.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly cognitoService: CognitoService,
    @Inject(forwardRef(() => EmployeeService))
    private readonly employeeService: EmployeeService,
  ) {}

  async createOwner(params: CognitoOwnerParams) {
    const cognitoResult = await this.cognitoService.createOwner(params);

    try {
      const sub = cognitoResult.user.UserSub;

      const employeeData = {
        email: params.email,
        names: params.name,
        lastNames: params.lastName,
      };
      const employeeResult = await this.employeeService.createEmployee(
        sub,
        employeeData,
      );
      return employeeResult;
    } catch (error) {
      try {
        await this.cognitoService.deleteUser(params.email);
      } catch (rollbackError) {
        this.logger.error(
          `Critical Rollback Failure: Could not delete user ${maskEmail(params.email)} from Cognito after local DB failure.`,
          { cause: rollbackError },
        );
      }
      this.logger.error(
        'Error creating owner locally. Cognito user was rolled back (if possible).',
        { cause: error },
      );
      throw new BadRequestException('Could not create user');
    }
  }

  async createEmployee(
    params: CognitoEmployeeParams,
    role: CREATABLE_ROLES,
    tenantId: string,
  ) {
    const cognitoResult = await this.cognitoService.createEmployee(
      params,
      role,
      tenantId,
    );

    const sub = cognitoResult.user?.User?.Username;

    try {
      const employeeData = {
        email: params.email,
        names: params.name,
        lastNames: params.lastName,
      };

      const employeeResult = await this.employeeService.createEmployee(
        sub,
        employeeData,
        tenantId,
      );
      return employeeResult;
    } catch (error) {
      try {
        await this.cognitoService.deleteUser(params.email);
      } catch (rollbackError) {
        this.logger.error(
          `Critical Rollback Failure: Could not delete user ${maskEmail(params.email)} from Cognito after local DB failure.`,
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

  async getUserRoles(email: string): Promise<string[]> {
    return await this.cognitoService.getUserRoles(email);
  }

  async addRole(email: string, role: string) {
    return await this.cognitoService.addRole(email, role);
  }

  async removeRole(email: string, role: string) {
    return await this.cognitoService.removeRole(email, role);
  }

  async updateUserAttributes(
    email: string,
    names?: string,
    lastNames?: string,
  ) {
    return await this.cognitoService.updateUserAttributes(
      email,
      names,
      lastNames,
    );
  }

  async disableUser(email: string) {
    return await this.cognitoService.disableUser(email);
  }

  async enableUser(email: string) {
    return await this.cognitoService.enableUser(email);
  }

  async confirmEmail(email: string, code: string) {
    return await this.cognitoService.confirmSignUp(email, code);
  }

  async resendConfirmationCode(email: string) {
    return await this.cognitoService.resendConfirmationCode(email);
  }
}
