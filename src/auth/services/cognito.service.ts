import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  SignUpCommand,
  AdminDeleteUserCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { ConfigService } from '@nestjs/config';
import { CREATABLE_ROLES, ROLES } from '../constants/roles';
import {
  CognitoOwnerParams,
  CognitoEmployeeParams,
} from '../interfaces/cognito-user-interface';
@Injectable()
export class CognitoService {
  private readonly logger = new Logger(CognitoService.name);
  private cognitoClient: CognitoIdentityProviderClient;
  private userPoolId: string;
  private clientId: string;
  constructor(private readonly configService: ConfigService) {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.configService.get<string>('cognito.region'),
    });
    this.userPoolId = this.configService.get<string>('cognito.userPoolId');
    this.clientId = this.configService.get<string>('cognito.clientId');
  }

  async createOwner(params: CognitoOwnerParams) {
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

      const addToGroupCommand = new AdminAddUserToGroupCommand({
        UserPoolId: this.userPoolId,
        Username: params.email,
        GroupName: ROLES.OWNER,
      });
      const addToGroupResult = await this.cognitoClient.send(addToGroupCommand);

      return { user, addToGroupResult };
    } catch (error: any) {
      if (error.name === 'UsernameExistsException') {
        throw new ConflictException('User already exists');
      }

      this.logger.error(`AWS Cognito Error [${error.name}]: ${error.message}`);
      if (error.$fault) {
        this.logger.error(`Fault: ${error.$fault}, Stack: ${error.stack}`);
      }

      throw new InternalServerErrorException(`Could not create user`);
    }
  }

  async createEmployee(
    params: CognitoEmployeeParams,
    role: CREATABLE_ROLES,
    tenantId: string,
  ) {
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

      const addToGroupCommand = new AdminAddUserToGroupCommand({
        UserPoolId: this.userPoolId,
        Username: user.User?.Username,
        GroupName: role,
      });
      const addToGroupResult = await this.cognitoClient.send(addToGroupCommand);

      return { user, addToGroupResult };
    } catch (error: any) {
      if (error.name === 'UsernameExistsException') {
        throw new ConflictException('User already exists');
      }

      this.logger.error(`AWS Cognito Error [${error.name}]: ${error.message}`);
      if (error.$fault) {
        this.logger.error(`Fault: ${error.$fault}, Stack: ${error.stack}`);
      }
      throw new InternalServerErrorException(`Could not create user`);
    }
  }

  async deleteUser(email: string) {
    try {
      const command = new AdminDeleteUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      });
      await this.cognitoClient.send(command);
    } catch (error: any) {
      if (error.name === 'UserNotFoundException') {
        return;
      }
      const [localPart, domain] = email.split('@');
      const maskedEmail = `${localPart.substring(0, 2)}***@${domain || ''}`;

      this.logger.error(
        `Failed to rollback/delete user in Cognito: ${maskedEmail}`,
        {
          cause: error,
        },
      );
      throw new InternalServerErrorException(
        `Rollback failed for user: ${maskedEmail}`,
      );
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
      this.logger.error(`Error updating custom:tenant_id for ${email}`, {
        cause: error,
      });
      throw new InternalServerErrorException(
        'Failed to link tenant to user account',
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
        `Critical Rollback Failure: Could not clear custom:tenant_id for ${email}`,
        { cause: error },
      );
    }
  }
}
