#!/usr/bin/env node

import { select } from "@inquirer/prompts";
import degit from "degit";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import process from "node:process";

// --------------------------------------------------
// Templates
// --------------------------------------------------

const frontendTemplates = {
  vue: "mauryasuryakant/devsmith-templates/frontend/vue-contact-api-ts",
  react: "mauryasuryakant/devsmith-templates/frontend/react-typography",
  none: "",

};

const backendTemplates = {
  contactApi:
    "mauryasuryakant/devsmith-templates/backend/contact-api",
  none: "",

};

// --------------------------------------------------
// Package Manager
// --------------------------------------------------

/*
 * npm is exposed as npm.cmd on Windows.
 *
 * On Unix-like systems it is simply npm.
 */
const npmCommand =
  process.platform === "win32" ? "npm.cmd" : "npm";

// --------------------------------------------------
// Process Management
// --------------------------------------------------

const runningProcesses = [];

/**
 * Run a command and wait until it finishes.
 *
 * Windows:
 *   npm.cmd is executed through the Windows shell.
 *
 * Linux/macOS:
 *   npm is executed directly.
 */
function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
      windowsHide: false,
    });

    runningProcesses.push(child);

    child.once("error", reject);

    child.once("close", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      let message = `${command} ${args.join(" ")} failed`;

      if (code !== null) {
        message += ` with exit code ${code}`;
      }

      if (signal) {
        message += ` (${signal})`;
      }

      reject(new Error(message));
    });
  });
}

/**
 * Start a long-running command.
 */
function startCommand(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    windowsHide: false,
  });

  runningProcesses.push(child);

  child.once("error", (error) => {
    console.error(
      `\n❌ Failed to start ${command}: ${error.message}`
    );
  });

  return child;
}

// --------------------------------------------------
// Browser
// --------------------------------------------------

function openBrowser(url) {
  const command =
    process.platform === "win32"
      ? "cmd.exe"
      : process.platform === "darwin"
        ? "open"
        : "xdg-open";

  const args =
    process.platform === "win32"
      ? ["/c", "start", "", url]
      : [url];

  const browser = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });

  browser.unref();

  browser.once("error", () => {
    console.log(`\n🌐 Open ${url} in your browser.`);
  });
}

// --------------------------------------------------
// Welcome
// --------------------------------------------------

console.log(`
⚒️  Welcome to Devsmith!

Let's build your project.
`);

// --------------------------------------------------
// Selection
// --------------------------------------------------

const frontend = await select({
  message: "Select your frontend:",
  choices: [
    {
      name: "Vue + TypeScript",
      value: "vue",
    },
    {
      name: "React + TypeScript",
      value: "react",
    },
    // {
    //   name: "None",
    //   value: "none",
    // },
  ],
});

const backend = await select({
  message: "Select your backend:",
  choices: [
    {
      name: "Contact API",
      value: "contactApi",
    },
    {
      name: "None",
      value: "none",
    },
  ],
});

// --------------------------------------------------
// Directories
// --------------------------------------------------

const root = process.cwd();

const frontendDir = path.join(root, "frontend");
const backendDir = path.join(root, "backend");

await mkdir(frontendDir, { recursive: true });
await mkdir(backendDir, { recursive: true });

// --------------------------------------------------
// Download Templates
// --------------------------------------------------

console.log("\n📦 Downloading templates...\n");

try {
  console.log("→ Downloading frontend...");

  await degit(
    frontendTemplates[frontend]
  ).clone(frontendDir);

  console.log("✓ Frontend downloaded");

  console.log("\n→ Downloading backend...");

  await degit(
    backendTemplates[backend]
  ).clone(backendDir);

  console.log("✓ Backend downloaded");
} catch (error) {
  console.error("\n❌ Failed to download templates.\n");

  console.error(error?.message ?? error);

  console.error(`
Devsmith could not download the required templates.

Please check:
  • Your internet connection
  • GitHub availability
  • The selected template
`);

  process.exit(1);
}

// --------------------------------------------------
// Install Dependencies
// --------------------------------------------------

try {
  console.log("\n📥 Installing frontend dependencies...\n");

  await runCommand(
    npmCommand,
    ["install"],
    frontendDir
  );

  console.log("\n✓ Frontend dependencies installed");

  console.log("\n📥 Installing backend dependencies...\n");

  await runCommand(
    npmCommand,
    ["install"],
    backendDir
  );

  console.log("\n✓ Backend dependencies installed");
} catch (error) {
  console.error("\n❌ Failed to install dependencies.\n");

  console.error(error?.message ?? error);

  console.error(`
Devsmith could not install the project dependencies.

Devsmith does not require Administrator privileges
to install dependencies inside your project directory.

Try running:

  npm install

inside the affected project directory.

If npm is not available, make sure Node.js and npm
are installed and available in your PATH.
`);

  process.exit(1);
}

// --------------------------------------------------
// Start Backend
// --------------------------------------------------

console.log("\n🚀 Starting backend...\n");

const backendProcess = startCommand(
  npmCommand,
  ["run", "dev"],
  backendDir
);

// --------------------------------------------------
// Start Frontend
// --------------------------------------------------

console.log("\n🚀 Starting frontend...\n");

const frontendProcess = startCommand(
  npmCommand,
  ["run", "dev"],
  frontendDir
);

// --------------------------------------------------
// Open Browser
// --------------------------------------------------

setTimeout(() => {
  console.log("\n🌐 Opening frontend...\n");

  openBrowser("http://localhost:5173");
}, 3000);

// --------------------------------------------------
// Shutdown
// --------------------------------------------------

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log("\n\n🛑 Shutting down Devsmith...\n");

  for (const child of runningProcesses) {
    if (!child.killed) {
      child.kill();
    }
  }

  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

// --------------------------------------------------
// Process Exit Handling
// --------------------------------------------------

backendProcess.once("exit", (code) => {
  if (!shuttingDown && code !== 0) {
    console.error(
      `\n❌ Backend stopped with exit code ${code}.`
    );
  }
});

frontendProcess.once("exit", (code) => {
  if (!shuttingDown && code !== 0) {
    console.error(
      `\n❌ Frontend stopped with exit code ${code}.`
    );
  }
});