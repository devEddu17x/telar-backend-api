import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ROLES } from 'src/common/enum/roles';
import { CreateEmployeeDTO } from 'src/modules/employee/dtos/create-employee.dto';
import { EmployeeRoleUpdateDTO } from './dtos/promote-employee.dto';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';
import { Roles } from '../../modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RequireTenantGuard } from '../../modules/auth/guards/require-tenant.guard';
import { CurrentUser } from '../../modules/auth/decorators/current-user.decorator';
import {
  ApiDocGetAllRoles,
  ApiDocPromoteEmployeeRole,
  ApiDocRevokeEmployeeRole,
  ApiDocCreateEmployee,
  ApiDocGetAllEmployees,
  ApiDocDeleteEmployee,
  ApiDocReactivateEmployee,
} from './docs/admin.doc';

@Roles(ROLES.OWNER, ROLES.ADMIN)
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('roles')
  @ApiDocGetAllRoles()
  async getAllRoles() {
    return await this.adminService.getAllRoles();
  }

  @Patch('employees/promote')
  @ApiDocPromoteEmployeeRole()
  async promoteEmployeeRole(
    @Body() roleUpdate: EmployeeRoleUpdateDTO,
    @CurrentUser() user: any,
  ) {
    return await this.adminService.updateEmployeeRole(
      roleUpdate.email,
      roleUpdate.role,
      user.tenantId,
      user.roles,
      user.sub,
    );
  }

  @Patch('employees/revoke')
  @ApiDocRevokeEmployeeRole()
  async revokeEmployeeRole(
    @Body() roleUpdate: EmployeeRoleUpdateDTO,
    @CurrentUser() user: any,
  ) {
    return await this.adminService.revokeEmployeeRole(
      roleUpdate.email,
      roleUpdate.role,
      user.tenantId,
      user.roles,
      user.sub,
    );
  }

  @Post('employees')
  @ApiDocCreateEmployee()
  async createEmployee(
    @Body() createEmployeeDTO: CreateEmployeeDTO,
    @CurrentUser() user: any,
  ) {
    return await this.adminService.createEmployee(
      createEmployeeDTO,
      user.tenantId,
      user.roles,
    );
  }

  @Get('employees')
  @ApiDocGetAllEmployees()
  async getAllEmployees(@CurrentUser() user: any) {
    return await this.adminService.getAllEmployees(user.tenantId);
  }

  @Delete('employees/:id')
  @ApiDocDeleteEmployee()
  async deleteEmployee(@Param('id') id: string, @CurrentUser() user: any) {
    return await this.adminService.deleteEmployee(
      id,
      user.tenantId,
      user.roles,
      user.email,
    );
  }

  @Post('employees/:id/reactivate')
  @ApiDocReactivateEmployee()
  async reactivateEmployee(@Param('id') id: string, @CurrentUser() user: any) {
    return await this.adminService.reactivateEmployee(
      id,
      user.tenantId,
      user.roles,
      user.email,
    );
  }
}
