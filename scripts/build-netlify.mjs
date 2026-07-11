import { cpSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist");

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const file of ["index.html", "app.js", "styles.css"]) {
  cpSync(resolve(root, file), resolve(output, file));
}
cpSync(resolve(root, "assets"), resolve(output, "assets"), { recursive: true });
