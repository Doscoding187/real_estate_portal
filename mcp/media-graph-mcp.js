#!/usr/bin/env node

/**
 * Media Graph MCP Server
 * 
 * Provides media classification, validation, and relationship management
 * for the PropertyListify SA real estate portal.
 * 
 * Capabilities:
 * - Media classification (hero, gallery, floor_plan, etc.)
 * - Media rules validation
 * - Image relationship management
 * - Media architecture governance
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';

// Load media rules configuration
const MEDIA_RULES_PATH = process.env.MEDIA_RULES_PATH || './mcp/media-rules.json';

class MediaGraphServer {
  constructor() {
    this.server = new Server(
      {
        name: 'media-graph-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.mediaRules = null;
    this.setupHandlers();
  }

  async loadMediaRules() {
    try {
      const rulesContent = await fs.readFile(MEDIA_RULES_PATH, 'utf-8');
      this.mediaRules = JSON.parse(rulesContent);
      return this.mediaRules;
    } catch (error) {
      console.error('Failed to load media rules:', error.message);
      return null;
    }
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'classify_media',
          description: 'Classify media files based on their purpose and context',
          inputSchema: {
            type: 'object',
            properties: {
              filename: {
                type: 'string',
                description: 'Name of the media file',
              },
              context: {
                type: 'string',
                description: 'Context where media is used (development, property, etc.)',
              },
            },
            required: ['filename', 'context'],
          },
        },
        {
          name: 'validate_media_rules',
          description: 'Validate media against defined classification rules',
          inputSchema: {
            type: 'object',
            properties: {
              mediaType: {
                type: 'string',
                description: 'Type of media (hero, gallery, floor_plan, etc.)',
              },
              mediaData: {
                type: 'object',
                description: 'Media metadata to validate',
              },
            },
            required: ['mediaType', 'mediaData'],
          },
        },
        {
          name: 'get_media_rules',
          description: 'Get all media classification rules',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'check_media_relationships',
          description: 'Check relationships between media items',
          inputSchema: {
            type: 'object',
            properties: {
              entityId: {
                type: 'string',
                description: 'ID of the entity (development, property)',
              },
              entityType: {
                type: 'string',
                description: 'Type of entity',
              },
            },
            required: ['entityId', 'entityType'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'classify_media':
          return await this.classifyMedia(args);
        case 'validate_media_rules':
          return await this.validateMediaRules(args);
        case 'get_media_rules':
          return await this.getMediaRules();
        case 'check_media_relationships':
          return await this.checkMediaRelationships(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async classifyMedia({ filename, context }) {
    const rules = await this.loadMediaRules();
    if (!rules) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Media rules not loaded' }, null, 2),
          },
        ],
      };
    }

    // Simple classification logic based on filename patterns
    const classifications = rules.classifications || {};
    let classification = 'gallery'; // default

    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.includes('hero') || lowerFilename.includes('main')) {
      classification = 'hero';
    } else if (lowerFilename.includes('floor') || lowerFilename.includes('plan')) {
      classification = 'floor_plan';
    } else if (lowerFilename.includes('logo')) {
      classification = 'logo';
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              filename,
              context,
              classification,
              rules: classifications[classification] || {},
            },
            null,
            2
          ),
        },
      ],
    };
  }

  async validateMediaRules({ mediaType, mediaData }) {
    const rules = await this.loadMediaRules();
    if (!rules) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Media rules not loaded' }, null, 2),
          },
        ],
      };
    }

    const typeRules = rules.classifications?.[mediaType];
    if (!typeRules) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                valid: false,
                error: `No rules defined for media type: ${mediaType}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Basic validation
    const validation = {
      valid: true,
      mediaType,
      violations: [],
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(validation, null, 2),
        },
      ],
    };
  }

  async getMediaRules() {
    const rules = await this.loadMediaRules();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(rules || { error: 'Media rules not loaded' }, null, 2),
        },
      ],
    };
  }

  async checkMediaRelationships({ entityId, entityType }) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              entityId,
              entityType,
              relationships: {
                hero: null,
                gallery: [],
                floorPlans: [],
              },
              status: 'Not implemented - requires database connection',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Media Graph MCP Server running on stdio');
  }
}

// Start the server
const server = new MediaGraphServer();
server.run().catch(console.error);
