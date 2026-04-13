import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ROLES } from 'src/auth/constants/roles';
import { CreateEmployeeDTO } from 'src/employee/dtos/create-employee.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequireTenantGuard } from 'src/auth/guards/require-tenant.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Roles(ROLES.OWNER, ROLES.ADMIN)
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}
  @Get('roles')
  async getAllRoles() {
    return await this.adminService.getAllRoles();
  }

  // @Patch('employees/promote')
  // async promoteEmployeeRole(@Body() roleUpdate: EmployeeRoleUpdateDTO) {
  //   return await this.adminService.updateEmployeeRole(
  //     roleUpdate.email,
  //     roleUpdate.role,
  //   );
  // }

  // @Patch('employees/revoke')
  // async revokeEmployeeRole(@Body() roleUpdate: EmployeeRoleUpdateDTO) {
  //   return await this.adminService.revokeEmployeeRole(
  //     roleUpdate.email,
  //     roleUpdate.role,
  //   );
  // }

  @Post('employees')
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
  async getAllEmployees(@CurrentUser() user: any) {
    return await this.adminService.getAllEmployees(user.tenantId);
  }

  @Delete('employees/:id')
  async deleteEmployee(@Param('id') id: string, @CurrentUser() user: any) {
    return await this.adminService.deleteEmployee(
      id,
      user.tenantId,
      user.roles,
      user.email,
    );
  }

  @Post('employees/:id/reactivate')
  async reactivateEmployee(@Param('id') id: string, @CurrentUser() user: any) {
    return await this.adminService.reactivateEmployee(
      id,
      user.tenantId,
      user.roles,
      user.email,
    );
  }
}
