import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const apiPath = path.join(root, "api-zod", "src", "generated", "api.ts");
const typesIndexPath = path.join(
  root,
  "api-zod",
  "src",
  "generated",
  "types",
  "index.ts",
);
const barrelPath = path.join(root, "api-zod", "src", "index.ts");

const runtimeNames = new Set(
  [...fs.readFileSync(apiPath, "utf8").matchAll(/export const (\w+)/g)].map(
    (match) => match[1],
  ),
);
const typeExports = fs
  .readFileSync(typesIndexPath, "utf8")
  .split("\n")
  .filter((line) => line.includes("export * from"))
  .map((line) => line.match(/'\\.\/([^']+)'/)?.[1])
  .filter(Boolean)
  .filter((file) => {
    const source = fs.readFileSync(
      path.join(path.dirname(typesIndexPath), `${file}.ts`),
      "utf8",
    );
    const exportedNames = [
      ...source.matchAll(/export (?:type|interface|const|function) (\w+)/g),
    ].map((match) => match[1]);
    return exportedNames.every((name) => !runtimeNames.has(name));
  });

const contents = [
  'export * from "./generated/api";',
  ...typeExports.map((file) => `export * from "./generated/types/${file}";`),
  "",
].join("\n");
fs.writeFileSync(barrelPath, contents);