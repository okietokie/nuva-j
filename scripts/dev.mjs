import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const rootDir = process.cwd();
const frontendDir = resolve(rootDir, "frontend");
const backendDir = resolve(rootDir, "backend");
const runBackendOnly = process.argv.includes("--backend-only");

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const pythonLauncherCandidates = isWindows
  ? [
      { command: "py", args: ["-3"] },
      { command: "python", args: [] },
      { command: "python3", args: [] },
    ]
  : [
      { command: "python3", args: [] },
      { command: "python", args: [] },
    ];

const backendPythonCandidates = [
  resolve(rootDir, "venv", isWindows ? "Scripts/python.exe" : "bin/python"),
  resolve(rootDir, ".venv", isWindows ? "Scripts/python.exe" : "bin/python"),
  resolve(backendDir, "venv", isWindows ? "Scripts/python.exe" : "bin/python"),
  resolve(backendDir, ".venv", isWindows ? "Scripts/python.exe" : "bin/python"),
];

function findAvailablePythonLauncher() {
  for (const launcher of pythonLauncherCandidates) {
    const check = spawnSync(launcher.command, [...launcher.args, "--version"], {
      stdio: "ignore",
    });

    if (check.status === 0) {
      return launcher;
    }
  }

  return null;
}

function ensureBackendVirtualenv() {
  const existingPython = backendPythonCandidates.find((candidate) => existsSync(candidate));
  if (existingPython) {
    return existingPython;
  }

  const launcher = findAvailablePythonLauncher();
  if (!launcher) {
    console.error(
      "Could not find a backend virtualenv Python executable, and no system Python launcher is available to create one.\n\n" +
        "Install Python 3 and ensure one of these commands is available on PATH:\n" +
        (isWindows ? "  py\n  python\n  python3\n" : "  python3\n  python\n") +
        "\nThen create the backend virtualenv and install requirements:\n" +
        (isWindows
          ? "  py -3 -m venv backend\\.venv\n  backend\\.venv\\Scripts\\python -m pip install -r backend\\requirements.txt\n"
          : "  python3 -m venv backend/.venv\n  backend/.venv/bin/python -m pip install -r backend/requirements.txt\n") +
        "\nChecked these virtualenv locations:\n" +
        backendPythonCandidates.join("\n"),
    );
    process.exit(1);
  }

  console.log(`Backend virtualenv not found. Creating one with ${launcher.command} ${launcher.args.join(" ")}`.trim());

  const createVenv = spawnSync(launcher.command, [...launcher.args, "-m", "venv", resolve(backendDir, ".venv")], {
    stdio: "inherit",
    cwd: rootDir,
  });

  if (createVenv.status !== 0) {
    process.exit(createVenv.status ?? 1);
  }

  const createdPython = resolve(backendDir, ".venv", isWindows ? "Scripts/python.exe" : "bin/python");
  if (!existsSync(createdPython)) {
    console.error(`Backend virtualenv creation reported success, but Python was not found at ${createdPython}.`);
    process.exit(1);
  }

  console.log("Installing backend Python dependencies...");
  const installRequirements = spawnSync(
    createdPython,
    ["-m", "pip", "install", "-r", resolve(backendDir, "requirements.txt")],
    {
      stdio: "inherit",
      cwd: backendDir,
    },
  );

  if (installRequirements.status !== 0) {
    process.exit(installRequirements.status ?? 1);
  }

  return createdPython;
}

const backendPython = ensureBackendVirtualenv();

function ensureFrontendDependencies() {
  const frontendNodeModules = resolve(frontendDir, "node_modules");
  if (existsSync(frontendNodeModules)) {
    return;
  }

  console.log("Frontend dependencies not found. Installing frontend packages...");
  const install = spawnSync(npmCommand, ["install"], {
    cwd: frontendDir,
    stdio: "inherit",
  });

  if (install.status !== 0) {
    process.exit(install.status ?? 1);
  }
}

const children = [];
let shuttingDown = false;

function startProcess(name, command, args, cwd) {
  const shouldUseShell = isWindows && /\.(cmd|bat)$/i.test(command);
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: shouldUseShell,
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

if (!runBackendOnly) {
  ensureFrontendDependencies();
  startProcess("frontend", npmCommand, ["run", "dev"], frontendDir);
}

startProcess("backend", backendPython, ["-m", "uvicorn", "app.main:app", "--reload"], backendDir);
