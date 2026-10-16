/**
 * BioNexus UI Studio — Automated Verification Test Suite
 * Tests AI redesign endpoint, drafts CRUD, patch application, and safety guards.
 */

import assert from 'assert';

console.log('🧪 Starting BioNexus UI Studio Automated Tests on http://localhost:5000...\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  function report(condition, name) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name}`);
    }
  }

  try {
    // 1. Health check
    const healthRes = await fetch('http://localhost:5000/api/health');
    const health = await healthRes.json();
    report(healthRes.ok && health.status === 'online', 'Server /api/health responds online');

    // 2. Drafts endpoint GET
    const draftsRes = await fetch('http://localhost:5000/api/ui-studio/drafts');
    const draftsData = await draftsRes.json();
    report(draftsRes.ok && Array.isArray(draftsData.drafts), 'GET /api/ui-studio/drafts returns drafts array');

    // 3. Drafts endpoint POST (Save a draft)
    const testDraftId = 'test-draft-' + Date.now();
    const testDraft = {
      id: testDraftId,
      name: 'Automated Test Draft',
      targetPage: 'protein',
      targetComponentId: 'protein-canvas-container',
      styles: {
        'protein-canvas-container': {
          height: '620px',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(6, 182, 212, 0.25)'
        }
      },
      scientificSettings: {
        canvasHeight: 620,
        renderStyle: 'cartoon',
        colorScheme: 'spectrum'
      }
    };

    const draftSaveRes = await fetch('http://localhost:5000/api/ui-studio/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testDraft)
    });
    const draftSaveData = await draftSaveRes.json();
    report(draftSaveRes.ok && draftSaveData.draft?.id === testDraftId, 'POST /api/ui-studio/drafts saves draft');

    // 4. Verify draft persistence
    const draftsVerifyRes = await fetch('http://localhost:5000/api/ui-studio/drafts');
    const draftsVerifyData = await draftsVerifyRes.json();
    const foundDraft = draftsVerifyData.drafts?.some(d => d.id === testDraftId);
    report(foundDraft, 'Draft persists and appears in GET /api/ui-studio/drafts');

    // 5. AI Redesign prompt processing
    const aiProposalRes = await fetch('http://localhost:5000/api/ui-studio/ai-redesign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Redesign the protein workspace with a larger central 3D viewer, compact toolbars, a left structure panel, and a right properties inspector.',
        targetPage: 'protein',
        targetComponentId: 'protein-canvas-container',
        currentStyles: testDraft.styles
      })
    });
    const aiProposalData = await aiProposalRes.json();
    report(
      aiProposalRes.ok &&
      aiProposalData.proposal &&
      aiProposalData.proposal.targetComponentId === 'protein-canvas-container',
      'POST /api/ui-studio/ai-redesign generates structured proposal'
    );

    report(
      aiProposalData.proposal?.styles &&
      Object.keys(aiProposalData.proposal.styles).length > 0,
      'AI proposal includes style changes'
    );

    report(
      (aiProposalData.proposal?.risks || aiProposalData.proposal?.riskLevel) &&
      aiProposalData.proposal?.rationale,
      'AI proposal contains risk assessment and design rationale'
    );

    report(
      aiProposalData.proposal?.diff &&
      aiProposalData.proposal?.diff.includes('--- a/'),
      'AI proposal contains unified git diff representation'
    );

    // 6. Security guard tests: Reject unauthorized paths outside src/
    const evilPatchRes = await fetch('http://localhost:5000/api/ui-studio/apply-patch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetFile: '../etc/passwd',
        diff: 'some diff'
      })
    });
    report(evilPatchRes.status === 400 || evilPatchRes.status === 403, 'Security Guard: Rejects path traversal outside src/');

    // 7. Security guard tests: Reject modifications to server/ or backend files
    const evilServerPatchRes = await fetch('http://localhost:5000/api/ui-studio/apply-patch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetFile: 'server/server.js',
        diff: 'some diff'
      })
    });
    report(evilServerPatchRes.status === 400 || evilServerPatchRes.status === 403, 'Security Guard: Rejects direct backend modifications');

    // 8. Delete the test draft
    const deleteRes = await fetch(`http://localhost:5000/api/ui-studio/drafts/${testDraftId}`, {
      method: 'DELETE'
    });
    report(deleteRes.ok, 'DELETE /api/ui-studio/drafts/:id cleans up draft');

    console.log(`\n📊 Results: ${passed}/${total} UI Studio tests passed.\n`);
    if (passed === total) {
      console.log('🎉 All UI Studio verification tests PASSED successfully!\n');
    } else {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exitCode = 1;
  }
}

runTests();
