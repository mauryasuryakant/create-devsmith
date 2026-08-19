#!/usr/bin/env node

import { select } from "@inquirer/prompts";
import degit from "degit";
import path from "node:path";
import { access } from "node:fs/promises";
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
// File / Directory Validation
// --------------------------------------------------

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function validateTemplate(projectDir) {
  console.log("\n🔍 Validating DevSmith template...\n");

  const requiredFiles = [
    "package.json",
    "components.json",
    "devsmith.config.ts",
  ];

  const requiredDirectories = [
    path.join("src", "app"),
    path.join("src", "components"),
    path.join("src", "components", "ui"),
    path.join("src", "features"),
  ];

  const missingItems = [];

  for (const file of requiredFiles) {
    const exists = await fileExists(
      path.join(projectDir, file)
    );

    if (exists) {
      console.log(`✓ ${file}`);
    } else {
      console.log(`✗ ${file}`);
      missingItems.push(file);
    }
  }

  for (const directory of requiredDirectories) {
    const exists = await fileExists(
      path.join(projectDir, directory)
    );

    if (exists) {
      console.log(`✓ ${directory}/`);
    } else {
      console.log(`✗ ${directory}/`);
      missingItems.push(`${directory}/`);
    }
  }

  if (missingItems.length > 0) {
    throw new Error(
      `Template validation failed.\n\nMissing required files/directories:\n${missingItems
        .map((item) => `  • ${item}`)
        .join("\n")}`
    );
  }

  console.log("\n✓ Template validation passed");
  console.log("✓ shadcn/ui configuration detected");
  console.log("✓ DevSmith configuration detected");
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

Every DevSmith template is distributed as a
fully configured and ready-to-use project.

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
// Project Setup
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

const projectDir = path.join(
  root,
  "simple-portfolio"
);

// --------------------------------------------------
// Existing Project Protection
// --------------------------------------------------

if (await fileExists(projectDir)) {
  console.error(`
❌ Project directory already exists.

  ${projectDir}

DevSmith will not overwrite an existing project.

Please remove or rename the existing directory
before running DevSmith again.
`);

  process.exit(1);
}

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
// Validate Template
// --------------------------------------------------

try {
  await validateTemplate(projectDir);
} catch (error) {
  console.error("\n❌ Invalid DevSmith template.\n");

  console.error(error?.message ?? error);

  console.error(`
The downloaded template does not satisfy
DevSmith's template requirements.

The project was not started.
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
// shadcn/ui Status
// --------------------------------------------------

console.log(`
✓ shadcn/ui is already initialized in the template.

DevSmith will NOT run "shadcn init".

The existing shadcn configuration will be preserved.

You can use shadcn normally inside the generated project:

  npx shadcn@latest add <component>
`);

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
  "devsmith.config.ts"
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

shadcn/ui:
  Already initialized
  Fully CLI-compatible

You can add more shadcn components with:

  npx shadcn@latest add <component>
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
    "\n\n🛑 Shutting down DevSmith...\n"
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