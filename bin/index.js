#!/usr/bin/env node

import { select } from "@inquirer/prompts";
import degit from "degit";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { spawn, execSync } from "node:child_process";
import process from "node:process";

// --------------------------------------------------
// Templates
// --------------------------------------------------

const frontendTemplates = {
  vue: "mauryasuryant/devsmith-templates/frontend/vue-contact-api-ts",
};

const backendTemplates = {
  contactApi:
    "mauryasuryant/devsmith-templates/backend/contact-api",
};

// --------------------------------------------------
// Platform Commands
// --------------------------------------------------

const npmCommand =
  process.platform === "win32" ? "npm.cmd" : "npm";

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function runCommand(command, args, cwd) {
  return spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

function openBrowser(url) {
  const commands = {
    win32: ["cmd", ["/c", "start", "", url]],
    darwin: ["open", [url]],
    linux: ["xdg-open", [url]],
  };

  const commandInfo = commands[process.platform];

  if (!commandInfo) {
    console.log(`\n🌐 Open ${url} in your browser.`);
    return;
  }

  const [command, args] = commandInfo;

  spawn(command, args, {
    detached: true,
    stdio: "ignore",
  }).unref();
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

console.log("\n📥 Installing frontend dependencies...\n");

execSync(`${npmCommand} install`, {
  cwd: frontendDir,
  stdio: "inherit",
});

console.log("\n✓ Frontend dependencies installed");

console.log("\n📥 Installing backend dependencies...\n");

execSync(`${npmCommand} install`, {
  cwd: backendDir,
  stdio: "inherit",
});

console.log("\n✓ Backend dependencies installed");

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

  backendProcess.kill();
  frontendProcess.kill();

  process.exit();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);