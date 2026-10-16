import React, { useState } from 'react';
import { Calculator, FlaskConical, Beaker, Layers, Info } from 'lucide-react';
import { calculatePcrMasterMix, calculateDilution, calculateMolarity, calculateMediaPrep } from '../utils/labCalculators';

export default function LabUtilities() {
  const [activeTab, setActiveTab] = useState('pcr');

  // 1. PCR Calculator state
  const [numRxns, setNumRxns] = useState(10);
  const [rxnVol, setRxnVol] = useState(25);
  const pcrResult = React.useMemo(() => {
    return calculatePcrMasterMix(parseInt(numRxns) || 1, parseFloat(rxnVol) || 25);
  }, [numRxns, rxnVol]);

  // 2. Dilution state C1V1 = C2V2
  const [c1, setC1] = useState(100);
  const [v1, _setV1] = useState('');
  const [c2, setC2] = useState(10);
  const [v2, setV2] = useState(50);
  const dilutionResult = React.useMemo(() => {
    return calculateDilution({ c1, v1, c2, v2, solveFor: 'v1' });
  }, [c1, v1, c2, v2]);

  // 3. Molarity state
  const [molarity, setMolarity] = useState(0.5); // M
  const [volMl, setVolMl] = useState(250); // mL
  const [mw, setMw] = useState(58.44); // g/mol (NaCl)
  const molarityResult = React.useMemo(() => {
    return calculateMolarity({ molarity, volumeMl: volMl, mw, solveFor: 'mass' });
  }, [molarity, volMl, mw]);

  // 4. Media Prep state
  const [mediaType, setMediaType] = useState('lb_broth');
  const [mediaVol, setMediaVol] = useState(1000);
  const mediaResult = React.useMemo(() => {
    return calculateMediaPrep(mediaType, parseFloat(mediaVol) || 1000);
  }, [mediaType, mediaVol]);

  return (
    <div className="page-fade-in">
      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '10px', borderRadius: '10px' }}>
            <Calculator size={28} color="var(--accent-emerald)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Biochemistry & Molecular Biology Lab Utilities</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Precision calculators for PCR master mix formulations, solution dilutions (C1V1 = C2V2), chemical molarity, and bacterial growth media preparation.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          className={`btn-secondary ${activeTab === 'pcr' ? 'active' : ''}`}
          onClick={() => setActiveTab('pcr')}
        >
          <FlaskConical size={16} /> PCR Master Mix
        </button>
        <button
          className={`btn-secondary ${activeTab === 'dilution' ? 'active' : ''}`}
          onClick={() => setActiveTab('dilution')}
        >
          <Beaker size={16} /> Dilution (C1V1 = C2V2)
        </button>
        <button
          className={`btn-secondary ${activeTab === 'molarity' ? 'active' : ''}`}
          onClick={() => setActiveTab('molarity')}
        >
          <Calculator size={16} /> Molarity Calculator
        </button>
        <button
          className={`btn-secondary ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => setActiveTab('media')}
        >
          <Layers size={16} /> Media Prep (LB/TAE/TBE)
        </button>
      </div>

      {/* 1. PCR Master Mix */}
      {activeTab === 'pcr' && (
        <div className="glass-card page-fade-in">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>PCR Master Mix Formulation</h3>
          <div className="grid-2" style={{ marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label">Number of Reactions (N)</label>
              <input type="number" min="1" className="input-field" value={numRxns} onChange={(e) => setNumRxns(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Reaction Volume per Tube (µL)</label>
              <input type="number" min="5" className="input-field" value={rxnVol} onChange={(e) => setRxnVol(e.target.value)} />
            </div>
          </div>

          <div className="table-container">
            <table className="bio-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>1 Reaction (µL)</th>
                  <th>Master Mix ({numRxns} Rxns + 10% Pipetting Excess)</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {pcrResult.recipe && pcrResult.recipe.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>{item.perRxn} {item.unit}</td>
                    <td style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{item.totalMasterMix} {item.unit}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Dilution Calculator */}
      {activeTab === 'dilution' && (
        <div className="glass-card page-fade-in">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Solution Dilution Calculator (C1V1 = C2V2)</h3>
          <div className="grid-2" style={{ marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label">Stock Concentration (C1)</label>
              <input type="number" step="any" className="input-field" value={c1} onChange={(e) => setC1(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Stock Volume Needed (V1)</label>
              <input
                type="text"
                className="input-field"
                readOnly
                value={dilutionResult.value ? `${dilutionResult.value} mL` : 'Enter values'}
                style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--accent-emerald)', fontWeight: 700 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Final Desired Concentration (C2)</label>
              <input type="number" step="any" className="input-field" value={c2} onChange={(e) => setC2(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Final Desired Volume (V2)</label>
              <input type="number" step="any" className="input-field" value={v2} onChange={(e) => setV2(e.target.value)} />
            </div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: 'var(--accent-emerald)', marginBottom: '4px' }}>Preparation Protocol:</h4>
            <p style={{ fontSize: '0.9rem' }}>
              Add <strong>{dilutionResult.value} mL</strong> of stock solution (C1 = {c1}) and dilute with <strong>{dilutionResult.solventVolume} mL</strong> of solvent/water to achieve a final volume of <strong>{v2} mL</strong> (C2 = {c2}).
            </p>
          </div>
        </div>
      )}

      {/* 3. Molarity Calculator */}
      {activeTab === 'molarity' && (
        <div className="glass-card page-fade-in">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Molarity to Mass Solver</h3>
          <div className="grid-3" style={{ marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Desired Molarity (M = mol/L)</label>
              <input type="number" step="any" className="input-field" value={molarity} onChange={(e) => setMolarity(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Desired Volume (mL)</label>
              <input type="number" step="any" className="input-field" value={volMl} onChange={(e) => setVolMl(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Molecular Weight (g/mol)</label>
              <input type="number" step="any" className="input-field" value={mw} onChange={(e) => setMw(e.target.value)} />
            </div>
          </div>

          <div style={{ background: 'rgba(6, 182, 212, 0.12)', border: '1px solid var(--accent-cyan)', padding: '20px', borderRadius: '12px' }}>
            <h4 style={{ fontSize: '1.2rem', color: 'var(--accent-cyan)', fontWeight: 800 }}>
              Required Solute Mass: {molarityResult.value} grams (g)
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Formula: Mass (g) = Molarity (M) × Volume (L) × Molecular Weight (g/mol)
            </p>
          </div>
        </div>
      )}

      {/* 4. Media Preparation */}
      {activeTab === 'media' && (
        <div className="glass-card page-fade-in">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Culture Media Recipe Generator</h3>
          <div className="grid-2" style={{ marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Select Media / Buffer Recipe</label>
              <select className="select-field" value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
                <option value="lb_broth">LB Broth (Luria-Bertani)</option>
                <option value="lb_agar">LB Agar</option>
                <option value="tae_50x">50X TAE Electrophoresis Buffer</option>
                <option value="tbe_10x">10X TBE Electrophoresis Buffer</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Total Volume Desired (mL)</label>
              <input type="number" step="any" className="input-field" value={mediaVol} onChange={(e) => setMediaVol(e.target.value)} />
            </div>
          </div>

          <div className="table-container">
            <table className="bio-table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Amount Required</th>
                </tr>
              </thead>
              <tbody>
                {mediaResult.ingredients && mediaResult.ingredients.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{item.ingredient}</td>
                    <td style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>{item.amount} {item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Educational & Scientific Documentation Section */}
      <div className="glass-card" style={{ marginTop: '24px', borderTop: '2px solid var(--accent-emerald)' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={18} color="var(--accent-emerald)" /> Lab Utilities — Scientific Guide
        </h3>
        <div className="grid-2" style={{ gap: '20px', fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>What this tool does</h4>
            <p style={{ marginBottom: '12px' }}>
              Calculates molecular biology master mix proportions (with 10% pipetting overage), dilution ratios (C1V1 = C2V2), mass for target molar solutions, and reagent recipes for bacterial growth media (LB broth, LB agar) and TAE/TBE electrophoresis buffers.
            </p>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Who it is for</h4>
            <p style={{ marginBottom: '12px' }}>
              Bench scientists, lab technicians, students, and researchers performing daily reagent preparation, PCR setups, or cell culture media formulation.
            </p>
          </div>
          <div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Produced Outputs</h4>
            <p style={{ marginBottom: '12px' }}>
              Pipetting volumes per component, required solute masses in grams, volume additions in mL, and ingredient breakdowns for autoclaving.
            </p>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Scientific Background</h4>
            <p>
              Accurate reagent stoichiometry and buffer ionic strengths are essential for enzyme kinetics, DNA polymerase fidelity, and cell culture viability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
