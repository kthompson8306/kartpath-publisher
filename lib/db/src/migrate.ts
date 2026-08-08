import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index";

await migrate(db, {
  migrationsFolder: path.resolve(process.cwd(), "drizzle"),
});
await db.$client.end();
console.log("Database migrations applied.");