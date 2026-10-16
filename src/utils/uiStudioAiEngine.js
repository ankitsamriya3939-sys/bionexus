// BioNexus UI Studio — AI Design Assistant Reasoning Engine
// Interprets natural language design prompts into structured, validated design proposals
// with unified diffs, safety risk assessments, and previewable property patches.

import { COMPONENT_REGISTRY, getComponentsByPage } from '../services/uiStudioRegistry';
import { generateUnifiedDiff, validateDesignProposal } from './uiStudioPatcher';

/**
 * Main prompt interpreter: calls backend /api/ui-studio/ai-redesign if available,
 * or falls back to domain-grounded deterministic design compiler.
 */
export async function generateAiDesignProposal({
  prompt,
  activePage = 'protein',
  selectedComponentId = null,
  currentStyles = {}
}) {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Please enter a description of the UI redesign you would like to create.');
  }

  // 1. Try backend API endpoint first (with Gemini support if configured)
  try {
    const res = await fetch('/api/ui-studio/ai-redesign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt.trim(),
        activePage,
        selectedComponentId,
        currentStyles
      }),
      signal: AbortSignal.timeout(6000)
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data && data.proposal) {
        return data.proposal;
      }
    }
  } catch {
    // Proceed to deterministic design compiler
  }

  // 2. Deterministic Domain-Grounded Design Proposal Compiler
  return compileDeterministicDesignProposal({
    prompt: prompt.trim(),
    activePage,
    selectedComponentId,
    currentStyles
  });
}

/**
 * Interprets natural language intent and constructs a structured design proposal
 */
