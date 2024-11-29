import esbuild from "esbuild";
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const isWatch = args.includes('--watch');
const isClient = args.includes('--client');
const isServer = args.includes('--server');

const buildOptions = [];

if (isClient || (!isClient && !isServer)) {
  buildOptions.push({
    entryPoints: ["client/src/extension.ts"],
    bundle: true,
    platform: "node",
    target: "node16",
    outdir: "out/client",
    sourcemap: true,
    external: [
      "vscode",
    ],
    tsconfig: "client/tsconfig.json"
  });
}

if (isServer || (!isClient && !isServer)) {
  buildOptions.push({
    entryPoints: ["server/src/server.ts"],
    bundle: true,
    platform: "node",
    target: "node16",
    outdir: "out/server",
    sourcemap: true,
    external: [
      "vscode",
    ],
    tsconfig: "server/tsconfig.json"
  });
}

async function copyFanFolder() {
  const srcDir = path.resolve("server/src/fan");
  const destDir = path.resolve("out/server/fan");

  function copyRecursive(src, dest) {
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      fs.readdirSync(src).forEach(file => {
        copyRecursive(path.join(src, file), path.join(dest, file));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  copyRecursive(srcDir, destDir);
}

function checkDocsFiles() {
  const docsFiles = [
    "out/docs/fantom-docs.json",
    "out/docs/fantom-docs-nav.json"
  ];

  for (const file of docsFiles) {
    if (!fs.existsSync(file)) {
      console.error(`Error: Required file ${file} is missing.`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      process.exit(1);
    }
  }
}

async function buildAll() {

  const contexts = [];

  for (const options of buildOptions) {
    const ctx = await esbuild.context(options);
    contexts.push(ctx);
  }

  if (isWatch) {
    await Promise.all(contexts.map(ctx => ctx.watch()));
  } else {
    await Promise.all(contexts.map(async ctx => {
      await ctx.rebuild();
      await ctx.dispose();
    }));
    await copyFanFolder();
    checkDocsFiles()
  }
}

buildAll().catch(() => process.exit(1));
