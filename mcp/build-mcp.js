#!/usr/bin/env node

/**
 * Build MCP Server
 * 
 * Provides build orchestration, production bundle management, and deployment
 * verification for the PropertyListify SA real estate portal.
 * 
 * Capabilities:
 * - Build status monitoring
 * - Production bundle analysis
 * - Build optimization recommendations
 * - Deployment readiness checks
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

class BuildServer {
  constructor() {
    this.server = new Server(
      {
        name: 'build-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'check_build_status',
          description: 'Check the current build status of frontend and backend',
          inputSchema: {
            type: 'object',
            properties: {
              target: {
                type: 'string',
                enum: ['frontend', 'backend', 'all'],
                description: 'Which target to check',
              },
            },
            required: ['target'],
          },
        },
        {
          name: 'analyze_bundle',
          description: 'Analyze production bundle size and composition',
          inputSchema: {
            type: 'object',
            properties: {
              target: {
                type: 'string',
                enum: ['frontend', 'backend'],
                description: 'Which bundle to analyze',
              },
            },
            required: ['target'],
          },
        },
        {
          name: 'run_build',
          description: 'Execute production build for specified target',
          inputSchema: {
            type: 'object',
            properties: {
              target: {
                type: 'string',
                enum: ['frontend', 'backend', 'all'],
                description: 'Which target to build',
              },
              clean: {
                type: 'boolean',
                description: 'Clean before building',
                default: false,
              },
            },
            required: ['target'],
          },
        },
        {
          name: 'deployment_readiness',
          description: 'Check if the application is ready for deployment',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'check_build_status':
          return await this.checkBuildStatus(args);
        case 'analyze_bundle':
          return await this.analyzeBundle(args);
        case 'run_build':
          return await this.runBuild(args);
        case 'deployment_readiness':
          return await this.checkDeploymentReadiness();
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async checkBuildStatus({ target }) {
    const results = {};

    try {
      if (target === 'frontend' || target === 'all') {
        const frontendDist = await this.checkDirectory('./client/dist');
        results.frontend = {
          built: frontendDist.exists,
          lastModified: frontendDist.lastModified,
          size: frontendDist.size,
        };
      }

      if (target === 'backend' || target === 'all') {
        const backendDist = await this.checkDirectory('./server/dist');
        results.backend = {
          built: backendDist.exists,
          lastModified: backendDist.lastModified,
          size: backendDist.size,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                target,
                timestamp: new Date().toISOString(),
                results,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
      };
    }
  }

  async analyzeBundle({ target }) {
    try {
      const distPath = target === 'frontend' ? './client/dist' : './server/dist';
      const analysis = await this.analyzeBundleSize(distPath);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                target,
                analysis,
                recommendations: this.getBundleRecommendations(analysis),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
      };
    }
  }

  async runBuild({ target, clean = false }) {
    try {
      const commands = [];

      if (clean) {
        if (target === 'frontend' || target === 'all') {
          commands.push('rm -rf ./client/dist');
        }
        if (target === 'backend' || target === 'all') {
          commands.push('rm -rf ./server/dist');
        }
      }

      if (target === 'frontend' || target === 'all') {
        commands.push('cd client && npm run build');
      }
      if (target === 'backend' || target === 'all') {
        commands.push('cd server && npm run build');
      }

      const results = [];
      for (const cmd of commands) {
        const { stdout, stderr } = await execAsync(cmd);
        results.push({ command: cmd, stdout, stderr });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                target,
                clean,
                results,
                status: 'completed',
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: error.message,
                status: 'failed',
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  async checkDeploymentReadiness() {
    const checks = {
      frontendBuild: false,
      backendBuild: false,
      envVariables: false,
      dependencies: false,
      tests: false,
    };

    try {
      // Check frontend build
      const frontendDist = await this.checkDirectory('./client/dist');
      checks.frontendBuild = frontendDist.exists;

      // Check backend build
      const backendDist = await this.checkDirectory('./server/dist');
      checks.backendBuild = backendDist.exists;

      // Check environment variables
      checks.envVariables = await this.checkEnvFile('./.env.production');

      // Check dependencies
      checks.dependencies = await this.checkPackageLock();

      const readiness = Object.values(checks).every((check) => check);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ready: readiness,
                checks,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
      };
    }
  }

  // Helper methods
  async checkDirectory(dirPath) {
    try {
      const stats = await fs.stat(dirPath);
      return {
        exists: true,
        lastModified: stats.mtime,
        size: await this.getDirectorySize(dirPath),
      };
    } catch {
      return { exists: false, lastModified: null, size: 0 };
    }
  }

  async getDirectorySize(dirPath) {
    let totalSize = 0;
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
          totalSize += await this.getDirectorySize(filePath);
        } else {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        }
      }
    } catch {
      // Ignore errors
    }
    return totalSize;
  }

  async analyzeBundleSize(distPath) {
    const size = await this.getDirectorySize(distPath);
    return {
      totalSize: size,
      totalSizeMB: (size / (1024 * 1024)).toFixed(2),
      files: await this.countFiles(distPath),
    };
  }

  async countFiles(dirPath) {
    let count = 0;
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      for (const file of files) {
        if (file.isDirectory()) {
          count += await this.countFiles(path.join(dirPath, file.name));
        } else {
          count++;
        }
      }
    } catch {
      // Ignore errors
    }
    return count;
  }

  getBundleRecommendations(analysis) {
    const recommendations = [];
    const sizeMB = parseFloat(analysis.totalSizeMB);

    if (sizeMB > 5) {
      recommendations.push('Bundle size exceeds 5MB - consider code splitting');
    }
    if (sizeMB > 10) {
      recommendations.push('Bundle size exceeds 10MB - urgent optimization needed');
    }
    if (analysis.files > 100) {
      recommendations.push('High file count - consider bundling optimization');
    }

    return recommendations.length > 0
      ? recommendations
      : ['Bundle size is within acceptable limits'];
  }

  async checkEnvFile(envPath) {
    try {
      await fs.access(envPath);
      return true;
    } catch {
      return false;
    }
  }

  async checkPackageLock() {
    try {
      await fs.access('./package-lock.json');
      return true;
    } catch {
      try {
        await fs.access('./pnpm-lock.yaml');
        return true;
      } catch {
        return false;
      }
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Build MCP Server running on stdio');
  }
}

// Start the server
const server = new BuildServer();
server.run().catch(console.error);
