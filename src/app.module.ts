import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './core/config/config.module';
import { CustomerModule } from './customer/customer.module';
import { EmployeeModule } from './employee/employee.module';
import { ClothesModule } from './clothes/clothes.module';
import { AdminModule } from './admin/admin.module';
import { StorageModule } from './storage/storage.module';
import { QuoteModule } from './quote/quote.module';
import { OrderModule } from './order/order.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
@Module({
  imports: [
    AuthModule,
    ConfigModule,
    CustomerModule,
    EmployeeModule,
    ClothesModule,
    AdminModule,
    StorageModule,
    QuoteModule,
    OrderModule,
    TenantModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
