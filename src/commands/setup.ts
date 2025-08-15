#!/usr/bin/env node

/**
 * Focused Setup Wizard for WallWhale
 *
 * This wizard helps users:
 * 1. Choose between local development and Docker deployment
 * 2. Set up the environment file (.env)
 * 3. Prepare the project for running
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import inquirer from "inquirer";
import chalk from "chalk";
import boxen from "boxen";
import ora from "ora";
import crypto from "node:crypto";
import {
  getDepotDownloaderBinaryName,
  getDefaultDepotDownloaderPath,
} from "../utils/depotDownloader.js";

interface SetupConfig {
  // Core deployment choice
  deployment: "local" | "docker";

  // Environment settings
  environment: "development" | "production";
  port: number;
  host: string;

  // Database configuration
  database: {
    type: "sqlite" | "postgresql";
    url: string;
  };

  // Authentication
  admin: {
    email: string;
    password: string;
  };

  // Steam accounts
  steamAccounts: string; // formatted as "user1:pass1,user2:pass2"

  // Security
  jwtSecret: string;
  apiKeySalt: string;

  // Features
  enableTLS: boolean;
  enableDocs: boolean;
  enableMetrics: boolean;

  // Paths
  saveRoot: string;
  depotDownloaderPath: string;

  // Docker-specific options
  docker?: {
    persistentVolumes: boolean;
    useExternalDatabase: boolean;
    databaseService: "postgresql" | "redis" | "both" | "none";
    enableNginx: boolean;
    enablePrometheus: boolean;
    enableGrafana: boolean;
    enableRedis: boolean;
    resourceLimits: {
      memory: string;
      cpus: string;
    };
    networkMode: "bridge" | "host";
    exposeMetrics: boolean;
    autoRestart: boolean;
    logDriver: "json-file" | "syslog" | "journald";
    logMaxSize: string;
    logMaxFiles: number;
  };
}

export class SetupWizard {
  private config: SetupConfig = {} as SetupConfig;
  private projectRoot: string;
  private generatedDir: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.generatedDir = path.join(this.projectRoot, "generated");
  }

  async run(): Promise<void> {
    try {
      this.showWelcome();

      await this.checkExistingConfig();
      await this.chooseDeployment();
      await this.setupEnvironment();
      await this.setupDatabase();
      await this.setupAuthentication();
      await this.setupSteamAccounts();
      await this.setupNetworking();
      await this.setupFeatures();
      await this.setupPaths();

      // Docker-specific configuration
      if (this.config.deployment === "docker") {
        await this.setupDockerConfiguration();
      }

      await this.checkAndSetupDepotDownloader();
      await this.generateSecrets();

      await this.createEnvironmentFile();
      await this.setupProject();

      // Docker deployment setup
      if (this.config.deployment === "docker") {
        await this.createDockerFiles();
        await this.checkDockerAndDeploy();
      }

      this.showCompletion();
    } catch (error) {
      console.error(chalk.red("\n❌ Setup failed:"), error);
      process.exit(1);
    }
  }

  private showWelcome(): void {
    console.clear();

    const banner = boxen(
      `${chalk.bold.cyan("🚀 WallWhale Setup")}

${chalk.gray("This wizard will help you:")}
  ${chalk.green("✓")} Choose deployment method (Local or Docker)
  ${chalk.green("✓")} Configure environment settings
  ${chalk.green("✓")} Set up database and authentication
  ${chalk.green("✓")} Configure Steam accounts
  ${chalk.green("✓")} Generate .env file
  ${chalk.green("✓")} Prepare project for running

${chalk.dim("Takes about 3-5 minutes to complete.")}`,
      {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "cyan",
        backgroundColor: "#001122",
      }
    );

    console.log(banner);
  }

  private async checkExistingConfig(): Promise<void> {
    const envPath = path.join(this.projectRoot, ".env");

    if (fs.existsSync(envPath)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: "confirm",
          name: "overwrite",
          message: chalk.yellow("⚠️  Existing .env file found. Overwrite it?"),
          default: false,
        },
      ]);

      if (!overwrite) {
        console.log(chalk.blue("ℹ️  Setup cancelled. Your existing configuration is preserved."));
        process.exit(0);
      }
    }
  }

  private async chooseDeployment(): Promise<void> {
    console.log(chalk.bold.blue("\n🚀 Deployment Method"));

    const { deployment } = await inquirer.prompt([
      {
        type: "list",
        name: "deployment",
        message: "How do you want to run the server?",
        choices: [
          {
            name:
              chalk.green("Local Development") +
              chalk.dim(" - Run directly with Node.js (easier for development)"),
            value: "local",
          },
          {
            name:
              chalk.blue("Docker") +
              chalk.dim(" - Run in Docker container (recommended for production)"),
            value: "docker",
          },
        ],
      },
    ]);

    this.config.deployment = deployment;
  }

  private async setupEnvironment(): Promise<void> {
    console.log(chalk.bold.blue("\n🌍 Environment Configuration"));

    const { environment } = await inquirer.prompt([
      {
        type: "list",
        name: "environment",
        message: "Select environment mode:",
        choices: [
          {
            name:
              chalk.green("Development") +
              chalk.dim(" - Debug logging, auto-reload, relaxed security"),
            value: "development",
          },
          {
            name: chalk.blue("Production") + chalk.dim(" - Optimized performance, secure defaults"),
            value: "production",
          },
        ],
        default: this.config.deployment === "local" ? "development" : "production",
      },
    ]);

    this.config.environment = environment;
  }

  private async setupDatabase(): Promise<void> {
    console.log(chalk.bold.blue("\n🗄️  Database Configuration"));

    const { databaseType } = await inquirer.prompt([
      {
        type: "list",
        name: "databaseType",
        message: "Choose your database:",
        choices: [
          {
            name:
              chalk.green("SQLite") +
              chalk.dim(" - File-based, zero configuration (recommended for most users)"),
            value: "sqlite",
          },
          {
            name:
              chalk.blue("PostgreSQL") +
              chalk.dim(" - Professional database for high-performance needs"),
            value: "postgresql",
          },
        ],
      },
    ]);

    if (databaseType === "sqlite") {
      let dbUrl: string;
      if (this.config.deployment === "docker") {
        dbUrl = "file:/app/data/depot.db";
      } else {
        // Use absolute path for Windows compatibility
        const absoluteDbPath = path
          .resolve(this.projectRoot, "data", "depot.db")
          .replace(/\\/g, "/");
        dbUrl = `file:${absoluteDbPath}`;
      }

      this.config.database = {
        type: "sqlite",
        url: dbUrl,
      };
    } else {
      const dbConfig = await inquirer.prompt([
        {
          type: "input",
          name: "host",
          message: "Database host:",
          default: this.config.deployment === "docker" ? "postgres" : "localhost",
        },
        {
          type: "input",
          name: "port",
          message: "Database port:",
          default: "5432",
        },
        {
          type: "input",
          name: "database",
          message: "Database name:",
          default: "depotdownloader",
        },
        {
          type: "input",
          name: "username",
          message: "Database username:",
          default: "depot",
        },
        {
          type: "password",
          name: "password",
          message: "Database password:",
          mask: "*",
        },
      ]);

      this.config.database = {
        type: "postgresql",
        url: `postgresql://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`,
      };
    }
  }

  private async setupAuthentication(): Promise<void> {
    console.log(chalk.bold.blue("\n🔐 Admin Account"));

    const authConfig = await inquirer.prompt([
      {
        type: "input",
        name: "email",
        message: "Admin email address:",
        validate: (input) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(input) || "Please enter a valid email address";
        },
        default: "admin@example.com",
      },
      {
        type: "password",
        name: "password",
        message: "Admin password (min 8 characters):",
        mask: "*",
        validate: (input) => {
          return input.length >= 8 || "Password must be at least 8 characters long";
        },
      },
    ]);

    this.config.admin = authConfig;
  }

  private async setupSteamAccounts(): Promise<void> {
    console.log(chalk.bold.blue("\n🎮 Steam Accounts"));
    console.log(
      chalk.yellow("ℹ️  You need at least one Steam account to download Workshop content.")
    );

    // Check if accounts.safe file exists
    const accountsSafePath = path.join(this.projectRoot, "accounts.safe");
    const accountsTemplatePath = path.join(this.projectRoot, "accounts.template");

    if (fs.existsSync(accountsSafePath)) {
      console.log(chalk.green("✓ Found existing accounts.safe file"));

      const { useExisting } = await inquirer.prompt([
        {
          type: "confirm",
          name: "useExisting",
          message: "Load Steam accounts from existing accounts.safe file?",
          default: true,
        },
      ]);

      if (useExisting) {
        try {
          // Load accounts from the file
          const accountsData = await this.loadAccountsFromSafeFile(accountsSafePath);

          if (accountsData.length > 0) {
            console.log(
              chalk.green(`✓ Loaded ${accountsData.length} Steam accounts from accounts.safe`)
            );

            // Display loaded accounts (without passwords)
            console.log(chalk.dim("\nLoaded accounts:"));
            accountsData.forEach((account, index) => {
              const username = account.split(":")[0];
              console.log(chalk.dim(`  ${index + 1}. ${username}`));
            });

            this.config.steamAccounts = accountsData.join(",");

            const { addMore } = await inquirer.prompt([
              {
                type: "confirm",
                name: "addMore",
                message: "Add additional Steam accounts?",
                default: false,
              },
            ]);

            if (addMore) {
              await this.addManualAccounts();
            }
            return;
          } else {
            console.log(chalk.yellow("⚠️  No valid accounts found in accounts.safe file"));
          }
        } catch (error) {
          console.log(
            chalk.red(
              `❌ Error loading accounts.safe: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          console.log(chalk.yellow("📝 You can manually fix the file or add accounts manually"));
        }
      }
    } else if (fs.existsSync(accountsTemplatePath)) {
      console.log(chalk.yellow("⚠️  Found accounts.template file but no accounts.safe"));

      const { convertTemplate } = await inquirer.prompt([
        {
          type: "confirm",
          name: "convertTemplate",
          message: "Convert accounts.template to encrypted accounts.safe file?",
          default: true,
        },
      ]);

      if (convertTemplate) {
        try {
          console.log(chalk.blue("🔐 Converting template to encrypted format..."));
          execSync("node scripts/accounts.js encode", { cwd: this.projectRoot, stdio: "inherit" });

          // Now load the newly created accounts.safe
          const accountsData = await this.loadAccountsFromSafeFile(accountsSafePath);
          if (accountsData.length > 0) {
            console.log(
              chalk.green(`✅ Successfully converted and loaded ${accountsData.length} accounts`)
            );
            this.config.steamAccounts = accountsData.join(",");
            return;
          }
        } catch (error) {
          console.log(
            chalk.red(
              `❌ Error converting template: ${error instanceof Error ? error.message : String(error)}`
            )
          );
        }
      }
    }

    // If no file exists or user chose to add manually
    console.log(chalk.blue("\n📝 Add Steam accounts manually"));
    await this.addManualAccounts();

    // Offer to save accounts to file
    if (this.config.steamAccounts) {
      const { saveToFile } = await inquirer.prompt([
        {
          type: "confirm",
          name: "saveToFile",
          message: "Save these accounts to encrypted accounts.safe file for future use?",
          default: true,
        },
      ]);

      if (saveToFile) {
        await this.saveAccountsToFiles();
      }
    }
  }

  private async loadAccountsFromSafeFile(filePath: string): Promise<string[]> {
    const content = fs.readFileSync(filePath, "utf-8");
    const accounts: string[] = [];

    for (const line of content.split("\n")) {
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }

      // Find the first colon to separate username from encrypted data
      const colonIndex = trimmedLine.indexOf(":");
      if (colonIndex === -1) {
        continue;
      }

      const username = trimmedLine.substring(0, colonIndex);
      const encryptedPassword = trimmedLine.substring(colonIndex + 1);

      if (username && encryptedPassword) {
        // Store as username:encrypted_data for later use
        accounts.push(`${username.trim()}:${encryptedPassword.trim()}`);
      }
    }

    return accounts;
  }

  private async addManualAccounts(): Promise<void> {
    const accounts: string[] = [];
    const existingAccounts = this.config.steamAccounts ? this.config.steamAccounts.split(",") : [];
    let addMore = true;
    let accountNum = existingAccounts.length + 1;

    while (addMore && accountNum <= 5) {
      const accountConfig = await inquirer.prompt([
        {
          type: "input",
          name: "username",
          message: `Steam username ${accountNum}:`,
          validate: (input) => input.trim().length > 0 || "Username cannot be empty",
        },
        {
          type: "password",
          name: "password",
          message: `Steam password ${accountNum}:`,
          mask: "*",
          validate: (input) => input.trim().length > 0 || "Password cannot be empty",
        },
      ]);

      accounts.push(`${accountConfig.username}:${accountConfig.password}`);
      accountNum++;

      if (accountNum <= 5) {
        const { continueAdding } = await inquirer.prompt([
          {
            type: "confirm",
            name: "continueAdding",
            message: "Add another Steam account?",
            default: false,
          },
        ]);
        addMore = continueAdding;
      }
    }

    // Combine existing accounts with new ones
    const allAccounts = [...existingAccounts, ...accounts];
    this.config.steamAccounts = allAccounts.join(",");
  }

  private async saveAccountsToFiles(): Promise<void> {
    try {
      const spinner = ora("Saving accounts to encrypted file...").start();

      // Create accounts.template with the manually entered accounts
      const templateContent = [
        "# Steam Accounts Template",
        "# Format: username:password (one per line)",
        "# This file contains PLAIN TEXT passwords - keep it secure!",
        "# Use 'npm run accounts:encode' to convert back to accounts.safe",
        "",
        ...this.config.steamAccounts.split(",").map((account) => {
          // If the account is already in encrypted format (from loaded file),
          // we need to extract just the username for the template
          const parts = account.split(":");
          if (parts.length > 2) {
            // This is encrypted format, just show username
            return `# ${parts[0]}:PASSWORD_ENCRYPTED_ALREADY`;
          }
          // This is plain format from manual entry
          return account;
        }),
      ].join("\n");

      fs.writeFileSync(path.join(this.projectRoot, "accounts.template"), templateContent, "utf8");

      // Convert to encrypted format
      execSync("node scripts/accounts.js encode", { cwd: this.projectRoot, stdio: "pipe" });

      spinner.succeed("Accounts saved to encrypted accounts.safe file");
      console.log(chalk.green("✓ accounts.safe - Encrypted accounts for the application"));
      console.log(chalk.green("✓ accounts.template - Template for sharing/editing"));
      console.log(chalk.dim("💡 Use 'npm run accounts:help' for account management commands"));
    } catch (error) {
      console.log(
        chalk.red(
          `❌ Error saving accounts: ${error instanceof Error ? error.message : String(error)}`
        )
      );
      console.log(chalk.yellow("⚠️  Accounts will still work but won't be saved to file"));
    }
  }

  private async setupNetworking(): Promise<void> {
    console.log(chalk.bold.blue("\n🌐 Network Configuration"));

    const networkConfig = await inquirer.prompt([
      {
        type: "input",
        name: "port",
        message: "Server port:",
        default: "3000",
        validate: (input) => {
          const port = parseInt(input);
          return (port >= 1024 && port <= 65535) || "Port must be between 1024 and 65535";
        },
      },
      {
        type: "list",
        name: "host",
        message: "Server host:",
        choices: [
          { name: "0.0.0.0 (All interfaces - recommended)", value: "0.0.0.0" },
          { name: "localhost (Local only)", value: "localhost" },
        ],
        default: "0.0.0.0",
      },
      {
        type: "confirm",
        name: "enableTLS",
        message: "Enable HTTPS/TLS (requires certificates)?",
        default: this.config.environment === "production",
      },
    ]);

    this.config.port = parseInt(networkConfig.port);
    this.config.host = networkConfig.host;
    this.config.enableTLS = networkConfig.enableTLS;
  }

  private async setupFeatures(): Promise<void> {
    console.log(chalk.bold.blue("\n✨ Features"));

    const features = await inquirer.prompt([
      {
        type: "confirm",
        name: "enableDocs",
        message: "Enable API documentation (Swagger UI)?",
        default: true,
      },
      {
        type: "confirm",
        name: "enableMetrics",
        message: "Enable Prometheus metrics?",
        default: true,
      },
    ]);

    this.config.enableDocs = features.enableDocs;
    this.config.enableMetrics = features.enableMetrics;
  }

  private async setupPaths(): Promise<void> {
    console.log(chalk.bold.blue("\n📁 File Paths"));

    // Determine platform-specific defaults
    const isWindows = process.platform === "win32";
    const defaultDepotPath = getDefaultDepotDownloaderPath(this.config.deployment === "docker");

    const pathConfig = await inquirer.prompt([
      {
        type: "input",
        name: "saveRoot",
        message: "Downloads directory:",
        default: this.config.deployment === "docker" ? "/app/downloads" : "./downloads",
      },
      {
        type: "input",
        name: "depotDownloaderPath",
        message: `DepotDownloader executable path (${isWindows ? "Windows" : "Linux"} binary):`,
        default: defaultDepotPath,
      },
    ]);

    this.config.saveRoot = pathConfig.saveRoot;
    this.config.depotDownloaderPath = pathConfig.depotDownloaderPath;
  }

  private async checkAndSetupDepotDownloader(): Promise<void> {
    console.log(chalk.bold.blue("\n⚙️  DepotDownloader Setup"));

    // Check if DepotDownloader exists at the specified path
    const depotPath = path.resolve(this.projectRoot, this.config.depotDownloaderPath);
    const depotExists = fs.existsSync(depotPath);

    if (depotExists) {
      console.log(chalk.green("✓ DepotDownloader found at specified path"));
      return;
    }

    console.log(chalk.yellow("⚠️  DepotDownloader not found at specified path"));
    console.log(chalk.dim(`Looking for: ${depotPath}`));

    const { buildDepot } = await inquirer.prompt([
      {
        type: "confirm",
        name: "buildDepot",
        message: "Would you like to build DepotDownloader from source?",
        default: true,
      },
    ]);

    if (!buildDepot) {
      console.log(
        chalk.yellow("⚠️  You'll need to manually place DepotDownloader at the specified path")
      );
      return;
    }

    await this.buildDepotDownloader();
  }

  private async buildDepotDownloader(): Promise<void> {
    const spinner = ora("Setting up DepotDownloader...").start();

    try {
      // Check if .NET 9 SDK is installed
      spinner.text = "Checking .NET 9 SDK...";
      await this.checkDotNetSDK();

      // Clone DepotDownloader repository
      spinner.text = "Downloading DepotDownloader source...";
      const tempDir = path.join(this.projectRoot, "temp_depot_build");

      if (fs.existsSync(tempDir)) {
        console.log(chalk.dim(`\nRemoving existing temp directory: ${tempDir}`));
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      console.log(chalk.dim(`\nCloning DepotDownloader to: ${tempDir}`));
      execSync(
        `git clone --depth 1 https://github.com/SteamAutoCracks/DepotDownloaderMod "${tempDir}"`,
        {
          cwd: this.projectRoot,
          stdio: "inherit",
        }
      );

      // Check if the clone was successful
      const projectFile = path.join(tempDir, "DepotDownloader", "DepotDownloaderMod.csproj");
      const solutionFile = path.join(tempDir, "DepotDownloaderMod.sln");
      console.log(chalk.dim(`\nChecking for project file: ${projectFile}`));
      console.log(chalk.dim(`Checking for solution file: ${solutionFile}`));

      if (!fs.existsSync(projectFile)) {
        throw new Error(`Project file not found at: ${projectFile}`);
      }
      if (!fs.existsSync(solutionFile)) {
        throw new Error(`Solution file not found at: ${solutionFile}`);
      }
      console.log(chalk.green("✓ Project and solution files found"));

      // Modify the project file for cross-platform build
      spinner.text = "Configuring build for cross-platform...";
      await this.modifyProjectFile(tempDir);

      // Restore packages first
      spinner.text = "Restoring .NET packages...";
      console.log(chalk.dim("\nRunning: dotnet restore DepotDownloaderMod.sln"));
      execSync("dotnet restore DepotDownloaderMod.sln", {
        cwd: tempDir,
        stdio: "inherit",
      });

      // Build for Windows
      spinner.text = "Building DepotDownloader for Windows...";
      console.log(
        chalk.dim(
          "\nRunning: dotnet publish DepotDownloader/DepotDownloaderMod.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true"
        )
      );
      execSync(
        "dotnet publish DepotDownloader/DepotDownloaderMod.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true",
        {
          cwd: tempDir,
          stdio: "inherit",
        }
      );

      // Build for Linux
      spinner.text = "Building DepotDownloader for Linux...";
      console.log(
        chalk.dim(
          "\nRunning: dotnet publish DepotDownloader/DepotDownloaderMod.csproj -c Release -r linux-x64 --self-contained true -p:PublishSingleFile=true"
        )
      );
      execSync(
        "dotnet publish DepotDownloader/DepotDownloaderMod.csproj -c Release -r linux-x64 --self-contained true -p:PublishSingleFile=true",
        {
          cwd: tempDir,
          stdio: "inherit",
        }
      );

      // Move binaries to the correct location
      spinner.text = "Installing DepotDownloader binaries...";
      console.log(chalk.dim("\nInstalling binaries to DepotDownloaderMod folder..."));
      await this.installDepotDownloaderBinaries(tempDir);

      // Clean up build artifacts
      spinner.text = "Cleaning up build artifacts...";
      console.log(chalk.dim(`\nCleaning up temp directory: ${tempDir}`));
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(chalk.dim("Temp directory removed"));
      spinner.succeed("DepotDownloader built and installed successfully");
    } catch (error) {
      spinner.fail("Failed to build DepotDownloader");

      // Provide more detailed error information
      if (error instanceof Error) {
        console.log(chalk.red(`\n❌ Build Error: ${error.message}`));

        // Check if it's a dotnet command issue
        if (error.message.includes("dotnet")) {
          console.log(chalk.yellow("\n💡 Troubleshooting tips:"));
          console.log(chalk.dim("1. Make sure .NET 9 SDK is properly installed"));
          console.log(chalk.dim("2. Try running 'dotnet --version' to verify installation"));
          console.log(chalk.dim("3. Restart your terminal/command prompt"));
          console.log(chalk.dim("4. Check if git is installed and available in PATH"));
        }
      }

      throw new Error(
        `DepotDownloader build failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async checkDotNetSDK(): Promise<void> {
    try {
      const output = execSync("dotnet --version", { encoding: "utf8" });
      const version = output.trim();
      const versionParts = version.split(".");
      const majorVersionStr = versionParts[0];
      const majorVersion = majorVersionStr ? parseInt(majorVersionStr) : 0;

      if (majorVersion < 6) {
        throw new Error("Requires .NET 6 or higher");
      }

      if (majorVersion < 9) {
        console.log(
          chalk.yellow(`⚠️  Found .NET ${version}. .NET 9 is recommended for best compatibility.`)
        );
      }
    } catch (error) {
      console.log(chalk.red("\n❌ .NET SDK not found!"));
      console.log(
        chalk.yellow(
          "Please install .NET SDK (version 6 or higher) from: https://dotnet.microsoft.com/download"
        )
      );
      console.log(chalk.dim("After installation, restart your terminal and run setup again."));

      const { installNow } = await inquirer.prompt([
        {
          type: "confirm",
          name: "installNow",
          message: "Would you like to open the .NET download page now?",
          default: true,
        },
      ]);

      if (installNow) {
        try {
          // Open URL using platform-specific command
          const command =
            process.platform === "win32"
              ? "start"
              : process.platform === "darwin"
                ? "open"
                : "xdg-open";
          execSync(`${command} https://dotnet.microsoft.com/download`, { stdio: "ignore" });
        } catch (openError) {
          console.log(
            chalk.dim("Could not open browser. Please visit: https://dotnet.microsoft.com/download")
          );
        }
      }

      throw new Error(".NET SDK is required to build DepotDownloader");
    }
  }

  private async modifyProjectFile(tempDir: string): Promise<void> {
    const projectPath = path.join(tempDir, "DepotDownloader", "DepotDownloaderMod.csproj");

    const projectContent = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net9.0</TargetFramework>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
    <RollForward>LatestMajor</RollForward>
    <Version>3.4.0</Version>
    <Description>Steam Downloading Utility</Description>
    <Authors>SteamRE Team</Authors>
    <Copyright>Copyright © SteamRE Team 2025</Copyright>
    <ApplicationIcon>..\\Icon\\DepotDownloader.ico</ApplicationIcon>
    <Deterministic>true</Deterministic>
    <TreatWarningsAsErrors Condition="'$(ContinuousIntegrationBuild)' == 'true'">true</TreatWarningsAsErrors>
    <InvariantGlobalization>true</InvariantGlobalization>

    <!-- Added for Linux self-contained build -->
    <PublishSingleFile>true</PublishSingleFile>
    <SelfContained>true</SelfContained>
    <RuntimeIdentifiers>linux-x64;win-x64</RuntimeIdentifiers>
    <PublishTrimmed>false</PublishTrimmed> <!-- keep false, SteamKit2 uses reflection -->
  </PropertyGroup>

  <ItemGroup>
    <None Include="..\\LICENSE" Link="LICENSE">
      <CopyToOutputDirectory>Always</CopyToOutputDirectory>
    </None>
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.Windows.CsWin32" Version="0.3.183">
      <PrivateAssets>all</PrivateAssets>
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
    </PackageReference>
    <PackageReference Include="protobuf-net" Version="3.2.52" />
    <PackageReference Include="QRCoder" Version="1.6.0" />
    <PackageReference Include="SteamKit2" Version="3.2.0" />
  </ItemGroup>
</Project>`;
    fs.writeFileSync(projectPath, projectContent, "utf8");
  }

  private async installDepotDownloaderBinaries(tempDir: string): Promise<void> {
    const targetDir = path.join(this.projectRoot, "DepotDownloaderMod");

    // Create target directory
    if (!fs.existsSync(targetDir)) {
      console.log(chalk.dim(`Creating target directory: ${targetDir}`));
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Define source paths
    const winSourceDir = path.join(
      tempDir,
      "DepotDownloader",
      "bin",
      "Release",
      "net9.0",
      "win-x64",
      "publish"
    );
    const linuxSourceDir = path.join(
      tempDir,
      "DepotDownloader",
      "bin",
      "Release",
      "net9.0",
      "linux-x64",
      "publish"
    );

    console.log(chalk.dim(`Windows source: ${winSourceDir}`));
    console.log(chalk.dim(`Linux source: ${linuxSourceDir}`));

    // Copy Windows binary
    if (fs.existsSync(winSourceDir)) {
      console.log(chalk.green("✓ Windows build found"));
      const winBinary = path.join(winSourceDir, "DepotDownloaderMod.exe");
      const winTarget = path.join(targetDir, "DepotDownloaderMod.exe");

      if (fs.existsSync(winBinary)) {
        console.log(chalk.dim(`Copying Windows binary: ${winBinary} -> ${winTarget}`));
        fs.copyFileSync(winBinary, winTarget);
      } else {
        console.log(chalk.yellow(`⚠️  Windows binary not found: ${winBinary}`));
      }

      // Copy Windows dependencies
      const winFiles = fs.readdirSync(winSourceDir);
      console.log(chalk.dim(`Found ${winFiles.length} files in Windows build directory`));
      for (const file of winFiles) {
        if (file.endsWith(".dll") || file.endsWith(".pdb") || file.endsWith(".json")) {
          const source = path.join(winSourceDir, file);
          const target = path.join(targetDir, file);
          console.log(chalk.dim(`Copying dependency: ${file}`));
          fs.copyFileSync(source, target);
        }
      }
    } else {
      console.log(chalk.red(`❌ Windows build directory not found: ${winSourceDir}`));
    }

    // Copy Linux binary
    if (fs.existsSync(linuxSourceDir)) {
      console.log(chalk.green("✓ Linux build found"));
      const linuxBinary = path.join(linuxSourceDir, "DepotDownloaderMod");
      const linuxTarget = path.join(targetDir, "DepotDownloaderMod");

      if (fs.existsSync(linuxBinary)) {
        console.log(chalk.dim(`Copying Linux binary: ${linuxBinary} -> ${linuxTarget}`));
        fs.copyFileSync(linuxBinary, linuxTarget);

        // Make Linux binary executable
        try {
          execSync(`chmod +x "${linuxTarget}"`);
          console.log(chalk.dim("Made Linux binary executable"));
        } catch (error) {
          console.log(chalk.dim("Could not set executable permissions (might be on Windows)"));
        }
      } else {
        console.log(chalk.yellow(`⚠️  Linux binary not found: ${linuxBinary}`));
      }
    } else {
      console.log(chalk.red(`❌ Linux build directory not found: ${linuxSourceDir}`));
    }

    // Copy LICENSE file
    const licenseSource = path.join(tempDir, "LICENSE");
    const licenseTarget = path.join(targetDir, "LICENSE");
    if (fs.existsSync(licenseSource)) {
      console.log(chalk.dim("Copying LICENSE file"));
      fs.copyFileSync(licenseSource, licenseTarget);
    }

    console.log(chalk.green("✓ Binary installation completed"));
  }

  private generateSecrets(): void {
    this.config.jwtSecret = crypto.randomBytes(32).toString("hex");
    this.config.apiKeySalt = crypto.randomBytes(32).toString("hex");
  }

  private async createEnvironmentFile(): Promise<void> {
    console.log(chalk.bold.blue("\n📝 Creating Environment File"));

    const spinner = ora("Generating .env file...").start();

    const envContent = `# WallWhale Configuration
# Generated by Setup Wizard on ${new Date().toISOString()}

# Environment
NODE_ENV=${this.config.environment}
APP_VERSION=1.0.0

# Server Configuration
PORT=${this.config.port}
HOST=${this.config.host}

# Database
DATABASE_URL=${this.config.database.url}

# Authentication
ADMIN_EMAIL=${this.config.admin.email}
ADMIN_PASSWORD=${this.config.admin.password}
JWT_SECRET=${this.config.jwtSecret}
API_KEY_SALT=${this.config.apiKeySalt}
ENCRYPTION_SECRET=${crypto.randomBytes(32).toString("hex")}

# Steam Configuration
# Steam accounts are loaded from accounts.safe file (encrypted)
# Use 'npm run accounts:help' for account management commands
${
  fs.existsSync(path.join(this.projectRoot, "accounts.safe"))
    ? "# STEAM_ACCOUNTS loaded from accounts.safe file"
    : `STEAM_ACCOUNTS=${this.config.steamAccounts}`
}

# File Storage
SAVE_ROOT=${this.config.saveRoot}
DEPOTDOWNLOADER_PATH=${this.config.depotDownloaderPath}

# TLS/SSL
TLS_ENABLE=${this.config.enableTLS}
TLS_CERT_PATH=./certs/cert.pem
TLS_KEY_PATH=./certs/key.pem

# Features
DOCS_ENABLED=${this.config.enableDocs}
ENABLE_METRICS=${this.config.enableMetrics}
ENABLE_HEALTH_CHECKS=true
AUTO_CLEANUP_ENABLED=true

# Security & Performance
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000
MAX_UPLOAD_SIZE=100MB
REQUEST_TIMEOUT=30000
GLOBAL_CONCURRENCY=3
PER_KEY_CONCURRENCY=1

# Logging
LOG_LEVEL=${this.config.environment === "development" ? "debug" : "info"}
LOG_FORMAT=${this.config.environment === "development" ? "pretty" : "json"}
`;

    const envPath = path.join(this.projectRoot, ".env");
    fs.writeFileSync(envPath, envContent, "utf8");

    spinner.succeed("Environment file created");
  }

  private async setupProject(): Promise<void> {
    console.log(chalk.bold.blue("\n🔧 Project Setup"));

    const spinner = ora("Setting up project...").start();

    try {
      // Create necessary directories
      const dirs = ["data", "downloads", "logs", "certs"];
      for (const dir of dirs) {
        const dirPath = path.join(this.projectRoot, dir);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
      }
      spinner.text = "Created directories";

      // Install dependencies if needed
      if (!fs.existsSync(path.join(this.projectRoot, "node_modules"))) {
        spinner.text = "Installing dependencies...";
        execSync("npm install", { cwd: this.projectRoot, stdio: "pipe" });
      }
      spinner.text = "Dependencies ready";

      // Generate Prisma client
      spinner.text = "Generating database client...";
      execSync("npx prisma generate", { cwd: this.projectRoot, stdio: "pipe" });

      // Initialize database schema
      spinner.text = "Initializing database schema...";
      try {
        if (this.config.database.type === "sqlite") {
          // For SQLite, use db push to create the schema
          execSync("npx prisma db push", { cwd: this.projectRoot, stdio: "pipe" });
          spinner.text = "SQLite database schema created";
        } else if (this.config.database.type === "postgresql") {
          // For PostgreSQL, try to use migrations first, fallback to db push
          try {
            execSync("npx prisma migrate deploy", { cwd: this.projectRoot, stdio: "pipe" });
            spinner.text = "PostgreSQL database migrated";
          } catch (migrateError) {
            // If migrations fail, try db push as fallback
            console.log(chalk.dim("\nMigrations not available, using db push..."));
            execSync("npx prisma db push", { cwd: this.projectRoot, stdio: "pipe" });
            spinner.text = "PostgreSQL database schema pushed";
          }
        }
      } catch (dbError) {
        spinner.warn("Database schema setup failed, but continuing...");
        console.log(chalk.yellow("\n⚠️  Database schema setup encountered an issue:"));
        console.log(
          chalk.gray("Error:"),
          dbError instanceof Error ? dbError.message : String(dbError)
        );
        console.log(chalk.gray("You may need to run database commands manually after setup:"));
        console.log(chalk.cyan("  npx prisma db push"));
        console.log(chalk.cyan("  npm run db:seed"));

        // For SQLite, try to at least create the database file directory
        if (this.config.database.type === "sqlite") {
          const dbDir = path.dirname(path.resolve(this.projectRoot, "data", "depot.db"));
          if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
          }
        }
      }

      // Test database connectivity before seeding
      spinner.text = "Testing database connectivity...";
      try {
        // Use a simple introspection command to test connectivity
        execSync("npx prisma db pull --print", {
          cwd: this.projectRoot,
          stdio: "pipe",
        });
        spinner.text = "Database connection verified";
      } catch (connectError) {
        spinner.warn("Database connectivity test inconclusive, proceeding with seeding...");
        console.log(chalk.yellow("\n⚠️  Could not verify database connectivity:"));
        console.log(chalk.gray("This may be normal for new databases. Proceeding with seeding..."));

        if (this.config.database.type === "postgresql") {
          console.log(chalk.cyan("\n💡 For PostgreSQL, ensure:"));
          console.log(chalk.dim("  • PostgreSQL server is running"));
          console.log(chalk.dim("  • Database exists and is accessible"));
          console.log(chalk.dim("  • Connection credentials are correct"));
        }
      }

      // Seed database with initial data
      spinner.text = "Seeding database with initial data...";
      try {
        const seedOutput = execSync("npm run db:seed", {
          cwd: this.projectRoot,
          encoding: "utf8",
        });

        spinner.text = "Database seeded successfully";

        // Show seeding results in a subtle way
        console.log(chalk.dim("\n📊 Database seeding completed:"));
        const seedLines = seedOutput
          .split("\n")
          .filter(
            (line) =>
              line.includes("Created") ||
              line.includes("Seeded") ||
              line.includes("Admin") ||
              line.includes("key:") ||
              line.includes("Loaded")
          );

        if (seedLines.length > 0) {
          seedLines.forEach((line) => {
            if (line.trim()) {
              console.log(chalk.dim(`  ${line.trim()}`));
            }
          });
        }
      } catch (seedError) {
        spinner.warn("Database seeding failed, but continuing...");
        console.log(chalk.yellow("\n⚠️  Database seeding encountered an issue:"));
        console.log(chalk.gray("You may need to run 'npm run db:seed' manually after setup."));
        console.log(
          chalk.gray("Error details:"),
          seedError instanceof Error ? seedError.message : String(seedError)
        );
        console.log(chalk.cyan("\n🔧 Manual seeding commands:"));
        console.log(chalk.dim("  npm run db:seed"));
        console.log(chalk.dim("  # or"));
        console.log(chalk.dim("  npx tsx prisma/seed.ts"));
      }

      // Create startup scripts
      this.createStartupScripts();
      spinner.text = "Created startup scripts";

      spinner.succeed("Project setup completed");
    } catch (error) {
      spinner.fail("Project setup failed");
      throw error;
    }
  }

  private createStartupScripts(): void {
    const scriptsDir = path.join(this.projectRoot, "scripts");
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }

    if (this.config.deployment === "local") {
      // Local development scripts
      const startScript =
        process.platform === "win32"
          ? "@echo off\necho Starting WallWhale...\nnpm run dev\npause\n"
          : '#!/bin/bash\necho "Starting WallWhale..."\nnpm run dev\n';

      const scriptFile = process.platform === "win32" ? "start.bat" : "start.sh";
      fs.writeFileSync(path.join(scriptsDir, scriptFile), startScript, "utf8");

      if (process.platform !== "win32") {
        try {
          execSync(`chmod +x ${path.join(scriptsDir, scriptFile)}`);
        } catch (error) {
          // Ignore chmod errors
        }
      }
    } else {
      // Docker scripts
      const dockerScript =
        process.platform === "win32"
          ? "@echo off\necho Starting with Docker...\ndocker build -t wallwhale-server .\ndocker run -d -p 3000:3000 --name wallwhale-server wallwhale-server\necho Server started at http://localhost:3000\npause\n"
          : '#!/bin/bash\necho "Starting with Docker..."\ndocker build -t wallwhale-server .\ndocker run -d -p 3000:3000 --name wallwhale-server wallwhale-server\necho "Server started at http://localhost:3000"\n';

      const scriptFile = process.platform === "win32" ? "start-docker.bat" : "start-docker.sh";
      fs.writeFileSync(path.join(scriptsDir, scriptFile), dockerScript, "utf8");

      if (process.platform !== "win32") {
        try {
          execSync(`chmod +x ${path.join(scriptsDir, scriptFile)}`);
        } catch (error) {
          // Ignore chmod errors
        }
      }
    }
  }

  private showCompletion(): void {
    console.log("\n");

    const isLocal = this.config.deployment === "local";
    const isDocker = this.config.deployment === "docker";
    const url = `http${this.config.enableTLS ? "s" : ""}://localhost:${this.config.port}`;

    let filesCreated = `${chalk.green("✓")} .env - Environment configuration
  ${chalk.green("✓")} scripts/ - Startup scripts
  ${chalk.green("✓")} data/ - Database initialized and seeded
  ${chalk.green("✓")} downloads/ - File storage`;

    // Add account files if they exist
    if (fs.existsSync(path.join(this.projectRoot, "accounts.safe"))) {
      filesCreated += `
  ${chalk.green("✓")} accounts.safe - Encrypted Steam accounts`;
    }
    if (fs.existsSync(path.join(this.projectRoot, "accounts.template"))) {
      filesCreated += `
  ${chalk.green("✓")} accounts.template - Account template for sharing`;
    }

    let quickStart = "";
    let nextSteps = `${chalk.cyan("•")} Start the server using the command above
  ${chalk.cyan("•")} Visit ${chalk.underline(url + "/docs")} for API documentation
  ${chalk.cyan("•")} Check ${chalk.underline(url + "/health")} for server status
  ${chalk.cyan("•")} Login with admin email: ${chalk.yellow(this.config.admin.email)}
  ${chalk.cyan("•")} Review the .env file if you need to make changes`;

    // Add account management info if accounts.safe exists
    if (fs.existsSync(path.join(this.projectRoot, "accounts.safe"))) {
      nextSteps += `
  ${chalk.cyan("•")} Use ${chalk.dim("npm run accounts:help")} for account management
  ${chalk.cyan("•")} Use ${chalk.dim("npm run accounts:decode")} to view/edit accounts
  ${chalk.cyan("•")} Use ${chalk.dim("npm run accounts:encode")} after editing accounts.template`;
    }

    // Add database management info
    nextSteps += `
  ${chalk.cyan("•")} Use ${chalk.dim("npm run db:studio")} to browse database contents
  ${chalk.cyan("•")} Use ${chalk.dim("npm run db:seed")} to re-seed database if needed`;

    if (isDocker) {
      filesCreated += `
  ${chalk.green("✓")} generated/ - Docker deployment files
  ${chalk.green("✓")} docker-compose.yml - Service orchestration
  ${chalk.green("✓")} Dockerfile - Container definition`;

      if (this.config.docker?.enableNginx) {
        filesCreated += `
  ${chalk.green("✓")} nginx.conf - Reverse proxy configuration`;
      }

      if (this.config.docker?.enablePrometheus) {
        filesCreated += `
  ${chalk.green("✓")} prometheus.yml - Metrics configuration`;
      }

      if (this.config.docker?.enableGrafana) {
        filesCreated += `
  ${chalk.green("✓")} grafana-datasources.yml - Dashboard configuration`;
      }

      quickStart = chalk.cyan(
        process.platform === "win32"
          ? "generated\\start-docker.bat"
          : "cd generated && ./start-docker.sh"
      );

      nextSteps = `${chalk.cyan("•")} Start the services using the command above
  ${chalk.cyan("•")} Visit ${chalk.underline(url)} for the application
  ${chalk.cyan("•")} Visit ${chalk.underline(url + "/docs")} for API documentation`;

      if (this.config.docker?.enableGrafana) {
        nextSteps += `
  ${chalk.cyan("•")} Visit ${chalk.underline("http://localhost:3001")} for Grafana (admin/admin)`;
      }

      if (this.config.docker?.enablePrometheus) {
        nextSteps += `
  ${chalk.cyan("•")} Visit ${chalk.underline("http://localhost:9090")} for Prometheus`;
      }

      nextSteps += `
  ${chalk.cyan("•")} Use ${chalk.dim("generated/logs-docker")} to view logs
  ${chalk.cyan("•")} Use ${chalk.dim("generated/stop-docker")} to stop services`;
    } else {
      quickStart = chalk.cyan("npm run dev");
    }

    const completionBox = boxen(
      `${chalk.bold.green("🎉 Setup Complete!")}

${chalk.bold("Configuration:")}
  ${chalk.cyan("•")} Deployment: ${chalk.yellow(this.config.deployment.toUpperCase())}
  ${chalk.cyan("•")} Environment: ${chalk.yellow(this.config.environment.toUpperCase())}
  ${chalk.cyan("•")} Database: ${chalk.yellow(this.config.database.type.toUpperCase())}
  ${chalk.cyan("•")} Server: ${chalk.cyan(url)}

${chalk.bold("📁 Files Created:")}
  ${filesCreated}

${chalk.bold("🚀 Quick Start:")}
  ${quickStart}

${chalk.bold("📚 Next Steps:")}
  ${nextSteps}

${chalk.dim("Your WallWhale is ready to use!")}`,
      {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "green",
        backgroundColor: "#001100",
      }
    );

    console.log(completionBox);
  }

  /**
   * Setup Docker-specific configuration options
   */
  private async setupDockerConfiguration(): Promise<void> {
    console.log(chalk.bold.blue("\n🐳 Docker Configuration"));

    const dockerConfig = await inquirer.prompt([
      {
        type: "confirm",
        name: "persistentVolumes",
        message: "Use persistent volumes for data storage?",
        default: true,
      },
      {
        type: "confirm",
        name: "useExternalDatabase",
        message: "Use external database service (PostgreSQL)?",
        default: this.config.database.type === "postgresql",
      },
      {
        type: "checkbox",
        name: "additionalServices",
        message: "Select additional services to include:",
        choices: [
          { name: "Redis (caching & sessions)", value: "redis" },
          { name: "Nginx (reverse proxy)", value: "nginx" },
          { name: "Prometheus (metrics)", value: "prometheus" },
          { name: "Grafana (monitoring dashboard)", value: "grafana" },
        ],
        default: ["redis"],
      },
      {
        type: "list",
        name: "networkMode",
        message: "Docker network mode:",
        choices: [
          { name: "Bridge (recommended)", value: "bridge" },
          { name: "Host (direct host networking)", value: "host" },
        ],
        default: "bridge",
      },
      {
        type: "input",
        name: "memoryLimit",
        message: "Memory limit for main container:",
        default: "1g",
        validate: (input) => {
          const regex = /^\d+[kmg]$/i;
          return regex.test(input) || "Please enter a valid memory size (e.g., 512m, 1g, 2g)";
        },
      },
      {
        type: "input",
        name: "cpuLimit",
        message: "CPU limit for main container:",
        default: "1.0",
        validate: (input) => {
          const num = parseFloat(input);
          return (
            (!isNaN(num) && num > 0 && num <= 16) || "Please enter a valid CPU limit (0.1 to 16.0)"
          );
        },
      },
      {
        type: "confirm",
        name: "autoRestart",
        message: "Enable automatic container restart on failure?",
        default: true,
      },
      {
        type: "list",
        name: "logDriver",
        message: "Logging driver:",
        choices: [
          { name: "JSON File (default)", value: "json-file" },
          { name: "Syslog", value: "syslog" },
          { name: "Journald", value: "journald" },
        ],
        default: "json-file",
      },
      {
        type: "input",
        name: "logMaxSize",
        message: "Maximum log file size:",
        default: "10m",
        validate: (input) => {
          const regex = /^\d+[kmg]$/i;
          return regex.test(input) || "Please enter a valid size (e.g., 10m, 100m, 1g)";
        },
      },
      {
        type: "input",
        name: "logMaxFiles",
        message: "Maximum number of log files to keep:",
        default: "3",
        validate: (input) => {
          const num = parseInt(input);
          return (!isNaN(num) && num > 0 && num <= 10) || "Please enter a number between 1 and 10";
        },
      },
    ]);

    // Process additional services
    const additionalServices = dockerConfig.additionalServices || [];

    this.config.docker = {
      persistentVolumes: dockerConfig.persistentVolumes,
      useExternalDatabase: dockerConfig.useExternalDatabase,
      databaseService: dockerConfig.useExternalDatabase ? "postgresql" : "none",
      enableNginx: additionalServices.includes("nginx"),
      enablePrometheus: additionalServices.includes("prometheus"),
      enableGrafana: additionalServices.includes("grafana"),
      enableRedis: additionalServices.includes("redis"),
      resourceLimits: {
        memory: dockerConfig.memoryLimit,
        cpus: dockerConfig.cpuLimit,
      },
      networkMode: dockerConfig.networkMode,
      exposeMetrics: additionalServices.includes("prometheus"),
      autoRestart: dockerConfig.autoRestart,
      logDriver: dockerConfig.logDriver,
      logMaxSize: dockerConfig.logMaxSize,
      logMaxFiles: parseInt(dockerConfig.logMaxFiles),
    };

    // Update database configuration if using external PostgreSQL
    if (this.config.docker.useExternalDatabase) {
      this.config.database = {
        type: "postgresql",
        url: "postgresql://depot:depot_password@postgres:5432/depotdownloader",
      };
    }
  }

  /**
   * Create Docker-related files in the generated directory
   */
  private async createDockerFiles(): Promise<void> {
    console.log(chalk.bold.blue("\n📦 Creating Docker Files"));

    const spinner = ora("Generating Docker configuration...").start();

    try {
      // Ensure generated directory exists
      if (!fs.existsSync(this.generatedDir)) {
        fs.mkdirSync(this.generatedDir, { recursive: true });
      }

      // Create docker-compose.yml
      await this.createDockerCompose();
      spinner.text = "Created docker-compose.yml";

      // Create Dockerfile if needed
      await this.createDockerfile();
      spinner.text = "Created Dockerfile";

      // Create nginx config if nginx is enabled
      if (this.config.docker?.enableNginx) {
        await this.createNginxConfig();
        spinner.text = "Created nginx configuration";
      }

      // Create prometheus config if enabled
      if (this.config.docker?.enablePrometheus) {
        await this.createPrometheusConfig();
        spinner.text = "Created prometheus configuration";
      }

      // Create grafana config if enabled
      if (this.config.docker?.enableGrafana) {
        await this.createGrafanaConfig();
        spinner.text = "Created grafana configuration";
      }

      // Create deployment scripts
      await this.createDockerScripts();
      spinner.text = "Created deployment scripts";

      spinner.succeed("Docker configuration files created");
    } catch (error) {
      spinner.fail("Failed to create Docker files");
      throw error;
    }
  }

  /**
   * Create docker-compose.yml file
   */
  private async createDockerCompose(): Promise<void> {
    const dockerConfig = this.config.docker!;
    const isProduction = this.config.environment === "production";

    let compose = `name: wallwhale-server

services:
  app:
    build:
      context: ..
      dockerfile: generated/Dockerfile
  container_name: wallwhale-server
    restart: ${dockerConfig.autoRestart ? "unless-stopped" : "no"}
    ports:
      - "${this.config.port}:3000"
    environment:
      - NODE_ENV=${this.config.environment}
      - PORT=3000
      - HOST=0.0.0.0
      - DATABASE_URL=${this.config.database.url}
      - ADMIN_EMAIL=${this.config.admin.email}
      - ADMIN_PASSWORD=${this.config.admin.password}
      - JWT_SECRET=${this.config.jwtSecret}
      - API_KEY_SALT=${this.config.apiKeySalt}
      - STEAM_ACCOUNTS=${this.config.steamAccounts}
      - SAVE_ROOT=/app/downloads
  - DEPOTDOWNLOADER_PATH=/app/DepotDownloaderMod/DepotDownloaderMod
      - TLS_ENABLE=${this.config.enableTLS}
      - DOCS_ENABLED=${this.config.enableDocs}
      - ENABLE_METRICS=${this.config.enableMetrics}
      - LOG_LEVEL=${isProduction ? "info" : "debug"}
      - LOG_FORMAT=${isProduction ? "json" : "pretty"}`;

    if (dockerConfig.enableRedis) {
      compose += `
      - REDIS_URL=redis://redis:6379`;
    }

    if (dockerConfig.persistentVolumes) {
      compose += `
    volumes:
      - wallwhale_downloads:/app/downloads
      - wallwhale_data:/app/data
      - wallwhale_logs:/app/logs
      - ./logs:/app/logs
      - ./logs/app:/var/log/app`;
    }

    compose += `
    networks:
      - depot-network
    deploy:
      resources:
        limits:
          memory: ${dockerConfig.resourceLimits.memory}
          cpus: '${dockerConfig.resourceLimits.cpus}'
    logging:
      driver: json-file
      options:
        max-size: ${dockerConfig.logMaxSize}
        max-file: '${dockerConfig.logMaxFiles}' 
        path: ./logs/app.log
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s`;

    // Add database service if using external PostgreSQL
    if (dockerConfig.useExternalDatabase && dockerConfig.databaseService === "postgresql") {
      compose += `
  postgres:
    image: postgres:15-alpine
    container_name: wallwhale-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=wallwhale
      - POSTGRES_USER=wallwhale
      - POSTGRES_PASSWORD=wallwhale_password
      - POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256
    volumes:
      - wallwhale_postgres_data:/var/lib/postgresql/data
    networks:
      - wallwhale-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U wallwhale -d wallwhale"]
      interval: 30s
      timeout: 10s
      retries: 3
`;
    }

    // Add Redis service if enabled
    if (dockerConfig.enableRedis) {
      compose += `
  redis:
    image: redis:7-alpine
    container_name: wallwhale-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - wallwhale_redis_data:/data
    networks:
      - wallwhale-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
`;
    }

    // Add Nginx service if enabled
    if (dockerConfig.enableNginx) {
      compose += `
  nginx:
    image: nginx:alpine
    container_name: wallwhale-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - wallwhale_nginx_logs:/var/log/nginx
    depends_on:
      - app
    networks:
      - wallwhale-network
`;
    }

    // Add Prometheus service if enabled
    if (dockerConfig.enablePrometheus) {
      compose += `
  prometheus:
    image: prom/prometheus:latest
    container_name: wallwhale-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - wallwhale_prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - wallwhale-network
`;
    }

    // Add Grafana service if enabled
    if (dockerConfig.enableGrafana) {
      compose += `
  grafana:
    image: grafana/grafana:latest
    container_name: wallwhale-grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - wallwhale_grafana_data:/var/lib/grafana
      - ./grafana-datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml:ro
    depends_on:
      - prometheus
    networks:
      - wallwhale-network
`;
    }

    // Add networks section
    compose += `
networks:
  wallwhale-network:
    driver: bridge
`;

    // Add volumes section if persistent volumes are enabled
    if (dockerConfig.persistentVolumes) {
      compose += `
volumes:
  wallwhale_downloads:
  wallwhale_data:
  wallwhale_logs:`;

      if (dockerConfig.useExternalDatabase) {
        compose += `
  wallwhale_postgres_data:`;
      }

      if (dockerConfig.enableRedis) {
        compose += `
  wallwhale_redis_data:`;
      }

      if (dockerConfig.enableNginx) {
        compose += `
  wallwhale_nginx_logs:`;
      }

      if (dockerConfig.enablePrometheus) {
        compose += `
  wallwhale_prometheus_data:`;
      }

      if (dockerConfig.enableGrafana) {
        compose += `
  wallwhale_grafana_data:`;
      }
    }

    fs.writeFileSync(path.join(this.generatedDir, "docker-compose.yml"), compose, "utf8");
  }

  /**
   * Create optimized Dockerfile for production
   */
  private async createDockerfile(): Promise<void> {
    const dockerfile = `# Multi-stage Dockerfile for WallWhale
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    && ln -sf python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY prisma/ ./prisma/

# Build the application
RUN npm run build:prod

# Install only production dependencies for runtime
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS runtime

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodeuser -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodeuser:nodejs /app/dist ./dist
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodejs /app/package.json ./package.json

# Copy Prisma schema and generate client
COPY --chown=nodeuser:nodejs prisma/ ./prisma/
RUN npx prisma generate

# Copy DepotDownloader binaries
COPY --chown=nodeuser:nodejs DepotDownloaderMod/ ./DepotDownloaderMod/
RUN chmod +x ./DepotDownloaderMod/DepotDownloaderMod

# Create necessary directories
RUN mkdir -p data downloads logs certs \
    && chown -R nodeuser:nodejs data downloads logs certs

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]
`;

    fs.writeFileSync(path.join(this.generatedDir, "Dockerfile"), dockerfile, "utf8");
  }

  /**
   * Create nginx configuration file
   */
  private async createNginxConfig(): Promise<void> {
    const nginxConfig = `events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $$host;
            proxy_set_header X-Real-IP $$remote_addr;
            proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $$scheme;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $$http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        location /health {
            proxy_pass http://app/health;
            access_log off;
        }
    }
}`;

    fs.writeFileSync(path.join(this.generatedDir, "nginx.conf"), nginxConfig, "utf8");
  }

  /**
   * Create prometheus configuration file
   */
  private async createPrometheusConfig(): Promise<void> {
    const prometheusConfig = `global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'depot-downloader-server'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
`;

    fs.writeFileSync(path.join(this.generatedDir, "prometheus.yml"), prometheusConfig, "utf8");
  }

  /**
   * Create grafana datasource configuration
   */
  private async createGrafanaConfig(): Promise<void> {
    const grafanaConfig = `apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
`;

    fs.writeFileSync(
      path.join(this.generatedDir, "grafana-datasources.yml"),
      grafanaConfig,
      "utf8"
    );
  }

  /**
   * Create Docker deployment scripts
   */
  private async createDockerScripts(): Promise<void> {
    // Create start script with enhanced logging
    const startScript =
      process.platform === "win32"
        ? `@echo off
echo ======================================
echo  WallWhale - Docker Start
echo ======================================
echo.

echo [%time%] Checking Docker status...
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo [%time%] Docker is running ✓

echo [%time%] Navigating to deployment directory...
cd /d "%~dp0"

echo [%time%] Checking docker-compose.yml...
if not exist "docker-compose.yml" (
    echo [ERROR] docker-compose.yml not found!
    echo Please run the setup wizard first.
    pause
    exit /b 1
)
echo [%time%] Configuration file found ✓

echo [%time%] Pulling latest images...
docker-compose pull

echo [%time%] Building and starting services...
docker-compose up -d --build

echo [%time%] Waiting for services to initialize...
timeout /t 5 /nobreak >nul

echo [%time%] Checking service status...
docker-compose ps

echo.
echo ======================================
echo        🎉 Services Started!
echo ======================================
echo.
echo Application URLs:
echo   📱 Main App: http://localhost:${this.config.port}
echo   📚 API Docs: http://localhost:${this.config.port}/docs
echo   ❤️  Health:  http://localhost:${this.config.port}/health
${this.config.docker?.enableGrafana ? `echo   📊 Grafana:  http://localhost:3001 (admin/admin)` : ""}
${this.config.docker?.enablePrometheus ? `echo   📈 Prometheus: http://localhost:9090` : ""}
echo.
echo Management:
echo   📋 View logs:    docker-compose logs -f
echo   ⏹️  Stop:        docker-compose down
echo   🔄 Restart:     docker-compose restart
echo   📊 Status:      docker-compose ps
echo.
pause
`
        : `#!/bin/bash

echo "======================================"
echo " WallWhale - Docker Start"
echo "======================================"
echo

echo "[$(date '+%H:%M:%S')] Checking Docker status..."
if ! docker info >/dev/null 2>&1; then
    echo "[ERROR] Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi
echo "[$(date '+%H:%M:%S')] Docker is running ✓"

echo "[$(date '+%H:%M:%S')] Navigating to deployment directory..."
cd "$(dirname "$0")"

echo "[$(date '+%H:%M:%S')] Checking docker-compose.yml..."
if [ ! -f "docker-compose.yml" ]; then
    echo "[ERROR] docker-compose.yml not found!"
    echo "Please run the setup wizard first."
    exit 1
fi
echo "[$(date '+%H:%M:%S')] Configuration file found ✓"

echo "[$(date '+%H:%M:%S')] Pulling latest images..."
docker-compose pull

echo "[$(date '+%H:%M:%S')] Building and starting services..."
docker-compose up -d --build

echo "[$(date '+%H:%M:%S')] Waiting for services to initialize..."
sleep 5

echo "[$(date '+%H:%M:%S')] Checking service status..."
docker-compose ps

echo
echo "======================================"
echo "        🎉 Services Started!"
echo "======================================"
echo
echo "Application URLs:"
echo "  📱 Main App: http://localhost:${this.config.port}"
echo "  📚 API Docs: http://localhost:${this.config.port}/docs"
echo "  ❤️  Health:  http://localhost:${this.config.port}/health"
${this.config.docker?.enableGrafana ? `echo "  📊 Grafana:  http://localhost:3001 (admin/admin)"` : ""}
${this.config.docker?.enablePrometheus ? `echo "  📈 Prometheus: http://localhost:9090"` : ""}
echo
echo "Management:"
echo "  📋 View logs:    docker-compose logs -f"
echo "  ⏹️  Stop:        docker-compose down"
echo "  🔄 Restart:     docker-compose restart"
echo "  📊 Status:      docker-compose ps"
echo
`;

    const startFile = process.platform === "win32" ? "start-docker.bat" : "start-docker.sh";
    fs.writeFileSync(path.join(this.generatedDir, startFile), startScript, "utf8");

    // Create stop script with logging
    const stopScript =
      process.platform === "win32"
        ? `@echo off
echo ======================================
echo  WallWhale - Docker Stop
echo ======================================
echo.

echo [%time%] Navigating to deployment directory...
cd /d "%~dp0"

echo [%time%] Stopping services...
docker-compose down

echo [%time%] Checking remaining containers...
docker-compose ps

echo.
echo ======================================
echo       🛑 Services Stopped!
echo ======================================
echo.
pause
`
        : `#!/bin/bash

echo "======================================"
echo " WallWhale - Docker Stop"
echo "======================================"
echo

echo "[$(date '+%H:%M:%S')] Navigating to deployment directory..."
cd "$(dirname "$0")"

echo "[$(date '+%H:%M:%S')] Stopping services..."
docker-compose down

echo "[$(date '+%H:%M:%S')] Checking remaining containers..."
docker-compose ps

echo
echo "======================================"
echo "       🛑 Services Stopped!"
echo "======================================"
echo
`;

    const stopFile = process.platform === "win32" ? "stop-docker.bat" : "stop-docker.sh";
    fs.writeFileSync(path.join(this.generatedDir, stopFile), stopScript, "utf8");

    // Create logs script
    const logsScript =
      process.platform === "win32"
        ? `@echo off
echo ======================================
echo WallWhale - Docker Logs
echo ======================================
echo.

cd /d "%~dp0"

echo Showing real-time logs (Ctrl+C to exit)...
echo.
docker-compose logs -f
`
        : `#!/bin/bash

echo "======================================"
echo "WallWhale - Docker Logs"
echo "======================================"
echo

cd "$(dirname "$0")"

echo "Showing real-time logs (Ctrl+C to exit)..."
echo
docker-compose logs -f
`;

    const logsFile = process.platform === "win32" ? "logs-docker.bat" : "logs-docker.sh";
    fs.writeFileSync(path.join(this.generatedDir, logsFile), logsScript, "utf8");

    // Create status script
    const statusScript =
      process.platform === "win32"
        ? `@echo off
echo ======================================
echo WallWhale - Docker Status
echo ======================================
echo.

cd /d "%~dp0"

echo Container Status:
docker-compose ps

echo.
echo Resource Usage:
docker stats --no-stream

echo.
echo Recent Logs:
docker-compose logs --tail=20

pause
`
        : `#!/bin/bash

echo "======================================"
echo "WallWhale - Docker Status"
echo "======================================"
echo

cd "$(dirname "$0")"

echo "Container Status:"
docker-compose ps

echo
echo "Resource Usage:"
docker stats --no-stream

echo
echo "Recent Logs:"
docker-compose logs --tail=20
`;

    const statusFile = process.platform === "win32" ? "status-docker.bat" : "status-docker.sh";
    fs.writeFileSync(path.join(this.generatedDir, statusFile), statusScript, "utf8");

    // Make scripts executable on Unix systems
    if (process.platform !== "win32") {
      try {
        execSync(`chmod +x ${path.join(this.generatedDir, startFile)}`);
        execSync(`chmod +x ${path.join(this.generatedDir, stopFile)}`);
        execSync(`chmod +x ${path.join(this.generatedDir, logsFile)}`);
        execSync(`chmod +x ${path.join(this.generatedDir, statusFile)}`);
      } catch (error) {
        // Ignore chmod errors
      }
    }

    // Create README for Docker deployment
    const readmeContent = `# Docker Deployment Guide

This directory contains all the files needed to deploy WallWhale using Docker.

## 🚀 Quick Start

### Windows
1. **Start Services**: Double-click \`start-docker.bat\`
2. **View Logs**: Double-click \`logs-docker.bat\`
3. **Check Status**: Double-click \`status-docker.bat\`
4. **Stop Services**: Double-click \`stop-docker.bat\`

### Linux/macOS
1. **Start Services**: \`./start-docker.sh\`
2. **View Logs**: \`./logs-docker.sh\`
3. **Check Status**: \`./status-docker.sh\`
4. **Stop Services**: \`./stop-docker.sh\`

## 🌐 Service URLs

- **Main Application**: http://localhost:${this.config.port}
- **API Documentation**: http://localhost:${this.config.port}/docs
- **Health Check**: http://localhost:${this.config.port}/health
${this.config.docker?.enableGrafana ? `- **Grafana Dashboard**: http://localhost:3001 (admin/admin)` : ""}
${this.config.docker?.enablePrometheus ? `- **Prometheus Metrics**: http://localhost:9090` : ""}

## 🛠️ Manual Commands

\`\`\`bash
# Build and start all services
docker-compose up -d --build

# View real-time logs
docker-compose logs -f

# Check container status
docker-compose ps

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart app

# View resource usage
docker stats

# Remove all data (⚠️ DATA LOSS!)
docker-compose down -v
\`\`\`

## 🔧 Troubleshooting

### Services won't start
1. Check Docker Desktop is running
2. Verify available disk space and memory
3. Check for port conflicts: \`netstat -an | findstr ${this.config.port}\`
4. Review logs: \`docker-compose logs\`

### Application not responding
1. Check container health: \`docker-compose ps\`
2. View application logs: \`docker-compose logs app\`
3. Restart services: \`docker-compose restart\`

### Database issues
1. Check database logs: \`docker-compose logs postgres\` (if using PostgreSQL)
2. Verify database is healthy: \`docker-compose exec postgres pg_isready\`

## 📁 File Structure

- \`docker-compose.yml\` - Service orchestration
- \`Dockerfile\` - Application container definition
- \`nginx.conf\` - Reverse proxy configuration (if enabled)
- \`prometheus.yml\` - Metrics configuration (if enabled)
- \`grafana-datasources.yml\` - Dashboard configuration (if enabled)

## 🔄 Updates

To update the application:
1. Pull latest code
2. Rebuild containers: \`docker-compose up -d --build\`
3. Check status: \`docker-compose ps\`

## 📊 Monitoring

${this.config.docker?.enablePrometheus ? `- **Prometheus**: Metrics collection at http://localhost:9090` : ""}
${this.config.docker?.enableGrafana ? `- **Grafana**: Dashboards at http://localhost:3001` : ""}
- **Docker Stats**: \`docker stats\` for real-time resource usage
- **Health Checks**: Built-in container health monitoring

## 💾 Data Persistence

${this.config.docker?.persistentVolumes ? `Data is stored in Docker volumes for persistence across container restarts.` : `Data is ephemeral and will be lost when containers are removed.`}

${
  this.config.docker?.persistentVolumes
    ? `
### Volume Management
- View volumes: \`docker volume ls\`
- Backup data: \`docker run --rm -v depot_downloads:/data -v \$(pwd):/backup alpine tar czf /backup/downloads-backup.tar.gz -C /data .\`
- Restore data: \`docker run --rm -v depot_downloads:/data -v \$(pwd):/backup alpine tar xzf /backup/downloads-backup.tar.gz -C /data\`
`
    : ""
}

