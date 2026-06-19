import {
  BadRequestException,
  Injectable,
  Inject,
  forwardRef,
  InternalServerErrorException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { CognitoService } from './cognito.service';
import {
  CognitoOwnerParams,
  CognitoEmployeeParams,
} from '../interfaces/cognito-user-interface';
import { CREATABLE_ROLES, ROLES } from '../../../common/enum/roles';
import { EmployeeService } from 'src/modules/employee/employee.service';
import { maskEmail } from 'src/utils/mask-email.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly cognitoService: CognitoService,
    @Inject(forwardRef(() => EmployeeService))
    private readonly employeeService: EmployeeService,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async createOwner(params: CognitoOwnerParams) {
    const cognitoResult = await this.cognitoService.signUpUser(params);
    const sub = cognitoResult.user.UserSub;
    try {
      await this.cognitoService.addRole(params.email, ROLES.OWNER);
    } catch (error) {
      this.logger.error(
        { err: error, email: maskEmail(params.email) },
        'Error assigning owner role in database. Cognito will be rolled back. (removing user)',
      );
      const deleteResult = await this.cognitoService.deleteUser(params.email);
      const message = deleteResult.success
        ? 'Cognito user was rolled back successfully.'
        : 'Failed to roll back Cognito user after role assignment failure.';
      this.logger.error(
        { err: deleteResult.error, email: maskEmail(params.email) },
        message,
      );
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
      this.logger.info(
        { sub, email: maskEmail(params.email) },
        'Owner account successfully created and provisioned',
      );
      return employeeResult;
    } catch (error) {
      this.logger.error(
        { err: error, email: maskEmail(params.email) },
        'Error creating owner in database. Cognito user will be rolled back.',
      );
      const deleteResult = await this.cognitoService.deleteUser(params.email);
      const message = deleteResult.success
        ? 'Cognito user was rolled back successfully.'
        : 'Failed to roll back Cognito user after failed database user creation.';
      this.logger.error(
        { err: deleteResult.error, email: maskEmail(params.email) },
        message,
      );
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

    const sub = cognitoResult.user?.User?.Attributes?.find(
      (attribute) => attribute.Name === 'sub',
    )?.Value;

    if (!sub) {
      const deleteResult = await this.cognitoService.deleteUser(params.email);
      const message = deleteResult.success
        ? 'Cognito user was rolled back successfully.'
        : 'Failed to roll back Cognito user after missing sub in Cognito response.';
      this.logger.error(
        { err: deleteResult.error, email: maskEmail(params.email), tenantId },
        message,
      );
      throw new InternalServerErrorException('Could not create user');
    }

    try {
      await this.cognitoService.addRole(params.email, role);
    } catch (error) {
      this.logger.error(
        { err: error, sub, email: maskEmail(params.email), role, tenantId },
        'Error assigning role to employee. Cognito user will be rolled back.',
      );
      const deleteResult = await this.cognitoService.deleteUser(params.email);
      const message = deleteResult.success
        ? 'Cognito user was rolled back successfully.'
        : `Failed to roll back Cognito user after failed assigning role ${role} to employee.`;
      this.logger.error({ err: deleteResult.error, sub, tenantId }, message);
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
      this.logger.info(
        { sub, tenantId, role },
        'Employee successfully provisioned',
      );
      return employeeResult;
    } catch (error) {
      this.logger.error(
        { err: error, sub, tenantId },
        'Error creating employee in database. Cognito user will be rolled back.',
      );
      const deleteResult = await this.cognitoService.deleteUser(params.email);
      const message = deleteResult.success
        ? 'Cognito user was rolled back successfully.'
        : 'Failed to roll back Cognito user after failed database user creation.';
      this.logger.error({ err: deleteResult.error, sub, tenantId }, message);
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

  async login(email: string, password: string) {
    try {
      const tokens = await this.cognitoService.initiateAuth(email, password);
      this.logger.info({ email: maskEmail(email) }, 'User authenticated');
      return tokens;
    } catch (error) {
      this.logger.error(
        { err: error, email: maskEmail(email) },
        'Login attempt failed',
      );
      throw error;
    }
  }
}
