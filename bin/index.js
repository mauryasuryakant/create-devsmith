#!/usr/bin/env node

import { select } from "@inquirer/prompts";
import degit from "degit";
import path from "node:path";
import { access, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import process from "node:process";

const templates = {
  portfolio: "mauryasuryakant/devsmith-templates/full-stack/portfolio",
  blog: "mauryasuryakant/devsmith-templates/full-stack/blog",
};

const themes = {
  default: null,
  claude: "https://tweakcn.com/r/themes/claude.json",
  doom64: "https://tweakcn.com/r/themes/doom-64.json",
  twitter: "https://tweakcn.com/r/themes/twitter.json",
  vercel: "https://tweakcn.com/r/themes/vercel.json",
  cyberpunk: "https://tweakcn.com/r/themes/cyberpunk.json",
  mono: "https://tweakcn.com/r/themes/mono.json",
  supabase: "https://tweakcn.com/r/themes/supabase.json",
  retroArcade: "https://tweakcn.com/r/themes/retro-arcade.json",
};

const databases = {
  mongodb: "mongodb",
  supabase: "supabase",
};

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const runningProcesses = [];

function runCommand(command, args, cwd, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio:
        input === undefined
          ? "inherit"
          : ["pipe", "inherit", "inherit"],
      shell: process.platform === "win32",
      windowsHide: false,
    });

    runningProcesses.push(child);

    if (input !== undefined && child.stdin) {
      child.stdin.write(input);
      child.stdin.end();
    }

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
    const exists = await fileExists(path.join(projectDir, file));

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
      `Template validation failed.

Missing required files/directories:
${missingItems.map((item) => `  • ${item}`).join("\n")}`
    );
  }

  console.log("\n✓ Template validation passed");
  console.log("✓ shadcn/ui configuration detected");
  console.log("✓ DevSmith configuration detected");
}

function openEditor(filePath) {
  const editor =
    process.env.VISUAL || process.env.EDITOR || "code";

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

async function removeUnselectedDatabases(
  projectDir,
  selectedDatabase
) {
  const databaseDir = path.join(
    projectDir,
    "src",
    "database"
  );

  const databaseOptions = ["mongodb", "supabase"];

  for (const database of databaseOptions) {
    if (database !== selectedDatabase) {
      await rm(path.join(databaseDir, database), {
        recursive: true,
        force: true,
      });
    }
  }
}

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

const projectType = await select({
  message: "What type of project do you want to build?",
  choices: [
    {
      name: "Blog",
      value: "blog",
    },
    {
      name: "Portfolio",
      value: "portfolio",
    },
  ],
});

let selectedTheme = "default";
let selectedDatabase = null;

selectedTheme = await select({
  message: "Which theme do you prefer?",
  choices: [
    {
      name: "Default Theme",
      value: "default",
    },
    {
      name: "Claude Theme",
      value: "claude",
    },
    {
      name: "Doom 64 Theme",
      value: "doom64",
    },
    {
      name: "Twitter Theme",
      value: "twitter",
    },
    {
      name: "Vercel Theme",
      value: "vercel",
    },
    {
      name: "Cyberpunk Theme",
      value: "cyberpunk",
    },
    {
      name: "Mono Theme",
      value: "mono",
    },
    {
      name: "Supabase Theme",
      value: "supabase",
    },
    {
      name: "Retro Arcade Theme",
      value: "retroArcade",
    },
  ],
});

if (projectType === "blog") {
  selectedDatabase = await select({
    message: "Which database do you prefer?",
    choices: [
      {
        name: "MongoDB",
        value: "mongodb",
      },
      {
        name: "Supabase",
        value: "supabase",
      },
    ],
  });
}

const root = process.cwd();

const projectDir = path.join(
  root,
  projectType === "blog" ? "blog" : "portfolio"
);

const template = templates[projectType];

if (!template) {
  console.error("\n❌ Invalid project type.\n");
  process.exit(1);
}

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

console.log(
  `\n📦 Downloading ${projectType} template...\n`
);

try {
  await degit(template).clone(projectDir);

  console.log(
    `✓ ${projectType === "blog" ? "Blog" : "Portfolio"} template downloaded`
  );
} catch (error) {
  console.error(
    "\n❌ Failed to download the template.\n"
  );

  console.error(
    error instanceof Error ? error.message : error
  );

  process.exit(1);
}

try {
  await validateTemplate(projectDir);
} catch (error) {
  console.error(
    "\n❌ Invalid DevSmith template.\n"
  );

  console.error(
    error instanceof Error ? error.message : error
  );

  console.error("\nThe project was not started.\n");

  process.exit(1);
}

if (selectedDatabase) {
  try {
    console.log("\n🗄️ Configuring database...\n");

    await removeUnselectedDatabases(
      projectDir,
      databases[selectedDatabase]
    );

    console.log(
      `✓ ${
        selectedDatabase === "mongodb"
          ? "MongoDB"
          : "Supabase"
      } selected`
    );
  } catch (error) {
    console.error(
      "\n❌ Failed to configure the database.\n"
    );

    console.error(
      error instanceof Error ? error.message : error
    );

    process.exit(1);
  }
}

try {
  console.log("\n📥 Installing dependencies...\n");

  await runCommand(
    npmCommand,
    ["install"],
    projectDir
  );

  console.log("\n✓ Dependencies installed");
} catch (error) {
  console.error(
    "\n❌ Failed to install dependencies.\n"
  );

  console.error(
    error instanceof Error ? error.message : error
  );

  process.exit(1);
}

if (themes[selectedTheme]) {
  try {
    console.log(
      `\n🎨 Installing ${selectedTheme} theme...\n`
    );

    await runCommand(
      npmCommand,
      [
        "exec",
        "--",
        "shadcn@latest",
        "add",
        themes[selectedTheme],
      ],
      projectDir,
      "y\n"
    );

    console.log("\n✓ Theme installed");
  } catch (error) {
    console.error(
      "\n❌ Failed to install the theme.\n"
    );

    console.error(
      error instanceof Error ? error.message : error
    );

    process.exit(1);
  }
} else {
  console.log("\n✓ Default theme selected");
}

console.log(
  "\n🚀 Starting development server...\n"
);

const projectProcess = startCommand(
  npmCommand,
  ["run", "dev"],
  projectDir
);

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

Template:
  ${projectType}

Theme:
  ${
    selectedTheme === "retroArcade"
      ? "Retro Arcade"
      : selectedTheme === "supabase"
        ? "Supabase"
        : selectedTheme.charAt(0).toUpperCase() +
          selectedTheme.slice(1)
  }

${
  selectedDatabase
    ? `Database:
  ${
    selectedDatabase === "mongodb"
      ? "MongoDB"
      : "Supabase"
  }

`
    : ""
}Configuration:
  ${configFile}

Development server:
  http://localhost:3000
`);
}, 1500);

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

projectProcess.once("exit", (code) => {
  if (!shuttingDown && code !== 0) {
    console.error(
      `\n❌ Development server stopped with exit code ${code}.`
    );
  }
});