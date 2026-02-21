/**
 * Variable Replacement Utility
 * Handles {{$trigger.x}}, {{$node.x.y}}, {{$vars.x}} syntax
 */

export interface VariableContext {
  trigger?: Record<string, any>;
  nodes?: Record<string, Record<string, any>>;
  variables?: Record<string, any>;
}

/**
 * Get nested value using dot notation
 * Example: _.get({a: {b: {c: 1}}}, 'a.b.c') → 1
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

/**
 * Replace variables in text with actual values
 * Supports:
 * - {{$trigger.fieldName}}
 * - {{$node.nodeId.fieldName}}
 * - {{$vars.variableName}}
 * - {{$trigger.user.email}} (nested paths)
 */
export function replaceVariables(
  text: string,
  context: VariableContext
): string {
  if (!text) return text;

  return text.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
    const trimmed = expression.trim();

    // Handle $trigger.x or $trigger.x.y.z (nested)
    if (trimmed.startsWith('$trigger.')) {
      const path = trimmed.substring(9); // Remove '$trigger.'
      const value = getNestedValue(context.trigger, path);
      return value !== undefined ? String(value) : `[undefined: ${trimmed}]`;
    }

    // Handle $node.nodeId.x or $node.nodeId.x.y.z (nested)
    if (trimmed.startsWith('$node.')) {
      const pathParts = trimmed.substring(6).split('.'); // Remove '$node.'
      const nodeId = pathParts[0];
      const fieldPath = pathParts.slice(1).join('.');
      const value = getNestedValue(context.nodes?.[nodeId], fieldPath);
      return value !== undefined ? String(value) : `[undefined: ${trimmed}]`;
    }

    // Handle $vars.x or $vars.x.y.z (nested)
    if (trimmed.startsWith('$vars.')) {
      const path = trimmed.substring(6); // Remove '$vars.'
      const value = getNestedValue(context.variables, path);
      return value !== undefined ? String(value) : `[undefined: ${trimmed}]`;
    }

    // Unknown variable format
    return `[invalid: ${trimmed}]`;
  });
}

/**
 * Extract all variable references from text
 * Useful for validation and preview
 * Returns: ['$trigger.name', '$vars.orderId']
 */
export function extractVariables(text: string): string[] {
  const matches = text.matchAll(/\{\{([^}]+)\}\}/g);
  return Array.from(matches, (m) => m[1].trim());
}

/**
 * Validate variable syntax
 */
export function validateVariableSyntax(text: string): {
  valid: boolean;
  errors: string[];
} {
  const variables = extractVariables(text);
  const errors: string[] = [];

  for (const variable of variables) {
    // Check if variable starts with valid prefix
    if (!variable.startsWith('$trigger.') &&
        !variable.startsWith('$node.') &&
        !variable.startsWith('$vars.')) {
      errors.push(
        `Invalid variable: {{${variable}}} - must start with $trigger, $node, or $vars`
      );
    }

    // Check $node format specifically
    if (variable.startsWith('$node.')) {
      const parts = variable.substring(6).split('.');
      if (parts.length < 2) {
        errors.push(
          `Invalid $node variable: {{${variable}}} - must include node ID and field`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
