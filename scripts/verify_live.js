// Detailed verification of live site
async function verify() {
  const url = 'https://bionexux-bbc9b.web.app';
  const res = await fetch(url);
  const html = await res.text();

  console.log('Live HTTP Status:', res.status);
  const scriptMatch = html.match(/src="(\/assets\/[^"]+)"/);
  if (scriptMatch) {
    const scriptUrl = url + scriptMatch[1];
    console.log('Main Script URL:', scriptUrl);
    const scriptRes = await fetch(scriptUrl);
    console.log('Main Script HTTP Status:', scriptRes.status);
    const scriptContent = await scriptRes.text();
    console.log('Script Length:', scriptContent.length, 'bytes');
    console.log('Has Copilot Drawer in Bundle:', scriptContent.includes('copilot drawer'));
  }
}

verify();
