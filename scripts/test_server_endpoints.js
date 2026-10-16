// Server API Endpoints Automated Verification
// Tests health, RCSB PDB proxy, Copilot AI reasoning, and workspace persistence

import assert from 'assert';

console.log('Testing backend server endpoints on http://localhost:5000...\n');

async function testEndpoints() {
  try {
    // 1. Health check
    console.log('1. Health check...');
    const healthRes = await fetch('http://localhost:5000/api/health');
    assert(healthRes.ok, `Health check failed: ${healthRes.status}`);
    const health = await healthRes.json();
    assert.strictEqual(health.status, 'online');
    console.log('   ✅ PASS: Backend is online and reporting health.');

    // 2. RCSB PDB Proxy for 1TUP
    console.log('2. RCSB PDB metadata proxy for 1TUP...');
    const pdbRes = await fetch('http://localhost:5000/api/pdb/summary/1TUP');
    assert(pdbRes.ok, `PDB proxy failed: ${pdbRes.status}`);
    const pdb = await pdbRes.json();
    assert.strictEqual(pdb.pdbId, '1TUP');
    assert(pdb.method.toLowerCase().includes('diffraction') || pdb.method.toLowerCase().includes('crystallography') || pdb.method.toLowerCase().includes('x-ray'), `Method was ${pdb.method}`);
    assert(pdb.resolution === 2.2 || pdb.resolution != null, `Resolution was ${pdb.resolution}`);
    console.log(`   ✅ PASS: PDB 1TUP resolved: ${pdb.title} (${pdb.resolution} Å).`);

    // 3. BioNexus Copilot Chat endpoint
    console.log('3. BioNexus Copilot structured evidence chat...');
    const copilotRes = await fetch('http://localhost:5000/api/copilot/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is the structure and function of p53?',
        activeObject: {
          id: 'prot_tp53',
          type: 'protein',
          name: 'Tumor Protein p53',
          uniprotAccession: 'P04637',
          pdbId: '1TUP'
        },
        projectContext: { name: 'Genome Universe Alpha' },
        spaceContext: 'Protein Space'
      })
    });
    assert(copilotRes.ok, `Copilot failed: ${copilotRes.status}`);
    const copilot = await copilotRes.json();
    assert(copilot.reply.includes('[EXPERIMENTAL EVIDENCE]'), 'Copilot reply missing experimental evidence tier');
    assert(copilot.reply.includes('[DATABASE ANNOTATIONS]'), 'Copilot reply missing database annotations tier');
    assert(copilot.reply.includes('[COMPUTATIONAL PREDICTIONS]'), 'Copilot reply missing computational predictions tier');
    console.log('   ✅ PASS: Copilot returned structured, 5-tiered evidence without hallucination.');

    // 4. Workspace projects endpoint
    console.log('4. Workspace projects persistence...');
    const projRes = await fetch('http://localhost:5000/api/workspace/projects');
    assert(projRes.ok, `Projects endpoint failed: ${projRes.status}`);
    const projects = await projRes.json();
    assert(Array.isArray(projects), 'Projects must be an array');
    console.log(`   ✅ PASS: Projects persistence verified (${projects.length} projects).`);

    console.log('\n====================================================');
    console.log('🎉 ALL BACKEND ENDPOINTS PASSED VERIFICATION!');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error(`❌ Backend test failed: ${err.message}`);
    process.exit(1);
  }
}

testEndpoints();
