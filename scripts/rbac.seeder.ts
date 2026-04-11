import { DataSource } from 'typeorm';
import { EmployeeEntity } from '../src/employee/entities/employee.entity';

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.seed' });
// Database connection configuration
const { DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME, DB_SSL } =
  process.env;
// Seed users credentials
const { EMAIL_ADMIN, EMAIL_EMPLOYEE, ADMIN_PASSWORD, EMPLOYEE_PASSWORD } =
  process.env;
const ssl =
  DB_SSL === 'true'
    ? {
        ssl: { rejectUnauthorized: false },
      }
    : {};

if (!EMAIL_ADMIN || !EMAIL_EMPLOYEE || !ADMIN_PASSWORD || !EMPLOYEE_PASSWORD) {
  console.error('Missing seed credentials in environment variables');
  process.exit(1);
}
console.log('Starting RBAC seeder...');

const DumiDataSource = new DataSource({
  type: 'postgres',
  host: DB_HOST || 'localhost',
  port: DB_PORT ? parseInt(DB_PORT) : 5432,
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_NAME,
  entities: [EmployeeEntity],
  synchronize: true,
  logging: true,
  ...ssl,
  uuidExtension: 'pgcrypto',
});

async function main() {
  try {
    await DumiDataSource.initialize();
    console.log('Data Source has been initialized!');
  } catch (error) {
    console.error('Error initializing data source:', error);
    process.exit(1);
  }

  try {
    console.log('Default users created successfully');
  } catch (e) {
    console.error('Error creating default users:', e);
    process.exit(1);
  }

  console.log('RBAC seeded OK');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
