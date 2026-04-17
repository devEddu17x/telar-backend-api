import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  SignUpCommand,
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserAttributesCommand,
  AdminListGroupsForUserCommand,
  AdminRemoveUserFromGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { ConfigService } from '@nestjs/config';
import {
  CognitoOwnerParams,
  CognitoEmployeeParams,
} from '../interfaces/cognito-user-interface';
import { maskEmail } from '../../utils/mask-email.util';

@Injectable()
export class CognitoService {
  private cognitoClient: CognitoIdentityProviderClient;
  private userPoolId: string;
  private clientId: string;
  constructor(
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext(CognitoService.name);
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.configService.get<string>('cognito.region'),
    });
    this.userPoolId = this.configService.get<string>('cognito.userPoolId');
    this.clientId = this.configService.get<string>('cognito.clientId');
  }

  async signUpUser(params: CognitoOwnerParams) {
    try {
      const signUpCommand = new SignUpCommand({
        ClientId: this.clientId,
        Username: params.email,
        Password: params.password,
        UserAttributes: [
          { Name: 'email', Value: params.email },
          { Name: 'name', Value: params.name },
          { Name: 'family_name', Value: params.lastName },
        ],
      });

      const user = await this.cognitoClient.send(signUpCommand);
      return { user };
    } catch (error: any) {
      if (error.name === 'UsernameExistsException') {
        throw new ConflictException('User already exists');
      }

      this.logger.error(
        { err: error },
        `AWS Cognito Error [${error.name}]: ${error.message}`,
      );

      throw new InternalServerErrorException(
        `Could not create user in Cognito`,
      );
    }
  }

  async adminCreateUser(params: CognitoEmployeeParams, tenantId: string) {
    try {
      const commandInput: any = {
        UserPoolId: this.userPoolId,
        Username: params.email,
        UserAttributes: [
          { Name: 'email', Value: params.email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: params.name },
          { Name: 'family_name', Value: params.lastName },
          { Name: 'custom:tenant_id', Value: tenantId },
        ],
        DesiredDeliveryMediums: ['EMAIL'],
      };

      const createUserCommand = new AdminCreateUserCommand(commandInput);
      const user = await this.cognitoClient.send(createUserCommand);
      return { user };
    } catch (error: any) {
      if (error.name === 'UsernameExistsException') {
        throw new ConflictException('User already exists');
      }

      this.logger.error(
        { err: error },
        `AWS Cognito Error [${error.name}]: ${error.message}`,
      );

      throw new InternalServerErrorException(
        `Could not create user in Cognito`,
      );
    }
  }

  async getUserRoles(email: string): Promise<string[]> {
    try {
      const command = new AdminListGroupsForUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      });
      const response = await this.cognitoClient.send(command);
      return response.Groups?.map((group) => group.GroupName || '') || [];
    } catch (error: any) {
      if (error.name === 'UserNotFoundException') {
        throw new NotFoundException('User does not exist');
      }
      this.logger.error(
        { err: error, email: maskEmail(email) },
        'Failed to get roles for user',
      );
      throw new InternalServerErrorException('Could not fetch user roles');
    }
  }

  async addRole(email: string, role: string) {
    try {
      const command = new AdminAddUserToGroupCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        GroupName: role,
      });
      await this.cognitoClient.send(command);
    } catch (error: any) {
      if (error.name === 'UserNotFoundException')
        throw new NotFoundException('User does not exist');
      if (error.name === 'ResourceNotFoundException')
        throw new BadRequestException(`Role ${role} does not exist`);
      this.logger.error(
        { err: error, email: maskEmail(email), role },
        'Failed to assign role to user',
      );
      throw new InternalServerErrorException('Could not assign role');
    }
  }

  async removeRole(email: string, role: string) {
    try {
      const command = new AdminRemoveUserFromGroupCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        GroupName: role,
      });
      await this.cognitoClient.send(command);
    } catch (error: any) {
      if (error.name === 'UserNotFoundException')
        throw new NotFoundException('User does not exist');
      if (error.name === 'UserNotInGroupException')
        throw new BadRequestException(`User does not have role ${role}`);
      this.logger.error(
        { err: error, email: maskEmail(email), role },
        'Failed to revoke role from user',
      );
      throw new InternalServerErrorException('Could not revoke role');
    }
  }

  async disableUser(email: string) {
    try {
      const command = new AdminDisableUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      });
      await this.cognitoClient.send(command);
    } catch (error: any) {
      if (error.name === 'UserNotFoundException') {
        throw new NotFoundException('User does not exist');
      }
      this.logger.error(
        { err: error, email: maskEmail(email) },
        'Failed to disable user in Cognito',
      );
      throw new InternalServerErrorException('Could not disable user');
    }
  }

  async enableUser(email: string) {
    try {
      const command = new AdminEnableUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      });
      await this.cognitoClient.send(command);
    } catch (error: any) {
      if (error.name === 'UserNotFoundException') {
        throw new NotFoundException('User does not exist.');
      }
      this.logger.error(
        { err: error, email: maskEmail(email) },
        'Failed to enable user in Cognito',
      );
      throw new InternalServerErrorException('Could not enable user');
    }
  }

  async deleteUser(email: string) {
    try {
      const command = new AdminDeleteUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      });
      await this.cognitoClient.send(command);
      return { success: true };
    } catch (error: any) {
      const maskedEmail = maskEmail(email);

      this.logger.error(
        { err: error, email: maskedEmail },
        'Critical Rollback Failure: Could not delete user from Cognito',
      );

      return { success: false, error };
    }
  }

  async confirmSignUp(email: string, code: string) {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: code,
      });

      await this.cognitoClient.send(command);
      return { message: 'User confirmed successfully' };
    } catch (error: any) {
      if (error.name === 'CodeMismatchException') {
        throw new BadRequestException(
          'Invalid verification code provided, please try again.',
        );
      }
      if (error.name === 'ExpiredCodeException') {
        throw new BadRequestException(
          'Verification code has expired, please request a new one.',
        );
      }
      this.logger.error(
        {
          err: error,
          email: maskEmail(email),
        },
        `Cognito ConfirmSignUp Error [${error.name}]: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to confirm email');
    }
  }

  async setTenantId(email: string, tenantId: string) {
    try {
      const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        UserAttributes: [
          {
            Name: 'custom:tenant_id',
            Value: tenantId,
          },
        ],
      });
      await this.cognitoClient.send(command);
    } catch (error: any) {
      this.logger.error(
        { err: error, email: maskEmail(email), tenantId },
        'Error updating custom:tenant_id',
      );
      throw new InternalServerErrorException(
        'Failed to link tenant to user account',
      );
    }
  }

  async updateUserAttributes(
    email: string,
    names?: string,
    lastNames?: string,
  ) {
    const attributes = [];
    if (names) {
      attributes.push({ Name: 'name', Value: names });
    }
    if (lastNames) {
      attributes.push({ Name: 'family_name', Value: lastNames });
    }

    if (attributes.length === 0) return;

    try {
      const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        UserAttributes: attributes,
      });
      await this.cognitoClient.send(command);
      this.logger.info(
        { email: maskEmail(email) },
        'Successfully updated name attributes',
      );
    } catch (error: any) {
      this.logger.error(
        { err: error, email: maskEmail(email) },
        'Error updating attributes',
      );
      throw new InternalServerErrorException(
        'Failed to update user profile in identity provider',
      );
    }
  }

  async resendConfirmationCode(email: string) {
    try {
      const command = new ResendConfirmationCodeCommand({
        ClientId: this.clientId,
        Username: email,
      });

      await this.cognitoClient.send(command);
      return {
        message: 'A new verification code has been sent to your email.',
      };
    } catch (error: any) {
      this.logger.error(
        { err: error, email: maskEmail(email) },
        `Cognito ResendConfirmationCode Error [${error.name}]: ${error.message}`,
      );
      throw new BadRequestException(`Failed to resend code`);
    }
  }

  async clearTenantId(email: string) {
    try {
      const command = new AdminDeleteUserAttributesCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        UserAttributeNames: ['custom:tenant_id'],
      });
      await this.cognitoClient.send(command);
    } catch (error: any) {
      this.logger.error(
        { err: error, email: maskEmail(email) },
        'Critical Rollback Failure: Could not clear custom:tenant_id',
      );
    }
  }
}
