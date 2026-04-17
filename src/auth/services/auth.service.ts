import {
  BadRequestException,
  Injectable,
  Logger,
  Inject,
  forwardRef,
  InternalServerErrorException,
} from '@nestjs/common';
import { CognitoService } from './cognito.service';
import {
  CognitoOwnerParams,
  CognitoEmployeeParams,
} from '../interfaces/cognito-user-interface';
import { CREATABLE_ROLES, ROLES } from '../constants/roles';
import { EmployeeService } from 'src/employee/employee.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly cognitoService: CognitoService,
    @Inject(forwardRef(() => EmployeeService))
    private readonly employeeService: EmployeeService,
  ) {}

  async createOwner(params: CognitoOwnerParams) {
    const cognitoResult = await this.cognitoService.signUpUser(params);
    const sub = cognitoResult.user.UserSub;
    try {
      await this.cognitoService.addRole(params.email, ROLES.OWNER);
    } catch (error) {
      this.logger.error(
        'Error assigning owner role  natively. Cognito will rolled back. (removing user)',
        { cause: error },
      );
      const deleteResult = await this.cognitoService.deleteUser(params.email);
      const message = deleteResult.success
        ? 'Cognito user was rolled back successfully.'
        : 'Failed to roll back Cognito user after role assignment failure.';
      this.logger.error(message, { cause: deleteResult.error });
      throw new InternalServerErrorException('Could not create user');
    }

    try {
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
      this.logger.error(
        'Error creating owner in database. Cognito user will rolled back.',
        { cause: error },
      );
      const deleteResult = await this.cognitoService.deleteUser(params.email);
      const message = deleteResult.success
        ? 'Cognito user was rolled back successfully.'
        : 'Failed to roll back Cognito user after failed database user creation.';
      this.logger.error(message, { cause: deleteResult.error });
      throw new BadRequestException('Could not create user');
    }
  }

  async createEmployee(
    params: CognitoEmployeeParams,
    role: CREATABLE_ROLES,
    tenantId: string,
  ) {
    const cognitoResult = await this.cognitoService.adminCreateUser(
      params,
      tenantId,
    );

    const sub = cognitoResult.user?.User?.Username;
    try {
      await this.cognitoService.addRole(sub, role);
    } catch (error) {
      this.logger.error(
        'Error assigning role to employee. Cognito user will rolled back.',
        { cause: error },
      );
      const deleteResult = await this.cognitoService.deleteUser(params.email);
      const message = deleteResult.success
        ? 'Cognito user was rolled back successfully.'
        : `Failed to roll back Cognito user after failed assigning role ${role} to employee.`;
      this.logger.error(message, { cause: deleteResult.error });
      throw new InternalServerErrorException('Could not create user');
    }

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
      this.logger.error(
        'Error creating employee in database. Cognito user will rolled back.',
        { cause: error },
      );
      const deleteResult = await this.cognitoService.deleteUser(params.email);
      const message = deleteResult.success
        ? 'Cognito user was rolled back successfully.'
        : 'Failed to roll back Cognito user after failed database user creation.';
      this.logger.error(message, { cause: deleteResult.error });
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
