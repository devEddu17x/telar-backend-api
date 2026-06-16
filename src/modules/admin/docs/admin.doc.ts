import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export function ApiDocGetAllRoles() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all available roles can set to an user' }),
  );
}

export function ApiDocPromoteEmployeeRole() {
  return applyDecorators(ApiOperation({ summary: 'Promote employee role' }));
}

export function ApiDocRevokeEmployeeRole() {
  return applyDecorators(ApiOperation({ summary: 'Revoke employee role' }));
}

export function ApiDocCreateEmployee() {
  return applyDecorators(
    ApiOperation({ summary: 'Create employee for owner tenant' }),
  );
}

export function ApiDocGetAllEmployees() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all employees for tenant' }),
  );
}

export function ApiDocDeleteEmployee() {
  return applyDecorators(ApiOperation({ summary: 'Delete employee by id' }));
}

export function ApiDocReactivateEmployee() {
  return applyDecorators(
    ApiOperation({ summary: 'Reactivate employee by id' }),
  );
}
