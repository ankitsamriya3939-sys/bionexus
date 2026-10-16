// Laboratory Calculators Engine for BioNexus Studio

export function calculatePcrMasterMix(numReactions = 1, rxnVolume = 25, excessPercent = 10) {
  const totalRxns = numReactions * (1 + excessPercent / 100);
  
  // Standard 1X PCR Mix Recipe per 25 µL reaction:
  // 10X Buffer: 2.5 µL
  // 10 mM dNTPs: 0.5 µL
  // 10 µM Fwd Primer: 0.5 µL
  // 10 µM Rev Primer: 0.5 µL
  // Taq Polymerase (5U/µL): 0.2 µL
  // Template DNA: 1.0 µL (added separately)
  // Nuclease-free H2O: 19.8 µL

  const scale = rxnVolume / 25;

  const components = [
    { name: 'Nuclease-free H₂O', perRxn: 19.8 * scale, unit: 'µL', note: 'Add to master mix' },
    { name: '10X PCR Reaction Buffer', perRxn: 2.5 * scale, unit: 'µL', note: 'Contains 15 mM MgCl₂' },
    { name: '10 mM dNTP Mix', perRxn: 0.5 * scale, unit: 'µL', note: 'Final conc 200 µM each' },
    { name: 'Forward Primer (10 µM)', perRxn: 0.5 * scale, unit: 'µL', note: 'Final conc 0.2 µM' },
    { name: 'Reverse Primer (10 µM)', perRxn: 0.5 * scale, unit: 'µL', note: 'Final conc 0.2 µM' },
    { name: 'Taq DNA Polymerase (5 U/µL)', perRxn: 0.2 * scale, unit: 'µL', note: '1.0 Unit per reaction' },
    { name: 'Template DNA', perRxn: 1.0 * scale, unit: 'µL', note: 'Add individually to tube' },
  ];

  const recipe = components.map(c => ({
    ...c,
    perRxn: parseFloat(c.perRxn.toFixed(2)),
    totalMasterMix: parseFloat((c.name === 'Template DNA' ? c.perRxn : c.perRxn * totalRxns).toFixed(2))
  }));

  return {
    numReactions,
    rxnVolume,
    totalRxnsCalculated: parseFloat(totalRxns.toFixed(1)),
    recipe
  };
}

export function calculateDilution({ c1, v1, c2, v2, solveFor = 'v1' }) {
  // C1 * V1 = C2 * V2
  let result = 0;
  const numC1 = parseFloat(c1);
  const numV1 = parseFloat(v1);
  const numC2 = parseFloat(c2);
  const numV2 = parseFloat(v2);

  if (solveFor === 'v1' && numC1 && numC2 && numV2) {
    result = (numC2 * numV2) / numC1;
  } else if (solveFor === 'c1' && numV1 && numC2 && numV2) {
    result = (numC2 * numV2) / numV1;
  } else if (solveFor === 'v2' && numC1 && numV1 && numC2) {
    result = (numC1 * numV1) / numC2;
  } else if (solveFor === 'c2' && numC1 && numV1 && numV2) {
    result = (numC1 * numV1) / numV2;
  }

  const solventVolume = solveFor === 'v1' ? numV2 - result : 0;

  return {
    value: parseFloat(result.toFixed(3)),
    solveFor,
    solventVolume: parseFloat(solventVolume.toFixed(3))
  };
}

export function calculateMolarity({ mass, molarity, volumeMl, mw, solveFor = 'mass' }) {
  // Mass (g) = Molarity (M) * Volume (L) * MW (g/mol)
  let result = 0;
  const m = parseFloat(mass);
  const M = parseFloat(molarity);
  const volL = parseFloat(volumeMl) / 1000;
  const W = parseFloat(mw);

  if (solveFor === 'mass' && M && volL && W) {
    result = M * volL * W;
  } else if (solveFor === 'molarity' && m && volL && W) {
    result = m / (volL * W);
  } else if (solveFor === 'volume' && m && M && W) {
    result = (m / (M * W)) * 1000; // in mL
  } else if (solveFor === 'mw' && m && M && volL) {
    result = m / (M * volL);
  }

  return {
    value: parseFloat(result.toFixed(4)),
    solveFor
  };
}

export function calculateMediaPrep(mediaType = 'lb_broth', volumeMl = 1000) {
  const volL = volumeMl / 1000;
  
  const recipes = {
    'lb_broth': [
      { ingredient: 'Tryptone', amount: 10 * volL, unit: 'g' },
      { ingredient: 'Yeast Extract', amount: 5 * volL, unit: 'g' },
      { ingredient: 'NaCl', amount: 10 * volL, unit: 'g' },
      { ingredient: 'Deionized H₂O', amount: volumeMl, unit: 'mL' }
    ],
    'lb_agar': [
      { ingredient: 'Tryptone', amount: 10 * volL, unit: 'g' },
      { ingredient: 'Yeast Extract', amount: 5 * volL, unit: 'g' },
      { ingredient: 'NaCl', amount: 10 * volL, unit: 'g' },
      { ingredient: 'Bacto Agar', amount: 15 * volL, unit: 'g' },
      { ingredient: 'Deionized H₂O', amount: volumeMl, unit: 'mL' }
    ],
    'tae_50x': [
      { ingredient: 'Tris Base', amount: 242 * volL, unit: 'g' },
      { ingredient: 'Glacial Acetic Acid', amount: 57.1 * volL, unit: 'mL' },
      { ingredient: '0.5 M EDTA (pH 8.0)', amount: 100 * volL, unit: 'mL' },
      { ingredient: 'Deionized H₂O', amount: volumeMl, unit: 'mL' }
    ],
    'tbe_10x': [
      { ingredient: 'Tris Base', amount: 108 * volL, unit: 'g' },
      { ingredient: 'Boric Acid', amount: 55 * volL, unit: 'g' },
      { ingredient: '0.5 M EDTA (pH 8.0)', amount: 40 * volL, unit: 'mL' },
      { ingredient: 'Deionized H₂O', amount: volumeMl, unit: 'mL' }
    ]
  };

  return {
    mediaType,
    targetVolumeMl: volumeMl,
    ingredients: (recipes[mediaType] || recipes['lb_broth']).map(i => ({
      ...i,
      amount: parseFloat(i.amount.toFixed(2))
    }))
  };
}
