import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './core/config/config.module';
import { CustomerModule } from './modules/customer/customer.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { ClothesModule } from './modules/clothes/clothes.module';
import { AdminModule } from './modules/admin/admin.module';
import { StorageModule } from './modules/storage/storage.module';
import { QuoteModule } from './modules/quote/quote.module';
import { OrderModule } from './modules/order/order.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { DatabaseSeederModule } from './core/database-seeder/database-seeder.module';
@Module({
  imports: [
    AuthModule,
    ConfigModule,
    DatabaseSeederModule,
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
