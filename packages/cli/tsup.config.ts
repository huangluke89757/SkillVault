import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/core/agents.ts",
    "src/core/installer.ts",
    "src/core/skill-discovery.ts",
    "src/core/skill-lock.ts",
    "src/core/source-parser.ts",
    "src/core/git.ts",
    "src/constants.ts",
    "src/types.ts",
  ],
  format: ["esm"],
  outDir: "dist",
  target: "node18",
  platform: "node",
  splitting: true,
  sourcemap: true,
  dts: false,
  clean: true,
  banner: {},
  external: [],
  noExternal: [],
  shims: true,
});
