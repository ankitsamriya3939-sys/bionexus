// BioNexus UI Studio — Code Patching & Validation Engine
// Validates visual properties, generates unified diffs, and constructs safe source patches.

import { COMPONENT_REGISTRY } from '../services/uiStudioRegistry';

// Whitelist of valid CSS unit patterns and safe characters
const SAFE_CSS_VALUE_REGEX = /^[a-zA-Z0-9\s\-_#,.\(\)%\/:\+*]+$/;

/**
 * Validate that a proposed visual property change is safe and within constraints
 */
export function validatePropertyChange(componentId, property, value) {
  const component = COMPONENT_REGISTRY[componentId];
  if (!component) {
    return { valid: false, error: `Component '${componentId}' is not registered.` };
  }

  // Check if property is within component's safe whitelist
  const isSafeProp = component.safeProperties.includes(property) || 
    (component.scientificProperties && property in component.scientificProperties);

  if (!isSafeProp) {
    return { valid: false, error: `Property '${property}' is not in the safe visual whitelist for ${component.name}.` };
  }

  // Sanitize string value
  const strVal = String(value).trim();
  if (!strVal) {
    return { valid: true, value: '' };
  }

  // Check for potentially malicious injections (e.g. script tags, expressions, url() attacks)
  const lowerVal = strVal.toLowerCase();
  if (lowerVal.includes('<script') || lowerVal.includes('javascript:') || lowerVal.includes('data:text/html') || lowerVal.includes('expression(')) {
    return { valid: false, error: `Value contains forbidden script/expression patterns.` };
  }

  if (!SAFE_CSS_VALUE_REGEX.test(strVal)) {
    return { valid: false, error: `Value contains invalid or unsafe characters.` };
  }

  return { valid: true, value: strVal };
}

/**
 * Formats a clean unified git diff string from original styles to new styles
 */
export function generateUnifiedDiff({
  filePath = 'src/components/Component.jsx',
  componentName = 'Component',
  originalStyles = {},
  updatedStyles = {}
}) {
  const lines = [];
  lines.push(`--- a/${filePath}`);
  lines.push(`+++ b/${filePath}`);
  lines.push(`@@ -1,12 +1,12 @@ // ${componentName} Visual Presentation`);

  const allKeys = Array.from(new Set([...Object.keys(originalStyles), ...Object.keys(updatedStyles)]));

  for (const key of allKeys) {
    const origVal = originalStyles[key];
    const newVal = updatedStyles[key];

    if (origVal !== undefined && newVal !== undefined && origVal !== newVal) {
      lines.push(`-   ${key}: '${origVal}',`);
      lines.push(`+   ${key}: '${newVal}',`);
    } else if (origVal === undefined && newVal !== undefined) {
      lines.push(`+   ${key}: '${newVal}',`);
    } else if (origVal !== undefined && newVal === undefined) {
      lines.push(`-   ${key}: '${origVal}',`);
    } else if (origVal !== undefined) {
      lines.push(`    ${key}: '${origVal}',`);
    }
  }

  return lines.join('\n');
}

/**
 * Validates entire design proposal payload before code application
 */
export function validateDesignProposal(proposal) {
  if (!proposal || typeof proposal !== 'object') {
    return { valid: false, error: 'Proposal payload must be an object.' };
  }

  if (!proposal.targetComponentId && !proposal.changes) {
    return { valid: false, error: 'Proposal must specify targetComponentId or changes mapping.' };
  }

  const errors = [];
  const validatedChanges = {};

  const changesMap = proposal.changes || { [proposal.targetComponentId]: proposal.styles || {} };

  for (const [compId, styleObj] of Object.entries(changesMap)) {
    const comp = COMPONENT_REGISTRY[compId];
    if (!comp) {
      errors.push(`Unknown component ID: ${compId}`);
      continue;
    }

    validatedChanges[compId] = {};
    for (const [prop, val] of Object.entries(styleObj)) {
      const res = validatePropertyChange(compId, prop, val);
      if (!res.valid) {
        errors.push(`${comp.name} -> ${prop}: ${res.error}`);
      } else {
        validatedChanges[compId][prop] = res.value;
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, validatedChanges };
}