For more information, visit the main project documentation.
`;

    fs.writeFileSync(path.join(this.generatedDir, "README.md"), readmeContent, "utf8");
  }

  /**
   * Check if Docker is available and running, then deploy
   */
  private async checkDockerAndDeploy(): Promise<void> {
    console.log(chalk.bold.blue("\n🚀 Docker Deployment"));

    const spinner = ora("Checking Docker availability...").start();

    try {
      // Check if Docker is installed
      try {
        execSync("docker --version", { stdio: "pipe" });
        spinner.text = "Docker installation found";
      } catch (error) {
        spinner.fail("Docker not installed");
        console.log(chalk.red("\n❌ Docker is not installed on this system"));
        console.log(chalk.yellow("Please install Docker Desktop:"));
        console.log(chalk.cyan("  • Windows: https://docs.docker.com/desktop/windows/"));
        console.log(chalk.cyan("  • macOS: https://docs.docker.com/desktop/mac/"));
        console.log(chalk.cyan("  • Linux: https://docs.docker.com/engine/install/"));

        const { openDownloadPage } = await inquirer.prompt([
          {
            type: "confirm",
            name: "openDownloadPage",
            message: "Would you like to open the Docker download page?",
            default: true,
          },
        ]);

        if (openDownloadPage) {
          const { exec } = await import("child_process");
          const platform = process.platform;
          const url =
            platform === "win32"
              ? "https://docs.docker.com/desktop/windows/"
              : platform === "darwin"
                ? "https://docs.docker.com/desktop/mac/"
                : "https://docs.docker.com/engine/install/";

          if (platform === "win32") {
            exec(`start ${url}`);
          } else if (platform === "darwin") {
            exec(`open ${url}`);
          } else {
            exec(`xdg-open ${url}`);
          }
        }

        const { continueWithoutDocker } = await inquirer.prompt([
          {
            type: "confirm",
            name: "continueWithoutDocker",
            message: "Continue setup without Docker deployment?",
            default: true,
          },
        ]);

        if (!continueWithoutDocker) {
          throw new Error("Docker installation is required for Docker deployment");
        }
        return;
      }

      // Check if Docker daemon is running
      spinner.text = "Checking Docker daemon status...";
      try {
        execSync("docker info", { stdio: "pipe" });
        spinner.text = "Docker daemon is running";
      } catch (error) {
        spinner.warn("Docker daemon is not running");

        console.log(chalk.yellow("\n⚠️  Docker is installed but not running"));
        console.log(chalk.dim("Docker Desktop needs to be started to continue."));

        const { startDocker } = await inquirer.prompt([
          {
            type: "confirm",
            name: "startDocker",
            message: "Would you like to start Docker Desktop?",
            default: true,
          },
        ]);

        if (startDocker) {
          console.log(chalk.cyan("🚀 Starting Docker Desktop..."));
          const startSpinner = ora("Starting Docker Desktop").start();

          try {
            const platform = process.platform;
            if (platform === "win32") {
              // Start Docker Desktop on Windows
              execSync('start "" "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"', {
                stdio: "pipe",
              });
            } else if (platform === "darwin") {
              // Start Docker Desktop on macOS
              execSync("open -a Docker", { stdio: "pipe" });
            } else {
              // On Linux, try to start the Docker service
              try {
                execSync("sudo systemctl start docker", { stdio: "pipe" });
              } catch {
                execSync("sudo service docker start", { stdio: "pipe" });
              }
            }

            startSpinner.text = "Waiting for Docker to initialize...";

            // Wait for Docker to start (up to 2 minutes)
            let attempts = 0;
            const maxAttempts = 60; // 2 minutes with 2-second intervals

            while (attempts < maxAttempts) {
              try {
                execSync("docker info", { stdio: "pipe" });
                startSpinner.succeed("Docker Desktop started successfully");
                break;
              } catch {
                attempts++;
                if (attempts >= maxAttempts) {
                  startSpinner.fail("Docker startup timeout");
                  console.log(chalk.red("❌ Docker failed to start within 2 minutes"));
                  console.log(
                    chalk.yellow("Please start Docker Desktop manually and run the setup again")
                  );
                  return;
                }
                await new Promise((resolve) => setTimeout(resolve, 2000));

                // Update spinner text with progress
                const progress = Math.round((attempts / maxAttempts) * 100);
                startSpinner.text = `Waiting for Docker to initialize... ${progress}%`;
              }
            }
          } catch (error) {
            startSpinner.fail("Failed to start Docker");
            console.log(chalk.red("❌ Could not start Docker automatically"));
            console.log(chalk.yellow("Please start Docker Desktop manually:"));

            const platform = process.platform;
            if (platform === "win32") {
              console.log(chalk.cyan("  • Open Docker Desktop from Start menu or desktop"));
            } else if (platform === "darwin") {
              console.log(chalk.cyan("  • Open Docker Desktop from Applications folder"));
            } else {
              console.log(chalk.cyan("  • Run: sudo systemctl start docker"));
            }

            const { retryAfterManualStart } = await inquirer.prompt([
              {
                type: "confirm",
                name: "retryAfterManualStart",
                message: "Retry Docker check after manual startup?",
                default: true,
              },
            ]);

            if (retryAfterManualStart) {
              // Recursive call to re-check Docker
              return await this.checkDockerAndDeploy();
            } else {
              console.log(chalk.blue("ℹ️  You can run Docker deployment later using:"));
              console.log(chalk.cyan("  npm run setup -- --docker-only"));
              return;
            }
          }
        } else {
          console.log(
            chalk.blue("ℹ️  You can start Docker Desktop manually and run the deployment later")
          );
          console.log(chalk.cyan("  npm run setup -- --docker-only"));
          return;
        }
      }

      // Check if Docker Compose is available
      spinner.text = "Checking Docker Compose availability...";
      try {
        execSync("docker-compose --version", { stdio: "pipe" });
        spinner.text = "Docker Compose found (legacy)";
      } catch {
        try {
          execSync("docker compose version", { stdio: "pipe" });
          spinner.text = "Docker Compose found (plugin)";
        } catch {
          spinner.fail("Docker Compose not found");
          console.log(chalk.red("\n❌ Docker Compose is not available"));
          console.log(chalk.yellow("Docker Compose is required for multi-container deployment"));
          console.log(chalk.cyan("Most Docker Desktop installations include Docker Compose"));
          console.log(chalk.cyan("If using Docker Engine only, install docker-compose separately"));
          return;
        }
      }

      spinner.succeed("Docker and Docker Compose are ready");

      // Ask if user wants to deploy immediately
      const { deployNow } = await inquirer.prompt([
        {
          type: "confirm",
          name: "deployNow",
          message: "Deploy the Docker containers now?",
          default: true,
        },
      ]);

      if (deployNow) {
        await this.deployDockerServices();
      } else {
        console.log(
          chalk.blue("ℹ️  You can deploy later using the scripts in the generated/ directory")
        );
        console.log(chalk.cyan("  Windows: generated\\start-docker.bat"));
        console.log(chalk.cyan("  Linux/Mac: generated/start-docker.sh"));
      }
    } catch (error) {
      spinner.fail("Docker check failed");
      console.error(chalk.red("❌ Unexpected error during Docker check:"), error);

      const { continueWithoutDocker } = await inquirer.prompt([
        {
          type: "confirm",
          name: "continueWithoutDocker",
          message: "Continue setup without Docker deployment?",
          default: true,
        },
      ]);

      if (!continueWithoutDocker) {
        throw new Error("Docker check failed");
      }
    }
  }

  /**
   * Deploy Docker services
   */
  private async deployDockerServices(): Promise<void> {
    const spinner = ora("Deploying Docker services...").start();

    try {
      const generatedPath = this.generatedDir;
      const logsDir = path.join(generatedPath, "docker-logs");

      // Ensure logs directory exists
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      // Create log files with timestamps
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const pullLogFile = path.join(logsDir, `pull-${timestamp}.log`);
      const buildLogFile = path.join(logsDir, `build-${timestamp}.log`);
      const startLogFile = path.join(logsDir, `start-${timestamp}.log`);
      const statusLogFile = path.join(logsDir, `status-${timestamp}.log`);

      // Check if docker-compose.yml exists
      const composeFile = path.join(generatedPath, "docker-compose.yml");
      if (!fs.existsSync(composeFile)) {
        spinner.fail("Docker compose file not found");
        throw new Error(`docker-compose.yml not found at ${composeFile}`);
      }

      // Pull latest base images first
      spinner.text = "Pulling latest base images...";
      try {
        const pullOutput = execSync("docker-compose pull", {
          cwd: generatedPath,
          encoding: "utf8",
        });

        // Save pull output to log file
        fs.writeFileSync(
          pullLogFile,
          `Docker Pull Log - ${new Date().toISOString()}\n${"=".repeat(50)}\n${pullOutput}`,
          "utf8"
        );

        spinner.text = "Base images updated (logged to docker-logs/)";
      } catch (pullError) {
        // Save pull error to log file
        const errorMsg = `Docker Pull Error - ${new Date().toISOString()}\n${"=".repeat(50)}\n${pullError}\n`;
        fs.writeFileSync(pullLogFile, errorMsg, "utf8");

        // Continue if pull fails - images might already exist locally
        spinner.text = "Using existing images (pull failed - check docker-logs/)";
      }

      // Build custom images
      spinner.text = "Building application images...";
      try {
        const buildOutput = execSync("docker-compose build --no-cache", {
          cwd: generatedPath,
          encoding: "utf8",
        });

        // Save build output to log file
        fs.writeFileSync(
          buildLogFile,
          `Docker Build Log - ${new Date().toISOString()}\n${"=".repeat(50)}\n${buildOutput}`,
          "utf8"
        );

        console.log(
          chalk.dim(
            `\n📦 Build completed - logs saved to: ${path.relative(this.projectRoot, buildLogFile)}`
          )
        );

        spinner.text = "Images built successfully (logged to docker-logs/)";
      } catch (buildError) {
        // Save build error to log file
        const errorMsg = `Docker Build Error - ${new Date().toISOString()}\n${"=".repeat(50)}\n${buildError}\n`;
        fs.writeFileSync(buildLogFile, errorMsg, "utf8");

        spinner.fail("Image build failed (check docker-logs/)");
        console.log(chalk.red("\n❌ Docker build failed"));
        console.log(
          chalk.yellow(`Build error logged to: ${path.relative(this.projectRoot, buildLogFile)}`)
        );
        throw buildError;
      }

      // Start services
      spinner.text = "Starting Docker services...";
      try {
        const startOutput = execSync("docker-compose up -d", {
          cwd: generatedPath,
          encoding: "utf8",
        });

        // Save start output to log file
        fs.writeFileSync(
          startLogFile,
          `Docker Start Log - ${new Date().toISOString()}\n${"=".repeat(50)}\n${startOutput}`,
          "utf8"
        );

        console.log(
          chalk.dim(
            `\n🚀 Service startup logged to: ${path.relative(this.projectRoot, startLogFile)}`
          )
        );
      } catch (startError) {
        // Save start error to log file
        const errorMsg = `Docker Start Error - ${new Date().toISOString()}\n${"=".repeat(50)}\n${startError}\n`;
        fs.writeFileSync(startLogFile, errorMsg, "utf8");

        spinner.fail("Service startup failed (check docker-logs/)");
        console.log(chalk.red("\n❌ Failed to start services"));
        console.log(
          chalk.yellow(`Startup error logged to: ${path.relative(this.projectRoot, startLogFile)}`)
        );
        throw startError;
      }

      // Wait for services to initialize
      spinner.text = "Waiting for services to initialize...";
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Check container status
      spinner.text = "Checking container status...";
      try {
        const statusOutput = execSync("docker-compose ps", {
          cwd: generatedPath,
          encoding: "utf8",
        });

        // Save status output to log file
        fs.writeFileSync(
          statusLogFile,
          `Docker Status Log - ${new Date().toISOString()}\n${"=".repeat(50)}\n${statusOutput}`,
          "utf8"
        );

        console.log(
          chalk.dim(
            `\n📊 Container status logged to: ${path.relative(this.projectRoot, statusLogFile)}`
          )
        );
      } catch (statusError) {
        console.log(chalk.yellow("⚠️  Could not retrieve container status"));
        const errorMsg = `Docker Status Error - ${new Date().toISOString()}\n${"=".repeat(50)}\n${statusError}\n`;
        fs.writeFileSync(statusLogFile, errorMsg, "utf8");
      }

      // Check if main service is healthy
      spinner.text = "Performing health checks...";
      let attempts = 0;
      const maxAttempts = 30;
      let healthCheckPassed = false;

      while (attempts < maxAttempts) {
        try {
          // Try to check health endpoint
          const { exec } = await import("child_process");
          const { promisify } = await import("util");
          const execAsync = promisify(exec);

          await execAsync(`curl -f http://localhost:${this.config.port}/health`);
          healthCheckPassed = true;
          break;
        } catch {
          attempts++;
          if (attempts >= maxAttempts) {
            console.log(chalk.yellow("\n⚠️  Service health check timeout"));
            console.log(chalk.dim("Services may still be starting up. Check status with:"));
            console.log(chalk.cyan(`  cd ${generatedPath}`));
            console.log(chalk.cyan("  docker-compose ps"));
            console.log(chalk.cyan("  docker-compose logs"));
            console.log(
              chalk.cyan(`  📋 All logs saved to: ${path.relative(this.projectRoot, logsDir)}/`)
            );
            break;
          }

          // Update progress
          const progress = Math.round((attempts / maxAttempts) * 100);
          spinner.text = `Health check in progress... ${progress}% (${attempts}/${maxAttempts})`;

          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      if (healthCheckPassed) {
        spinner.succeed("Docker services deployed and healthy");
      } else {
        spinner.warn("Docker services deployed (health check pending)");
      }

      // Show detailed service information
      console.log(chalk.green("\n🎉 Deployment Summary"));
      console.log(chalk.cyan("─".repeat(50)));

      // Main application
      console.log(chalk.bold("🏠 Main Application"));
      console.log(chalk.cyan(`   📱 URL: http://localhost:${this.config.port}`));
      console.log(chalk.cyan(`   📚 API Docs: http://localhost:${this.config.port}/docs`));
      console.log(chalk.cyan(`   ❤️  Health: http://localhost:${this.config.port}/health`));

      // Show log directory info
      console.log(chalk.bold("\n📋 Docker Logs"));
      console.log(chalk.cyan(`   📁 Location: ${path.relative(this.projectRoot, logsDir)}/`));
      console.log(chalk.cyan(`   🔄 Pull: ${path.basename(pullLogFile)}`));
      console.log(chalk.cyan(`   🔨 Build: ${path.basename(buildLogFile)}`));
      console.log(chalk.cyan(`   🚀 Start: ${path.basename(startLogFile)}`));
      console.log(chalk.cyan(`   📊 Status: ${path.basename(statusLogFile)}`));

      // Additional services
      if (this.config.docker?.enableGrafana) {
        console.log(chalk.bold("\n📊 Monitoring"));
        console.log(chalk.cyan("   � Grafana: http://localhost:3001 (admin/admin)"));
      }

      if (this.config.docker?.enablePrometheus) {
        console.log(chalk.cyan("   � Prometheus: http://localhost:9090"));
      }

      if (this.config.docker?.enableRedis) {
        console.log(chalk.bold("\n💾 Cache"));
        console.log(chalk.cyan("   🔴 Redis: localhost:6379"));
      }

      if (this.config.docker?.useExternalDatabase) {
        console.log(chalk.bold("\n🗄️  Database"));
        console.log(chalk.cyan("   🐘 PostgreSQL: localhost:5432"));
      }

      // Management commands
      console.log(chalk.bold("\n🛠️  Management Commands"));
      console.log(chalk.cyan(`   📋 View logs: cd ${generatedPath} && docker-compose logs -f`));
      console.log(chalk.cyan(`   ⏹️  Stop: cd ${generatedPath} && docker-compose down`));
      console.log(chalk.cyan(`   🔄 Restart: cd ${generatedPath} && docker-compose restart`));
      console.log(chalk.cyan(`   📊 Status: cd ${generatedPath} && docker-compose ps`));
    } catch (error) {
      spinner.fail("Docker deployment failed");

      console.log(chalk.red("\n❌ Deployment Error Details"));
      console.log(chalk.yellow("Error:"), error);
      console.log(chalk.yellow("\n🔧 Troubleshooting Steps:"));
      console.log(chalk.cyan("1. Check if Docker Desktop is running"));
      console.log(chalk.cyan("2. Verify Docker has sufficient resources (memory/disk)"));
      console.log(chalk.cyan("3. Try manual deployment:"));
      console.log(chalk.cyan(`   cd ${this.generatedDir}`));
      console.log(chalk.cyan("   docker-compose up -d --build"));
      console.log(chalk.cyan("4. View detailed logs:"));
      console.log(chalk.cyan("   docker-compose logs"));

      throw error;
    }
  }

  /**
   * Run Docker-only setup (skip environment configuration)
   */
  async runDockerOnlySetup(): Promise<void> {
    try {
      console.log(chalk.cyan("🐳 Docker-Only Setup"));
      console.log(
        chalk.dim(
          "This will create Docker deployment files without changing your current configuration.\n"
        )
      );

      // Check if .env exists
      const envPath = path.join(this.projectRoot, ".env");
      if (!fs.existsSync(envPath)) {
        console.log(
          chalk.red("❌ No .env file found. Please run the full setup first or create a .env file.")
        );
        process.exit(1);
      }

      // Load basic config from environment
      this.loadConfigFromEnv();

      // Set deployment to docker
      this.config.deployment = "docker";

      // Run Docker-specific configuration
      await this.setupDockerConfiguration();

      // Create Docker files
      await this.createDockerFiles();

      // Check Docker and deploy
      await this.checkDockerAndDeploy();

      console.log(chalk.green("\n🎉 Docker setup completed!"));
      console.log(
        chalk.cyan("Your Docker deployment files are ready in the generated/ directory.")
      );
    } catch (error) {
      console.error(chalk.red("❌ Docker setup failed:"), error);
      throw error;
    }
  }

  /**
   * Load basic configuration from existing .env file
   */
  private loadConfigFromEnv(): void {
    const envPath = path.join(this.projectRoot, ".env");
    const envContent = fs.readFileSync(envPath, "utf8");

    // Parse basic values from .env
    const getEnvValue = (key: string, defaultValue: string = ""): string => {
      const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
      return match?.[1]?.replace(/["']/g, "") || defaultValue;
    };

    this.config = {
      deployment: "docker",
      environment: getEnvValue("NODE_ENV", "production") as "development" | "production",
      port: parseInt(getEnvValue("PORT", "3000")),
      host: getEnvValue("HOST", "0.0.0.0"),
      database: {
        type: getEnvValue("DATABASE_URL", "").includes("postgresql") ? "postgresql" : "sqlite",
        url: getEnvValue("DATABASE_URL", "file:./data/depot.db"),
      },
      admin: {
        email: getEnvValue("ADMIN_EMAIL", "admin@example.com"),
        password: getEnvValue("ADMIN_PASSWORD", "password"),
      },
      steamAccounts: getEnvValue("STEAM_ACCOUNTS", ""),
      jwtSecret: getEnvValue("JWT_SECRET", ""),
      apiKeySalt: getEnvValue("API_KEY_SALT", ""),
      enableTLS: getEnvValue("TLS_ENABLE", "false") === "true",
      enableDocs: getEnvValue("DOCS_ENABLED", "true") === "true",
      enableMetrics: getEnvValue("ENABLE_METRICS", "true") === "true",
      saveRoot: getEnvValue("SAVE_ROOT", "./downloads"),
      depotDownloaderPath: getEnvValue(
        "DEPOTDOWNLOADER_PATH",
        "./DepotDownloaderMod/DepotDownloaderMod.exe"
      ),
    };
  }
}
