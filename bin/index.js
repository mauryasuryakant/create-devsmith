#!/usr/bin/env node

import { select } from "@inquirer/prompts";
import degit from "degit";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { spawn, execFileSync } from "node:child_process";
import process from "node:process";

// --------------------------------------------------
// Templates
// --------------------------------------------------

const frontendTemplates = {
  vue: "mauryasuryakant/devsmith-templates/frontend/vue-contact-api-ts",
};

const backendTemplates = {
  contactApi:
    "mauryasuryakant/devsmith-templates/backend/contact-api",
};

// --------------------------------------------------
// Platform Commands
// --------------------------------------------------

/*
 * Windows exposes npm through npm.cmd.
 *
 * Linux/macOS use npm directly.
 *
 * This keeps all platform-specific package-manager
 * handling in one place.
 */
const npmCommand =
  process.platform === "win32" ? "npm.cmd" : "npm";

// --------------------------------------------------
// Process Management
// --------------------------------------------------

const processes = [];

/**
 * Run a command and return the child process.
 */
function runCommand(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
  });

  processes.push(child);

  child.on("error", (error) => {
    console.error(`\n❌ Failed to start ${command}:`);
    console.error(error.message);
  });

  return child;
}

/**
 * Run a command synchronously.
 *
 * Used for operations that must finish before
 * Devsmith continues.
 */
function runCommandSync(command, args, cwd) {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
  });
}

// --------------------------------------------------
// Browser
// --------------------------------------------------

function openBrowser(url) {
  let command;
  let args;

  switch (process.platform) {
    case "win32":
      /*
       * `start` is a CMD builtin, so Windows needs
       * cmd.exe here specifically.
       */
      command = "cmd.exe";
      args = ["/c", "start", "", url];
      break;

    case "darwin":
      command = "open";
      args = [url];
      break;

    case "linux":
      command = "xdg-open";
      args = [url];
      break;

    default:
      console.log(`\n🌐 Open ${url} in your browser.`);
      return;
  }

  const browserProcess = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  });

  browserProcess.unref();

  browserProcess.on("error", () => {
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
  ],
});

const backend = await select({
  message: "Select your backend:",
  choices: [
    {
      name: "Contact API",
      value: "contactApi",
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

console.log("→ Downloading frontend...");

await degit(frontendTemplates[frontend]).clone(frontendDir);

console.log("✓ Frontend downloaded");

console.log("\n→ Downloading backend...");

await degit(backendTemplates[backend]).clone(backendDir);

console.log("✓ Backend downloaded");

// --------------------------------------------------
// Install Dependencies
// --------------------------------------------------

try {
  console.log("\n📥 Installing frontend dependencies...\n");

  runCommandSync(
    npmCommand,
    ["install"],
    frontendDir
  );

  console.log("\n✓ Frontend dependencies installed");

  console.log("\n📥 Installing backend dependencies...\n");

  runCommandSync(
    npmCommand,
    ["install"],
    backendDir
  );

  console.log("\n✓ Backend dependencies installed");
} catch (error) {
  console.error("\n❌ Failed to install dependencies.");
  console.error("\nDevsmith stopped because dependency installation failed.");

  process.exit(1);
}

// --------------------------------------------------
// Start Backend
// --------------------------------------------------

console.log("\n🚀 Starting backend...\n");

const backendProcess = runCommand(
  npmCommand,
  ["run", "dev"],
  backendDir
);

// --------------------------------------------------
// Start Frontend
// --------------------------------------------------

console.log("\n🚀 Starting frontend...\n");

const frontendProcess = runCommand(
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

function shutdown() {
  console.log("\n\n🛑 Shutting down Devsmith...\n");

  for (const child of processes) {
    if (!child.killed) {
      child.kill();
    }
  }

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);