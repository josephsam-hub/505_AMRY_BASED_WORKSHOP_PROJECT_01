import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { pool } from './pool.js';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsPath = resolve(here, '../../../database/migrations');
const migrationFiles = (await readdir(migrationsPath))
	.filter((file) => file.endsWith('.sql'))
	.sort((left, right) => left.localeCompare(right));

for (const migrationFile of migrationFiles) {
	const sql = await readFile(resolve(migrationsPath, migrationFile), 'utf8');
	await pool.query(sql);
}

await pool.end();
console.log(`Database migration completed: ${migrationFiles.join(', ')}`);
