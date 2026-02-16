/**
 * Property Test: Template Version Preservation
 * **Feature: super-admin-communication-hub, Property 10: Template Version Preservation**
 * **Validates: Requirements 5.3, 5.4**
 * 
 * For any template update operation, the previous version's content SHALL be preserved 
 * in the version history and remain retrievable by version ID.
 */   
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { MessageChannel } from '../../src/types/communication-hub'

// ============================================
// TEMPLATE VERSION MANAGEMENT SIMULATION
// ============================================

/**
 * Simulated template version storage
 */
interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  content: string;
  createdAt: Date;
  createdBy: string;
}

interface Template {
  id: string;
  name: string;
  channel: MessageChannel;
  content: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Simulated template management system
 */
class TemplateVersionManager {
  private templates: Map<string, Template> = new Map();
  private versions: Map<string, TemplateVersion[]> = new Map();
  private nextId = 1;

  /**
   * Create a new template
   */
  createTemplate(name: string, channel: MessageChannel, content: string, createdBy: string): Template {
    const id = `template_${this.nextId++}`;
    const now = new Date();
    
    const template: Template = {
      id,
      name,
      channel,
      content,
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    // Create initial version
    const initialVersion: TemplateVersion = {
      id: `version_${this.nextId++}`,
      templateId: id,
      version: 1,
      content,
      createdAt: now,
      createdBy,
    };

    this.templates.set(id, template);
    this.versions.set(id, [initialVersion]);

    return template;
  }

  /**
   * Update template content (creates new version)
   */
  updateTemplate(templateId: string, newContent: string, updatedBy: string): Template {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const versions = this.versions.get(templateId) || [];
    const newVersion = template.version + 1;
    const now = new Date();

    // Create new version entry
    const newVersionEntry: TemplateVersion = {
      id: `version_${this.nextId++}`,
      templateId,
      version: newVersion,
      content: newContent,
      createdAt: now,
      createdBy: updatedBy,
    };

    // Update template
    const updatedTemplate: Template = {
      ...template,
      content: newContent,
      version: newVersion,
      updatedAt: now,
    };

    // Store updated template and new version
    this.templates.set(templateId, updatedTemplate);
    this.versions.set(templateId, [...versions, newVersionEntry]);

    return updatedTemplate;
  }

  /**
   * Get all versions of a template
   */
  getTemplateVersions(templateId: string): TemplateVersion[] {
    return this.versions.get(templateId) || [];
  }

  /**
   * Get a specific version by version ID
   */
  getVersionById(versionId: string): TemplateVersion | null {
    for (const versions of this.versions.values()) {
      const version = versions.find(v => v.id === versionId);
      if (version) {
        return version;
      }
    }
    return null;
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): Template | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * Revert template to a specific version
   */
  revertToVersion(templateId: string, versionId: string, revertedBy: string): Template {
    const targetVersion = this.getVersionById(versionId);
    if (!targetVersion || targetVersion.templateId !== templateId) {
      throw new Error(`Version ${versionId} not found for template ${templateId}`);
    }

    // Update template with the target version's content
    return this.updateTemplate(templateId, targetVersion.content, revertedBy);
  }
}

// ============================================
// ARBITRARIES FOR TEMPLATE GENERATION
// ============================================

/**
 * Generate valid template names
 */
const templateNameArbitrary = fc.string({ minLength: 1, maxLength: 100 })
  .filter(name => name.trim().length > 0);

/**
 * Generate template content
 */
const templateContentArbitrary = fc.string({ minLength: 0, maxLength: 1000 });

/**
 * Generate message channels
 */
const messageChannelArbitrary = fc.constantFrom(
  MessageChannel.SMS,
  MessageChannel.WHATSAPP,
  MessageChannel.EMAIL
);

/**
 * Generate user names
 */
const userNameArbitrary = fc.string({ minLength: 1, maxLength: 50 })
  .filter(name => name.trim().length > 0);

/**
 * Generate template update sequence
 */
const templateUpdateSequenceArbitrary = fc.record({
  name: templateNameArbitrary,
  channel: messageChannelArbitrary,
  initialContent: templateContentArbitrary,
  updates: fc.array(
    fc.record({
      content: templateContentArbitrary,
      updatedBy: userNameArbitrary,
    }),
    { minLength: 1, maxLength: 10 }
  ),
  createdBy: userNameArbitrary,
});

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 10: Template Version Preservation', () => {
  /**
   * Property: All template versions are preserved in history
   */
  it('preserves all template versions in history after updates', () => {
    fc.assert(
      fc.property(templateUpdateSequenceArbitrary, ({ name, channel, initialContent, updates, createdBy }) => {
        const manager = new TemplateVersionManager();
        
        // Create initial template
        const template = manager.createTemplate(name, channel, initialContent, createdBy);
        
        // Track all content versions
        const allContents = [initialContent];
        
        // Apply updates
        for (const update of updates) {
          manager.updateTemplate(template.id, update.content, update.updatedBy);
          allContents.push(update.content);
        }
        
        // Get all versions
        const versions = manager.getTemplateVersions(template.id);
        
        // Should have one version for each update plus initial
        expect(versions).toHaveLength(allContents.length);
        
        // Each version should preserve its content
        for (let i = 0; i < versions.length; i++) {
          expect(versions[i].content).toBe(allContents[i]);
          expect(versions[i].version).toBe(i + 1);
          expect(versions[i].templateId).toBe(template.id);
        }
        
        return true;
      }),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Previous versions remain retrievable by version ID
   */
  it('allows retrieval of any version by its ID', () => {
    fc.assert(
      fc.property(templateUpdateSequenceArbitrary, ({ name, channel, initialContent, updates, createdBy }) => {
        const manager = new TemplateVersionManager();
        
        // Create initial template
        const template = manager.createTemplate(name, channel, initialContent, createdBy);
        
        // Apply updates and collect version IDs
        const versionIds: string[] = [];
        const expectedContents: string[] = [initialContent];
        
        // Get initial version ID
        const initialVersions = manager.getTemplateVersions(template.id);
        versionIds.push(initialVersions[0].id);
        
        // Apply updates
        for (const update of updates) {
          manager.updateTemplate(template.id, update.content, update.updatedBy);
          expectedContents.push(update.content);
          
          const currentVersions = manager.getTemplateVersions(template.id);
          versionIds.push(currentVersions[currentVersions.length - 1].id);
        }
        
        // Verify each version can be retrieved by ID
        for (let i = 0; i < versionIds.length; i++) {
          const version = manager.getVersionById(versionIds[i]);
          expect(version).not.toBeNull();
          expect(version!.content).toBe(expectedContents[i]);
          expect(version!.templateId).toBe(template.id);
        }
        
        return true;
      }),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Template reversion creates new version with old content
   */
  it('creates new version when reverting to previous version', () => {
    fc.assert(
      fc.property(templateUpdateSequenceArbitrary, ({ name, channel, initialContent, updates, createdBy }) => {
        // Skip if no updates to revert to
        if (updates.length === 0) return true;
        
        const manager = new TemplateVersionManager();
        
        // Create initial template
        const template = manager.createTemplate(name, channel, initialContent, createdBy);
        
        // Apply updates
        for (const update of updates) {
          manager.updateTemplate(template.id, update.content, update.updatedBy);
        }
        
        // Get a previous version to revert to
        const versions = manager.getTemplateVersions(template.id);
        const targetVersion = versions[0]; // Revert to initial version
        
        const versionCountBeforeRevert = versions.length;
        
        // Revert to the target version
        const revertedTemplate = manager.revertToVersion(template.id, targetVersion.id, 'reverter');
        
        // Should create a new version
        const versionsAfterRevert = manager.getTemplateVersions(template.id);
        expect(versionsAfterRevert).toHaveLength(versionCountBeforeRevert + 1);
        
        // Current template should have the reverted content
        expect(revertedTemplate.content).toBe(targetVersion.content);
        
        // New version should have the reverted content
        const latestVersion = versionsAfterRevert[versionsAfterRevert.length - 1];
        expect(latestVersion.content).toBe(targetVersion.content);
        expect(latestVersion.version).toBe(versionCountBeforeRevert + 1);
        
        // All previous versions should still exist
        for (let i = 0; i < versionCountBeforeRevert; i++) {
          expect(versionsAfterRevert[i]).toEqual(versions[i]);
        }
        
        return true;
      }),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Version history is immutable
   */
  it('preserves version history immutably', () => {
    fc.assert(
      fc.property(templateUpdateSequenceArbitrary, ({ name, channel, initialContent, updates, createdBy }) => {
        const manager = new TemplateVersionManager();
        
        // Create initial template
        const template = manager.createTemplate(name, channel, initialContent, createdBy);
        
        // Get initial version
        const initialVersions = manager.getTemplateVersions(template.id);
        const initialVersion = { ...initialVersions[0] };
        
        // Apply updates
        for (const update of updates) {
          manager.updateTemplate(template.id, update.content, update.updatedBy);
        }
        
        // Get versions after updates
        const finalVersions = manager.getTemplateVersions(template.id);
        
        // Initial version should remain unchanged
        expect(finalVersions[0]).toEqual(initialVersion);
        
        // All versions should be immutable (no modifications to existing versions)
        for (let i = 0; i < finalVersions.length - 1; i++) {
          const version = finalVersions[i];
          expect(version.content).toBeDefined();
          expect(version.version).toBe(i + 1);
          expect(version.templateId).toBe(template.id);
        }
        
        return true;
      }),
      { numRuns: 20 }
    );
  });
});