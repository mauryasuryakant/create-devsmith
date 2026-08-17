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

const templates = {
  portfolio: {
    basic:
      "mauryasuryakant/devsmith-templates/full-stack/portfolio/simple-portfolio",
  },
};

// --------------------------------------------------
// Package Manager
// --------------------------------------------------

const npmCommand =
  process.platform === "win32" ? "npm.cmd" : "npm";

// --------------------------------------------------
// Process Management
// --------------------------------------------------

const runningProcesses = [];

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
// Editor
// --------------------------------------------------

function openEditor(filePath) {
  const editor =
    process.env.VISUAL ||
    process.env.EDITOR ||
    "code";

  const editorProcess = spawn(editor, [filePath], {
    detached: true,
    stdio: "ignore",
    shell: process.platform === "win32",
    windowsHide: false,
  });

  editorProcess.unref();

  editorProcess.once("error", () => {
    console.log(
      `\n📝 Open this file in your editor:\n${filePath}`
    );
  });
}

// --------------------------------------------------
// Welcome
// --------------------------------------------------

console.log(`
⚒️  Welcome to DevSmith!

DevSmith is a project assembler that helps you
build projects from ready-to-use templates.

DevSmith is strictly built around:

  • Next.js
  • TypeScript
  • Tailwind CSS
  • shadcn/ui

Choose a project type and DevSmith will assemble it for you.
`);

// --------------------------------------------------
// Project Selection
// --------------------------------------------------

const projectType = await select({
  message: "What type of project do you want to build?",
  choices: [
    {
      name: "Portfolio",
      value: "portfolio",
    },
    {
      name: "Test Template",
      value: "test-template",
    },
  ],
});

// --------------------------------------------------
// Portfolio Template Selection
// --------------------------------------------------

let templateType = null;

if (projectType === "portfolio") {
  templateType = await select({
    message: "Which portfolio template do you prefer?",
    choices: [
      {
        name: "Blank",
        value: "blank",
        description:
          "Routes + configuration, ready to build on",
      },
      {
        name: "Basic Template",
        value: "basic",
        description: "Minimal UI for a portfolio",
      },
    ],
  });
}

// --------------------------------------------------
// Directories
// --------------------------------------------------

const root = process.cwd();

if (projectType === "test-template") {
  console.log(`
🧪 Test Template is not available yet.

Thanks for testing DevSmith!
`);

  process.exit(0);
}

if (templateType === "blank") {
  console.log(`
🚧 Blank Portfolio is not available yet.

Coming soon: a blank project with all routes
and configuration already prepared.
`);

  process.exit(0);
}

const projectDir = path.join(root, "simple-portfolio");

await mkdir(projectDir, { recursive: true });

// --------------------------------------------------
// Download Template
// --------------------------------------------------

console.log("\n📦 Downloading portfolio template...\n");

try {
  await degit(
    templates.portfolio.basic
  ).clone(projectDir);

  console.log("✓ Portfolio template downloaded");
} catch (error) {
  console.error("\n❌ Failed to download the template.\n");

  console.error(error?.message ?? error);

  console.error(`
DevSmith could not download the selected template.

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
  console.log("\n📥 Installing dependencies...\n");

  await runCommand(
    npmCommand,
    ["install"],
    projectDir
  );

  console.log("\n✓ Dependencies installed");
} catch (error) {
  console.error("\n❌ Failed to install dependencies.\n");

  console.error(error?.message ?? error);

  console.error(`
DevSmith could not install the project dependencies.

Try running:

  npm install

inside:

  ${projectDir}
`);

  process.exit(1);
}

// --------------------------------------------------
// Start Development Server
// --------------------------------------------------

console.log("\n🚀 Starting development server...\n");

const projectProcess = startCommand(
  npmCommand,
  ["run", "dev"],
  projectDir
);

// --------------------------------------------------
// Open Configuration File
// --------------------------------------------------

const configFile = path.join(
  projectDir,
  "src",
  "data",
  "config.ts"
);

setTimeout(() => {
  console.log(
    "\n📝 Opening project configuration...\n"
  );

  openEditor(configFile);

  console.log(`
✨ DevSmith project is ready!

Project:
  ${projectDir}

Configuration:
  ${configFile}

Development server:
  http://localhost:3000
`);
}, 1500);

// --------------------------------------------------
// Shutdown
// --------------------------------------------------

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(
    "\n\n🛑 Shutting down Devsmith...\n"
  );

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

projectProcess.once("exit", (code) => {
  if (!shuttingDown && code !== 0) {
    console.error(
      `\n❌ Development server stopped with exit code ${code}.`
    );
  }
});
