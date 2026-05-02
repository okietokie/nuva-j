import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const rootDir = process.cwd();
const frontendDir = resolve(rootDir, "frontend");
const backendDir = resolve(rootDir, "backend");

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";

const backendPythonCandidates = [
  resolve(backendDir, "venv", isWindows ? "Scripts/python.exe" : "bin/python"),
  resolve(backendDir, ".venv", isWindows ? "Scripts/python.exe" : "bin/python"),
];

const backendPython = backendPythonCandidates.find((candidate) => existsSync(candidate));

if (!backendPython) {
  console.error(
    "Could not find a backend virtualenv Python executable. Expected one of:\n" +
      backendPythonCandidates.join("\n"),
  );
  process.exit(1);
}

const children = [];
let shuttingDown = false;

function startProcess(name, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    if (signal) {
      console.error(`${name} exited with signal ${signal}. Stopping all dev processes.`);
    } else if (code !== 0) {
      console.error(`${name} exited with code ${code}. Stopping all dev processes.`);
    } else {
      console.error(`${name} exited. Stopping all dev processes.`);
    }

    shutdown(code ?? 1);
  });

  child.on("error", (error) => {
    if (shuttingDown) {
      return;
    }

    console.error(`Failed to start ${name}:`, error);
    shutdown(1);
  });

  children.push(child);
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (child.exitCode === null && !child.killed) {
      child.kill("SIGINT");
    }
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 200);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

startProcess("frontend", npmCommand, ["run", "dev"], frontendDir);
startProcess(
  "backend",
  backendPython,
  ["-m", "uvicorn", "app.main:app", "--reload"],
  backendDir,
);
