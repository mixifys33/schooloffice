/**
 * Hub Template Management Service
 * Manages message templates for Super Admin Communication Hub
 * Requirements: 5.1-5.7
 */  

import { PrismaClient } from '@prisma/client';
import {
  HubTemplate,
  TemplateVersion,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateFilters,
  MessageChannel,
} from '../types/communication-hub';

export class TemplateManagementService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new template
   * Requirements: 5.1
   */
  async createTemplate(template: CreateTemplateInput): Promise<HubTemplate> {
    try {
      // Extract variables from content
      const variables = this.extractVariables(template.content);

      const createdTemplate = await this.prisma.hubTemplate.create({
        data: {
          name: template.name,
          channel: template.channel,
          content: template.content,
          variables: variables,
          isMandatory: template.isMandatory || false,
          version: 1,
          createdBy: 'system', // TODO: Get from auth context
        },
        include: {
          assignments: true,
        },
      });

      // Create initial version
      await this.prisma.hubTemplateVersion.create({
        data: {
          templateId: createdTemplate.id,
          version: 1,
          content: template.content,
          createdBy: 'system', // TODO: Get from auth context
        },
      });

      return this.mapToHubTemplate(createdTemplate);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new Error(`Template with name "${template.name}" already exists for ${template.channel} channel`);
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to create template: ${message}`);
    }
  }

  /**
   * Update an existing template
   * Requirements: 5.1, 5.3, 5.4
   */
  async updateTemplate(id: string, updates: UpdateTemplateInput): Promise<HubTemplate> {
    try {
      // Get current template
      const currentTemplate = await this.prisma.hubTemplate.findUnique({
        where: { id },
        include: {
          assignments: true,
        },
      });

      if (!currentTemplate) {
        throw new Error(`Template with id "${id}" not found`);
      }

      // Prepare update data
      const updateData: {
        name?: string;
        content?: string;
        variables?: string[];
        version?: number;
        isMandatory?: boolean;
      } = {};
      let shouldCreateVersion = false;

      if (updates.name && updates.name !== currentTemplate.name) {
        updateData.name = updates.name;
      }

      if (updates.content && updates.content !== currentTemplate.content) {
        updateData.content = updates.content;
        updateData.variables = this.extractVariables(updates.content);
        updateData.version = currentTemplate.version + 1;
        shouldCreateVersion = true;
      }

      if (updates.isMandatory !== undefined && updates.isMandatory !== currentTemplate.isMandatory) {
        updateData.isMandatory = updates.isMandatory;
      }

      // Update template
      const updatedTemplate = await this.prisma.hubTemplate.update({
        where: { id },
        data: updateData,
        include: {
          assignments: true,
        },
      });

      // Create new version if content changed
      if (shouldCreateVersion) {
        await this.prisma.hubTemplateVersion.create({
          data: {
            templateId: id,
            version: updatedTemplate.version,
            content: updates.content!,
            createdBy: 'system', // TODO: Get from auth context
          },
        });
      }

      return this.mapToHubTemplate(updatedTemplate);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new Error(`Template with name "${updates.name}" already exists for this channel`);
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update template: ${message}`);
    }
  }

  /**
   * Get a single template by ID
   * Requirements: 5.1
   */
  async getTemplate(id: string): Promise<HubTemplate> {
    try {
      const template = await this.prisma.hubTemplate.findUnique({
        where: { id },
        include: {
          assignments: true,
        },
      });

      if (!template) {
        throw new Error(`Template with id "${id}" not found`);
      }

      return this.mapToHubTemplate(template);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get template: ${message}`);
    }
  }

  /**
   * List templates with optional filtering
   * Requirements: 5.1
   */
  async listTemplates(filters: TemplateFilters = {}): Promise<HubTemplate[]> {
    try {
      const where: {
        channel?: MessageChannel;
        isMandatory?: boolean;
        OR?: Array<{
          name?: { contains: string; mode: 'insensitive' };
          content?: { contains: string; mode: 'insensitive' };
        }>;
      } = {};

      if (filters.channel) {
        where.channel = filters.channel;
      }

      if (filters.isMandatory !== undefined) {
        where.isMandatory = filters.isMandatory;
      }

      if (filters.searchQuery) {
        where.OR = [
          { name: { contains: filters.searchQuery, mode: 'insensitive' } },
          { content: { contains: filters.searchQuery, mode: 'insensitive' } },
        ];
      }

      const templates = await this.prisma.hubTemplate.findMany({
        where,
        include: {
          assignments: true,
        },
        orderBy: [
          { isMandatory: 'desc' },
          { name: 'asc' },
        ],
      });

      return templates.map(template => this.mapToHubTemplate(template));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to list templates: ${message}`);
    }
  }

  /**
   * Get template versions
   * Requirements: 5.3, 5.4
   */
  async getTemplateVersions(templateId: string): Promise<TemplateVersion[]> {
    try {
      const versions = await this.prisma.hubTemplateVersion.findMany({
        where: { templateId },
        orderBy: { version: 'desc' },
      });

      return versions.map(version => ({
        id: version.id,
        templateId: version.templateId,
        version: version.version,
        content: version.content,
        createdAt: version.createdAt,
        createdBy: version.createdBy,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get template versions: ${message}`);
    }
  }

  /**
   * Revert template to a specific version
   * Requirements: 5.3, 5.4
   */
  async revertToVersion(templateId: string, versionId: string): Promise<HubTemplate> {
    try {
      // Get the version to revert to
      const targetVersion = await this.prisma.hubTemplateVersion.findUnique({
        where: { id: versionId },
      });

      if (!targetVersion || targetVersion.templateId !== templateId) {
        throw new Error(`Version with id "${versionId}" not found for template "${templateId}"`);
      }

      // Get current template
      const currentTemplate = await this.prisma.hubTemplate.findUnique({
        where: { id: templateId },
      });

      if (!currentTemplate) {
        throw new Error(`Template with id "${templateId}" not found`);
      }

      // Update template with version content
      const variables = this.extractVariables(targetVersion.content);
      const newVersion = currentTemplate.version + 1;

      const updatedTemplate = await this.prisma.hubTemplate.update({
        where: { id: templateId },
        data: {
          content: targetVersion.content,
          variables: variables,
          version: newVersion,
        },
        include: {
          assignments: true,
        },
      });

      // Create new version entry for the revert
      await this.prisma.hubTemplateVersion.create({
        data: {
          templateId: templateId,
          version: newVersion,
          content: targetVersion.content,
          createdBy: 'system', // TODO: Get from auth context
        },
      });

      return this.mapToHubTemplate(updatedTemplate);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to revert template: ${message}`);
    }
  }

  /**
   * Extract variables from template content
   * Requirements: 5.2, 5.5
   */
  private extractVariables(content: string): string[] {
    // Variable names should start with letter or underscore, followed by letters, digits, or underscores
    const variableRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      const variable = match[1];
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }

    return variables;
  }

  /**
   * Preview template with sample data
   * Requirements: 5.2, 5.5
   */
  async previewTemplate(templateId: string, sampleData: Record<string, string>): Promise<string> {
    try {
      const template = await this.prisma.hubTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new Error(`Template with id "${templateId}" not found`);
      }

      return this.renderTemplate(template.content, sampleData);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to preview template: ${message}`);
    }
  }

  /**
   * Assign template to schools
   * Requirements: 5.6, 5.7
   */
  async assignTemplateToSchools(templateId: string, schoolIds: string[]): Promise<void> {
    try {
      // Verify template exists
      const template = await this.prisma.hubTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new Error(`Template with id "${templateId}" not found`);
      }

      // Remove existing assignments
      await this.prisma.hubTemplateAssignment.deleteMany({
        where: { templateId },
      });

      // Create new assignments
      if (schoolIds.length > 0) {
        await this.prisma.hubTemplateAssignment.createMany({
          data: schoolIds.map(schoolId => ({
            templateId,
            schoolId,
            assignedBy: 'system', // TODO: Get from auth context
          })),
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to assign template to schools: ${message}`);
    }
  }

  /**
   * Set template mandatory status
   * Requirements: 5.6, 5.7
   */
  async setTemplateMandatory(templateId: string, mandatory: boolean): Promise<void> {
    try {
      const template = await this.prisma.hubTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new Error(`Template with id "${templateId}" not found`);
      }

      await this.prisma.hubTemplate.update({
        where: { id: templateId },
        data: { isMandatory: mandatory },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to set template mandatory status: ${message}`);
    }
  }

  /**
   * Render template with data
   * Requirements: 5.2, 5.5
   */
  private renderTemplate(content: string, data: Record<string, string>): string {
    let rendered = content;

    // Replace all {{variable}} placeholders with data values
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
    }

    return rendered;
  }

  /**
   * Map database model to HubTemplate interface
   */
  private mapToHubTemplate(template: {
    id: string;
    name: string;
    channel: string;
    content: string;
    variables: unknown;
    isMandatory: boolean;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    assignments?: Array<{ schoolId: string }>;
  }): HubTemplate {
    return {
      id: template.id,
      name: template.name,
      channel: template.channel as MessageChannel,
      content: template.content,
      variables: Array.isArray(template.variables) ? template.variables : [],
      isMandatory: template.isMandatory,
      assignedSchools: template.assignments?.map((a) => a.schoolId) || [],
      version: template.version,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      createdBy: template.createdBy,
    };
  }
}

// Export singleton instance
export const templateManagementService = new TemplateManagementService(
  new PrismaClient()
);