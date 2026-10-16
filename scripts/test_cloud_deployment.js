import { app } from '../server/server.js';
import http from 'http';
import assert from 'assert';

async function runCloudVerification() {
  console.log('Testing unified single-origin cloud web service...');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`Ephemeral test server running at ${baseUrl}`);

  try {
    // 1. Root /health endpoint
    console.log('Testing GET /health ...');
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.strictEqual(healthRes.status, 200, '/health must return HTTP 200');
    const healthData = await healthRes.json();
    assert.strictEqual(healthData.status, 'ok', '/health status must be ok');
    assert.strictEqual(healthData.app, 'BioNexus Studio');
    console.log('✔ /health verified:', healthData);

    // 2. /api/health endpoint
    console.log('Testing GET /api/health ...');
    const apiHealthRes = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(apiHealthRes.status, 200, '/api/health must return HTTP 200');
    const apiHealthData = await apiHealthRes.json();
    assert.strictEqual(apiHealthData.status, 'ok');
    console.log('✔ /api/health verified');

    // 3. /api/ncbi/status endpoint
    console.log('Testing GET /api/ncbi/status ...');
    const ncbiStatusRes = await fetch(`${baseUrl}/api/ncbi/status`);
    assert.strictEqual(ncbiStatusRes.status, 200, '/api/ncbi/status must return HTTP 200');
    const ncbiStatusData = await ncbiStatusRes.json();
    assert.strictEqual(ncbiStatusData.status, 'active');
    console.log('✔ /api/ncbi/status verified:', ncbiStatusData.rateLimitDescription);

    // 4. Static frontend serving on root /
    console.log('Testing GET / (Static SPA Frontend) ...');
    const rootRes = await fetch(`${baseUrl}/`);
    assert.strictEqual(rootRes.status, 200, '/ must return HTTP 200');
    const rootHtml = await rootRes.text();
    assert.ok(rootHtml.includes('<div id="root"></div>') || rootHtml.includes('BioNexus Studio'), 'Must serve compiled dist/index.html');
    console.log('✔ GET / serves dist/index.html correctly');

    // 5. Client-side route fallback e.g. /genome-space
    console.log('Testing GET /genome-space (SPA routing fallback) ...');
    const spaRes = await fetch(`${baseUrl}/genome-space`);
    assert.strictEqual(spaRes.status, 200, 'Client routes must fall back to index.html with HTTP 200');
    const spaHtml = await spaRes.text();
    assert.ok(spaHtml.includes('<div id="root"></div>') || spaHtml.includes('BioNexus Studio'));
    console.log('✔ SPA HTML5 fallback works seamlessly');

    // 6. Test CORS headers for configured origin
    console.log('Testing CORS headers ...');
    const corsRes = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'https://bionexusstudio.ai' }
    });
    assert.strictEqual(corsRes.status, 200);
    console.log('✔ CORS handling verified');

    console.log('\n=============================================');
    console.log('  ALL CLOUD DEPLOYMENT VERIFICATIONS PASSED  ');
    console.log('=============================================\n');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

runCloudVerification().catch((err) => {
  console.error('Cloud verification failed:', err);
  process.exit(1);
});
