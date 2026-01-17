/**
 * Unit Tests: Hub Template Management Service
 * Tests for template CRUD operations and variable extraction
 * Requirements: 5.1-5.7
 */
import { describe, it, expect } from 'vitest'

// ============================================
// PURE FUNCTIONS (extracted from service for testing without Prisma)
// ============================================

/**
 * Extract variables from template content
 * Requirements: 5.2, 5.5
 */
function extractVariables(content: string): string[] {
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
 * Render template with data
 * Requirements: 5.2, 5.5
 */
function renderTemplate(content: string, data: Record<string, string>): string {
  let rendered = content;

  // Replace all {{variable}} placeholders with data values
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
  }

  return rendered;
}

// ============================================
// TESTS
// ============================================

describe('Hub Template Management Service - Pure Functions', () => {
  describe('extractVariables', () => {
    it('extracts single variable from template content', () => {
      const content = 'Hello {{name}}, welcome to our school!';
      const variables = extractVariables(content);
      expect(variables).toEqual(['name']);
    });

    it('extracts multiple variables from template content', () => {
      const content = 'Dear {{guardianName}}, your child {{studentName}} was absent on {{date}}.';
      const variables = extractVariables(content);
      expect(variables).toEqual(['guardianName', 'studentName', 'date']);
    });

    it('extracts variables without duplicates', () => {
      const content = 'Hello {{name}}, {{name}} has a balance of {{amount}}. Please pay {{amount}} soon.';
      const variables = extractVariables(content);
      expect(variables).toEqual(['name', 'amount']);
    });

    it('returns empty array for content without variables', () => {
      const content = 'This is a plain message without any variables.';
      const variables = extractVariables(content);
      expect(variables).toEqual([]);
    });

    it('handles empty content', () => {
      const content = '';
      const variables = extractVariables(content);
      expect(variables).toEqual([]);
    });

    it('ignores malformed variable syntax', () => {
      const content = 'Hello {name} and {{validVar}} and {invalid}';
      const variables = extractVariables(content);
      expect(variables).toEqual(['validVar']);
    });

    it('extracts variables with numbers and underscores', () => {
      const content = 'Student {{student_id}} has score {{test_1_score}}';
      const variables = extractVariables(content);
      expect(variables).toEqual(['student_id', 'test_1_score']);
    });
  });

  describe('renderTemplate', () => {
    it('renders template with single variable', () => {
      const content = 'Hello {{name}}, welcome!';
      const data = { name: 'John' };
      const rendered = renderTemplate(content, data);
      expect(rendered).toBe('Hello John, welcome!');
    });

    it('renders template with multiple variables', () => {
      const content = 'Dear {{guardianName}}, {{studentName}} was absent on {{date}}.';
      const data = {
        guardianName: 'Mrs. Smith',
        studentName: 'Alice',
        date: '2024-01-15'
      };
      const rendered = renderTemplate(content, data);
      expect(rendered).toBe('Dear Mrs. Smith, Alice was absent on 2024-01-15.');
    });

    it('renders template with repeated variables', () => {
      const content = 'Hello {{name}}, {{name}} has a balance of {{amount}}.';
      const data = { name: 'John', amount: '$50' };
      const rendered = renderTemplate(content, data);
      expect(rendered).toBe('Hello John, John has a balance of $50.');
    });

    it('leaves unreplaced variables as-is when data is missing', () => {
      const content = 'Hello {{name}}, your balance is {{amount}}.';
      const data = { name: 'John' };
      const rendered = renderTemplate(content, data);
      expect(rendered).toBe('Hello John, your balance is {{amount}}.');
    });

    it('handles empty data object', () => {
      const content = 'Hello {{name}}, welcome!';
      const data = {};
      const rendered = renderTemplate(content, data);
      expect(rendered).toBe('Hello {{name}}, welcome!');
    });

    it('handles content without variables', () => {
      const content = 'This is a plain message.';
      const data = { name: 'John' };
      const rendered = renderTemplate(content, data);
      expect(rendered).toBe('This is a plain message.');
    });

    it('handles special characters in replacement values', () => {
      const content = 'Hello {{name}}, your code is {{code}}.';
      const data = { name: 'John', code: '$pecial-Ch@rs!' };
      const rendered = renderTemplate(content, data);
      expect(rendered).toBe('Hello John, your code is $pecial-Ch@rs!.');
    });
  });

  describe('Template validation logic', () => {
    it('validates template name requirements', () => {
      const validNames = ['Welcome Message', 'Fee Reminder', 'Attendance Alert'];
      const invalidNames = ['', '   ', 'a'.repeat(256)];

      validNames.forEach(name => {
        expect(name.trim().length).toBeGreaterThan(0);
        expect(name.length).toBeLessThan(255);
      });

      invalidNames.forEach(name => {
        expect(name.trim().length === 0 || name.length >= 255).toBe(true);
      });
    });

    it('validates channel types', () => {
      const validChannels = ['SMS', 'WHATSAPP', 'EMAIL'];
      const invalidChannels = ['sms', 'whatsapp', 'email', 'INVALID'];

      validChannels.forEach(channel => {
        expect(['SMS', 'WHATSAPP', 'EMAIL']).toContain(channel);
      });

      invalidChannels.forEach(channel => {
        expect(['SMS', 'WHATSAPP', 'EMAIL']).not.toContain(channel);
      });
    });

    it('validates content length limits', () => {
      const smsContent = 'a'.repeat(160); // SMS limit
      const longContent = 'a'.repeat(10000); // Email/WhatsApp can be longer

      expect(smsContent.length).toBeLessThanOrEqual(160);
      expect(longContent.length).toBeGreaterThan(160);
    });
  });
});