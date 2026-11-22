import "./load-env.mjs";
import pg from "pg";
import { transferAllLegacyImages } from "./legacy-image-migration.mjs";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const result = await transferAllLegacyImages(pool);
  console.log(`Imagens transferidas e verificadas: ${result.content} publicações, ${result.avatars} avatares.`);
  console.log("Os binários originais permanecem no PostgreSQL.");
} catch (error) {
  console.error("A transferência de imagens legadas falhou; os binários originais foram preservados.");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
