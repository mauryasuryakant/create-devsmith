#!/usr/bin/env node

import { select } from "@inquirer/prompts";
import degit from "degit";
import path from "node:path";
import { mkdir } from "node:fs/promises";

console.log("\n⚒️  Welcome to Devsmith!\n");

// ------------------------------------------
// Hardcoded templates for now
// ------------------------------------------

const frontendTemplates = {
  vue: "mauryasuryakant/devsmith-templates/frontend/vue-contact-api-ts",
};

const backendTemplates = {
  contactApi: "mauryasuryakant/devsmith-templates/backend/contact-api",
};

// ------------------------------------------
// User selections
// ------------------------------------------

const frontend = await select({
  message: "Select your frontend:",
  choices: [
    {
      name: "Vue + TypeScript + Tailwind + shadcn",
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

// ------------------------------------------
// Project directories
// ------------------------------------------

const root = process.cwd();

const frontendDir = path.join(root, "frontend");
const backendDir = path.join(root, "backend");

await mkdir(frontendDir, { recursive: true });
await mkdir(backendDir, { recursive: true });

// ------------------------------------------
// Download templates
// ------------------------------------------

console.log("\n📦 Downloading templates...\n");

const frontendRepo = frontendTemplates[frontend];
const backendRepo = backendTemplates[backend];

console.log("→ Frontend:", frontendRepo);

await degit(frontendRepo).clone(frontendDir);

console.log("✓ Frontend downloaded\n");

console.log("→ Backend:", backendRepo);

await degit(backendRepo).clone(backendDir);

console.log("✓ Backend downloaded\n");

// ------------------------------------------
// Done
// ------------------------------------------

console.log("🎉 Devsmith project created!\n");

console.log(`Frontend → ${frontendDir}`);
console.log(`Backend  → ${backendDir}\n`);