import { DataSource } from 'typeorm';

export async function resetDatabase(dataSource: DataSource): Promise<void> {
  const tables: Array<{ tablename: string }> = await dataSource.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `);

  if (tables.length === 0) {
    return;
  }

  const tableNames = tables
    .map(({ tablename }) => `"public"."${tablename}"`)
    .join(', ');

  await dataSource.query(
    `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`,
  );
}
