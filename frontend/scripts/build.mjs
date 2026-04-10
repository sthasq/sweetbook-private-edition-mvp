import { spawnSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const cwd = process.cwd();
const hasNonAsciiPath = /[^\x00-\x7F]/.test(cwd);
const isWindows = process.platform === "win32";
const npmCommand = process.env.npm_execpath ? process.execPath : "npm";
const npmPreludeArgs = process.env.npm_execpath ? [process.env.npm_execpath] : [];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function copyProjectForTempBuild(sourceDir, targetDir) {
  rmSync(targetDir, { recursive: true, force: true });
  cpSync(sourceDir, targetDir, {
    recursive: true,
    filter: (source) => {
      const normalized = source.replaceAll("\\", "/");
      return !normalized.includes("/node_modules/") && !normalized.endsWith("/node_modules") &&
        !normalized.includes("/dist/") && !normalized.endsWith("/dist");
    },
  });
}

if (isWindows && hasNonAsciiPath) {
  const tempDir = path.join(os.tmpdir(), "playpick-frontend-build");

  console.log(
    `[build] Non-ASCII path detected. Building in ${tempDir} and copying dist back.`,
  );

  copyProjectForTempBuild(cwd, tempDir);
  run(npmCommand, [...npmPreludeArgs, "install"], { cwd: tempDir });
  run(npmCommand, [...npmPreludeArgs, "run", "build:raw"], { cwd: tempDir });

  rmSync(path.join(cwd, "dist"), { recursive: true, force: true });
  cpSync(path.join(tempDir, "dist"), path.join(cwd, "dist"), { recursive: true });
} else {
  run(npmCommand, [...npmPreludeArgs, "run", "build:raw"], { cwd });
}