export function compileDeterministicDesignProposal({
  prompt,
  activePage,
  selectedComponentId,
  currentStyles
}) {
  const pLower = prompt.toLowerCase();
  const pageComponents = getComponentsByPage(activePage);

  // Target component resolution
  let targetComp = null;
  if (selectedComponentId && COMPONENT_REGISTRY[selectedComponentId]) {
    targetComp = COMPONENT_REGISTRY[selectedComponentId];
  } else if (pageComponents.length > 0) {
    // Infer most relevant component from prompt keywords
    if (pLower.includes('canvas') || pLower.includes('viewer') || pLower.includes('3d') || pLower.includes('tree')) {
      targetComp = pageComponents.find(c => c.id.includes('canvas')) || pageComponents[0];
    } else if (pLower.includes('toolbar') || pLower.includes('control') || pLower.includes('bar')) {
      targetComp = pageComponents.find(c => c.id.includes('controls') || c.id.includes('tabs') || c.id.includes('brand')) || pageComponents[0];
    } else if (pLower.includes('header') || pLower.includes('hero') || pLower.includes('banner')) {
      targetComp = pageComponents.find(c => c.id.includes('header') || c.id.includes('hero')) || pageComponents[0];
    } else {
      targetComp = pageComponents[0];
    }
  }

  if (!targetComp) {
    targetComp = COMPONENT_REGISTRY['protein-canvas-container'];
  }

  // Analyze design intent
  const isLarger = pLower.includes('larger') || pLower.includes('expand') || pLower.includes('tall') || pLower.includes('big');
  const isCompact = pLower.includes('compact') || pLower.includes('slim') || pLower.includes('minimal') || pLower.includes('condensed');
  const isDarkGlass = pLower.includes('dark') || pLower.includes('glass') || pLower.includes('deep') || pLower.includes('cyber');
  const isEmerald = pLower.includes('emerald') || pLower.includes('green') || pLower.includes('eco');
  const isCyan = pLower.includes('cyan') || pLower.includes('neon') || pLower.includes('glow');
  const isSideBySide = pLower.includes('side-by-side') || pLower.includes('two-column') || pLower.includes('horizontal');
  const isStacked = pLower.includes('stacked') || pLower.includes('vertical');

  // Compute proposed style modifications
  const proposedStyles = {};
  const currentCompStyles = { ...(targetComp.defaultStyles || {}), ...(currentStyles[targetComp.id] || {}) };
  const affectedComponents = [targetComp.id];
  const fullChangesMap = {};

  // Height / Dimensions
  if (isLarger) {
    if (targetComp.safeProperties.includes('height')) {
      const currentH = parseInt(currentCompStyles.height || '500', 10);
      proposedStyles.height = `${Math.min(currentH + 120, 800)}px`;
    }
  } else if (isCompact) {
    if (targetComp.safeProperties.includes('height')) {
      const currentH = parseInt(currentCompStyles.height || '500', 10);
      proposedStyles.height = `${Math.max(currentH - 100, 360)}px`;
    }
    if (targetComp.safeProperties.includes('padding')) {
      proposedStyles.padding = '10px 14px';
    }
  }

  // Padding & Spacing
  if (isCompact && targetComp.safeProperties.includes('padding')) {
    proposedStyles.padding = '8px 12px';
  } else if (pLower.includes('padding') || pLower.includes('spacious')) {
    proposedStyles.padding = '28px';
  }

  // Background & Appearance
  if (isDarkGlass) {
    if (targetComp.safeProperties.includes('backgroundColor')) {
      proposedStyles.backgroundColor = '#05070d';
    }
    if (targetComp.safeProperties.includes('backdropBlur')) {
      proposedStyles.backdropBlur = '16px';
    }
    if (targetComp.safeProperties.includes('boxShadow')) {
      proposedStyles.boxShadow = '0 12px 36px rgba(0, 0, 0, 0.7)';
    }
  }

  // Color Accents & Borders
  if (isEmerald) {
    if (targetComp.safeProperties.includes('borderColor')) {
      proposedStyles.borderColor = 'rgba(16, 185, 129, 0.4)';
    }
    if (targetComp.safeProperties.includes('boxShadow')) {
      proposedStyles.boxShadow = '0 0 24px rgba(16, 185, 129, 0.2)';
    }
  } else if (isCyan) {
    if (targetComp.safeProperties.includes('borderColor')) {
      proposedStyles.borderColor = 'rgba(6, 182, 212, 0.45)';
    }
    if (targetComp.safeProperties.includes('boxShadow')) {
      proposedStyles.boxShadow = '0 0 28px rgba(6, 182, 212, 0.25)';
    }
  }

  // Rounded corners
  if (pLower.includes('round') || pLower.includes('pill') || pLower.includes('smooth')) {
    if (targetComp.safeProperties.includes('borderRadius')) {
      proposedStyles.borderRadius = '18px';
    }
  } else if (pLower.includes('sharp')) {
    if (targetComp.safeProperties.includes('borderRadius')) {
      proposedStyles.borderRadius = '4px';
    }
  }

  // Specialized scientific properties
  if (targetComp.id === 'protein-canvas-container') {
    if (isSideBySide) {
      proposedStyles.panelArrangement = 'side-by-side';
    } else if (isStacked) {
      proposedStyles.panelArrangement = 'stacked';
    }
    if (pLower.includes('surface')) {
      proposedStyles.defaultStyle = 'surface';
    } else if (pLower.includes('stick')) {
      proposedStyles.defaultStyle = 'stick';
    }
  } else if (targetComp.id === 'phylo-canvas-container') {
    if (pLower.includes('cladogram')) {
      proposedStyles.treeLayout = 'cladogram';
    } else if (pLower.includes('phylogram')) {
      proposedStyles.treeLayout = 'phylogram';
    }
    if (pLower.includes('label')) {
      proposedStyles.labelSize = '15px';
    }
  }

  // Fallback if no specific keyword matched: provide modern aesthetic refinement
  if (Object.keys(proposedStyles).length === 0) {
    if (targetComp.safeProperties.includes('borderRadius')) {
      proposedStyles.borderRadius = '16px';
    }
    if (targetComp.safeProperties.includes('borderColor')) {
      proposedStyles.borderColor = 'rgba(6, 182, 212, 0.35)';
    }
    if (targetComp.safeProperties.includes('boxShadow')) {
      proposedStyles.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
    }
  }

  fullChangesMap[targetComp.id] = proposedStyles;

  // Generate unified diff
  const unifiedDiff = generateUnifiedDiff({
    filePath: targetComp.targetFile,
    componentName: targetComp.name,
    originalStyles: currentCompStyles,
    updatedStyles: { ...currentCompStyles, ...proposedStyles }
  });

  // Construct structured proposal
  return {
    id: `proposal_${Date.now()}`,
    title: `Redesign Proposal for ${targetComp.name}`,
    prompt,
    targetPage: targetComp.page || activePage,
    targetComponentId: targetComp.id,
    targetComponentName: targetComp.name,
    targetFile: targetComp.targetFile,
    rationale: `Applied visual modifications reflecting user request: "${prompt}". Spacing, elevation, and presentation properties adjusted while preserving underlying biological calculation pipelines.`,
    changes: fullChangesMap,
    affectedFiles: [targetComp.targetFile],
    diff: unifiedDiff,
    safetyStatus: 'safe_visual_change',
    risks: 'Low. Modifies presentation CSS styles and container bounds only. Scientific data structures, algorithms, and models remain unmodified.',
    createdAt: new Date().toISOString()
  };
}
