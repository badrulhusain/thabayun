/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test loader */
const fs = require("node:fs");
const assert = require("node:assert/strict");
const ts = require("typescript");
// Load these small pure TS modules without changing the application's module setup.
require.extensions[".ts"] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  module._compile(output, filename);
};
const { searchCollection, normalize } = require("../lib/search.ts");
assert.equal(searchCollection("seek aid with patience")[0].id, "palmer-b-3");
assert.equal(searchCollection("BRING YOUR PROOFS")[0].id, "palmer-b-7");
assert.equal(searchCollection("quantum computing").length, 0);
assert.equal(searchCollection("the and of").length, 0);
assert.equal(
  searchCollection("pray").length,
  0,
  "whole keywords should not match prayer",
);
assert.equal(normalize("إِيمَان"), "ايمان");
assert.deepEqual(
  searchCollection("truth"),
  searchCollection("truth"),
  "ranking must be deterministic",
);
assert.ok(searchCollection("charity").length, "curated tags are searchable");
assert.equal(
  searchCollection("patience")[0].text,
  "Seek aid with patience and prayer, though it is a hard thing save for the humble, who think that they will meet their Lord, and that to Him will they return.",
);
console.log("9 search assertions passed");
