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
  ) {}

  async createOwner(params: CognitoOwnerParams) {
    const cognitoResult = await this.cognitoService.createOwner(params);

    try {
      const employeDTO: CreateEmployeeDTO = {
        email: params.email,
        names: params.name,
        lastNames: params.lastName,
      };
      const employeeResult =
        await this.employeeService.createEmployee(employeDTO);
      return { cognitoResult, employeeResult };
    } catch (error) {
      await this.cognitoService.deleteUser(params.email);
      this.logger.error(
        'Error creating owner locally. Cognito user was rolled back.',
        { cause: error },
      );
      throw new BadRequestException('Could not create user');
    }
  }

  async createEmployee(params: CognitoEmployeeParams, role: ROLES) {
    if (role === ROLES.OWNER) {
      throw new BadRequestException('Cannot assign OWNER role to an employee');
    }

    const cognitoResult = await this.cognitoService.createEmployee(
      params,
      role,
    );

    try {
      const employeDTO: CreateEmployeeDTO = {
        email: params.email,
        names: params.name,
        lastNames: params.lastName,
      };
      const employeeResult =
        await this.employeeService.createEmployee(employeDTO);
      return { cognitoResult, employeeResult };
    } catch (error) {
      await this.cognitoService.deleteUser(params.email);
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
