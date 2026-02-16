/**
 * Property Test: Template Variable Extraction
 * **Feature: super-admin-communication-hub, Property 15: Template Variable Extraction**
 * **Validates: Requirements 5.2, 5.5**
 * 
 * For any template content containing placeholders in {{variable}} format, 
 * the extracted variables list SHALL contain exactly those variable names, with no duplicates.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
   
// ============================================
// TEMPLATE VARIABLE EXTRACTION FUNCTION
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

// ============================================
// ARBITRARIES FOR TEMPLATE GENERATION
// ============================================

/**
 * Generate valid variable names (start with letter or underscore, followed by alphanumeric + underscore)
 */
const variableNameArbitrary = fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
  .filter(name => name.length >= 1 && name.length <= 50);

/**
 * Generate template content with known variables
 */
const templateWithVariablesArbitrary = fc.record({
  variables: fc.array(variableNameArbitrary, { minLength: 0, maxLength: 10 }),
  plainText: fc.array(fc.string({ minLength: 0, maxLength: 50 }), { minLength: 1, maxLength: 5 })
}).map(({ variables, plainText }) => {
  // Create template content by interleaving plain text with variables
  let content = '';
  let variableIndex = 0;
  
  for (let i = 0; i < plainText.length; i++) {
    content += plainText[i];
    
    // Add a variable placeholder if we have more variables
    if (variableIndex < variables.length) {
      content += `{{${variables[variableIndex]}}}`;
      variableIndex++;
    }
  }
  
  // Add any remaining variables
  while (variableIndex < variables.length) {
    content += `{{${variables[variableIndex]}}}`;
    variableIndex++;
  }
  
  return {
    content,
    expectedVariables: [...new Set(variables)] // Remove duplicates, preserve order
  };
});

/**
 * Generate template content with duplicate variables
 */
const templateWithDuplicatesArbitrary = fc.record({
  variable: variableNameArbitrary,
  repetitions: fc.integer({ min: 2, max: 5 }),
  plainText: fc.array(fc.string({ minLength: 0, maxLength: 20 }), { minLength: 2, maxLength: 6 })
}).map(({ variable, repetitions, plainText }) => {
  let content = '';
  let varCount = 0;
  
  for (let i = 0; i < plainText.length && varCount < repetitions; i++) {
    content += plainText[i];
    if (varCount < repetitions) {
      content += `{{${variable}}}`;
      varCount++;
    }
  }
  
  // Add remaining plain text
  for (let i = varCount; i < plainText.length; i++) {
    content += plainText[i];
  }
  
  return {
    content,
    expectedVariables: [variable] // Should only appear once in result
  };
});

/**
 * Generate template content without any variables
 */
const templateWithoutVariablesArbitrary = fc.string({ minLength: 0, maxLength: 200 })
  .filter(content => !content.includes('{{') && !content.includes('}}'))
  .map(content => ({
    content,
    expectedVariables: [] as string[]
  }));

/**
 * Generate template content with malformed variable syntax
 */
const templateWithMalformedVariablesArbitrary = fc.record({
  validVariable: variableNameArbitrary,
  plainText: fc.string({ minLength: 0, maxLength: 50 }),
  malformedParts: fc.array(
    fc.oneof(
      fc.constant('{single}'),
      fc.constant('{{}}'),
      fc.constant('{{123invalid}}'), // starts with digit
      fc.constant('{{invalid-char}}'), // contains hyphen
      fc.constant('{{ spaced }}') // contains spaces
    ),
    { minLength: 1, maxLength: 3 }
  )
}).map(({ validVariable, plainText, malformedParts }) => {
  const content = `${plainText}{{${validVariable}}}${malformedParts.join('')}`;
  return {
    content,
    expectedVariables: [validVariable] // Only valid variable should be extracted
  };
});

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 15: Template Variable Extraction', () => {
  /**
   * Property: Variables are extracted correctly from template content
   */
  it('extracts all unique variables from template content', () => {
    fc.assert(
      fc.property(templateWithVariablesArbitrary, ({ content, expectedVariables }) => {
        const extractedVariables = extractVariables(content);
        
        // Should extract exactly the expected variables
        expect(extractedVariables).toHaveLength(expectedVariables.length);
        
        // Should contain all expected variables
        for (const expectedVar of expectedVariables) {
          expect(extractedVariables).toContain(expectedVar);
        }
        
        // Should not contain any unexpected variables
        for (const extractedVar of extractedVariables) {
          expect(expectedVariables).toContain(extractedVar);
        }
        
        return true;
      }),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Duplicate variables are deduplicated
   */
  it('removes duplicate variables from extraction result', () => {
    fc.assert(
      fc.property(templateWithDuplicatesArbitrary, ({ content, expectedVariables }) => {
        const extractedVariables = extractVariables(content);
        
        // Should extract exactly one instance of the variable
        expect(extractedVariables).toEqual(expectedVariables);
        
        // Should not have duplicates
        const uniqueVariables = [...new Set(extractedVariables)];
        expect(extractedVariables).toEqual(uniqueVariables);
        
        return true;
      }),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Content without variables returns empty array
   */
  it('returns empty array for content without variables', () => {
    fc.assert(
      fc.property(templateWithoutVariablesArbitrary, ({ content, expectedVariables }) => {
        const extractedVariables = extractVariables(content);
        expect(extractedVariables).toEqual(expectedVariables);
        expect(extractedVariables).toHaveLength(0);
        return true;
      }),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Malformed variable syntax is ignored
   */
  it('ignores malformed variable syntax and extracts only valid variables', () => {
    fc.assert(
      fc.property(templateWithMalformedVariablesArbitrary, ({ content, expectedVariables }) => {
        const extractedVariables = extractVariables(content);
        
        // Should extract only the valid variable
        expect(extractedVariables).toEqual(expectedVariables);
        
        return true;
      }),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Variable extraction is deterministic
   */
  it('produces consistent results for the same input', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 200 }), (content) => {
        const result1 = extractVariables(content);
        const result2 = extractVariables(content);
        
        // Should produce identical results
        expect(result1).toEqual(result2);
        
        return true;
      }),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Empty content returns empty array
   */
  it('handles empty content correctly', () => {
    const result = extractVariables('');
    expect(result).toEqual([]);
  });
});