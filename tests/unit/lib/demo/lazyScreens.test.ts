import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const config = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, root);

// Follow the entire local synchronous module graph, so a shared component or
// barrel cannot accidentally pull another screen back into the home bundle.
function eagerSources(entry: string, visited = new Set<string>()): Set<string> {
  if (visited.has(entry)) return visited;
  visited.add(entry);
  const source = ts.createSourceFile(
    entry,
    readFileSync(entry, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement))
      continue;
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      if (clause?.isTypeOnly) continue;
      if (
        clause &&
        !clause.name &&
        clause.namedBindings &&
        ts.isNamedImports(clause.namedBindings) &&
        clause.namedBindings.elements.every((element) => element.isTypeOnly)
      )
        continue;
    } else if (statement.isTypeOnly) continue;
    const specifier = statement.moduleSpecifier;
    if (!specifier || !ts.isStringLiteral(specifier)) continue;
    const resolved = ts.resolveModuleName(specifier.text, entry, options, ts.sys)
      .resolvedModule;
    if (resolved && !resolved.isExternalLibraryImport)
      eagerSources(resolved.resolvedFileName, visited);
  }
  return visited;
}

describe("home screen loading boundary", () => {
  const initialSources = eagerSources(
    path.join(root, "components/demo/PortalDemo.tsx"),
  );

  it.each(["DemoWallet", "DemoJourney", "DemoPassport", "DemoCommunity"])(
    "does not load %s through any synchronous home import",
    (screen) => {
      expect(initialSources).not.toContain(
        path.join(root, `components/demo/${screen}.tsx`),
      );
    },
  );
});
