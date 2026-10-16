import React, { useState } from 'react';
import { 
  FileText, ExternalLink, Plus, Search, Filter, BookOpen, 
  FlaskConical, Database, Cpu, Lightbulb, BookmarkPlus, 
  Download, CheckCircle2, ShieldCheck, Tag 
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { createEvidenceRecord, EvidenceLevels, ObjectTypes } from '../models/scientificModel';

export default function EvidenceSpace() {
  const { 
    scientificObjects, 
    selectedScientificObject, 
    registerScientificObject,
    inspectObjectInSpace 
  } = useWorkspace();

  const [filterLevel, setFilterLevel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Evidence Form State
  const [newTitle, setNewTitle] = useState('');
  const [newAuthors, setNewAuthors] = useState('');
  const [newJournal, setNewJournal] = useState('');
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newPmid, setNewPmid] = useState('');
  const [newDoi, setNewDoi] = useState('');
  const [newLevel, setNewLevel] = useState(EvidenceLevels.EXPERIMENTAL);
  const [newSummary, setNewSummary] = useState('');
  const [targetId, setTargetId] = useState('');

  // Collect all evidence records currently in project
  const evidenceRecords = scientificObjects.filter(o => o.type === ObjectTypes.EVIDENCE);

  const handleAddEvidence = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const record = createEvidenceRecord({
      title: newTitle.trim(),
      authors: newAuthors.trim(),
      journal: newJournal.trim(),
      year: parseInt(newYear, 10) || new Date().getFullYear(),
      pmid: newPmid.trim() || null,
      doi: newDoi.trim() || null,
      confidenceLevel: newLevel,
      summary: newSummary.trim(),
      targetObjectId: targetId || selectedScientificObject?.id || null
    });

    registerScientificObject(record);

    // Reset form
    setNewTitle('');
    setNewAuthors('');
    setNewJournal('');
    setNewPmid('');
    setNewDoi('');
    setNewSummary('');
    setShowAddModal(false);
  };

  const filteredRecords = evidenceRecords.filter(rec => {
    const matchesFilter = filterLevel === 'all' || rec.confidenceLevel === filterLevel;
    const matchesQuery = !searchQuery || 
      rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rec.authors && rec.authors.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (rec.summary && rec.summary.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesQuery;
  });

  const getLevelBadge = (level) => {
    switch (level) {
      case EvidenceLevels.EXPERIMENTAL:
        return (
          <span className="logo-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <FlaskConical size={12} /> Experimental
          </span>
        );
      case EvidenceLevels.DATABASE_ANNOTATION:
        return (
          <span className="logo-badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
            <Database size={12} /> Curated Database
          </span>
        );
      case EvidenceLevels.COMPUTATIONAL_PREDICTION:
        return (
          <span className="logo-badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-violet)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            <Cpu size={12} /> In Silico Prediction
          </span>
        );
      case EvidenceLevels.HYPOTHESIS:
        return (
          <span className="logo-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <Lightbulb size={12} /> Working Hypothesis
          </span>
        );
      default:
        return null;
    }
  };

  const exportBibliographyBibtex = () => {
    let bib = '';
    filteredRecords.forEach((rec, idx) => {
      const citeKey = (rec.authors ? rec.authors.split(' ')[0] : 'Ref') + (rec.year || idx);
      bib += `@article{${citeKey},\n`;
      bib += `  title = {${rec.title}},\n`;
      if (rec.authors) bib += `  author = {${rec.authors}},\n`;
      if (rec.journal) bib += `  journal = {${rec.journal}},\n`;
      if (rec.year) bib += `  year = {${rec.year}},\n`;
      if (rec.doi) bib += `  doi = {${rec.doi}},\n`;
      bib += `}\n\n`;
    });

    const blob = new Blob([bib], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BioNexus_Bibliography_${new Date().toISOString().slice(0, 10)}.bib`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="page-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div className="card-header" style={{ marginBottom: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="logo-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)' }}>
              Evidence Space
            </span>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
              Scientific Evidence & Literature Repository
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
            Ground your computational models in peer-reviewed experimental literature, Swiss-Prot annotations, and documented provenance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={exportBibliographyBibtex}>
            <Download size={16} /> Export BibTeX (.bib)
          </button>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add Evidence Record
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
              placeholder="Search evidence titles, authors, PMIDs, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Evidence Tier Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              className="btn-secondary"
              style={{
                fontSize: '0.78rem',
                padding: '6px 12px',
                borderColor: filterLevel === 'all' ? 'var(--accent-cyan)' : 'var(--border-color)',
                color: filterLevel === 'all' ? 'var(--accent-cyan)' : 'var(--text-secondary)'
              }}
              onClick={() => setFilterLevel('all')}
            >
              All Evidence ({evidenceRecords.length})
            </button>
            <button
              className="btn-secondary"
              style={{
                fontSize: '0.78rem',
                padding: '6px 12px',
                borderColor: filterLevel === EvidenceLevels.EXPERIMENTAL ? 'var(--accent-emerald)' : 'var(--border-color)',
                color: filterLevel === EvidenceLevels.EXPERIMENTAL ? 'var(--accent-emerald)' : 'var(--text-secondary)'
              }}
              onClick={() => setFilterLevel(EvidenceLevels.EXPERIMENTAL)}
            >
              🔬 Experimental
            </button>
            <button
              className="btn-secondary"
              style={{
                fontSize: '0.78rem',
                padding: '6px 12px',
                borderColor: filterLevel === EvidenceLevels.DATABASE_ANNOTATION ? 'var(--accent-cyan)' : 'var(--border-color)',
                color: filterLevel === EvidenceLevels.DATABASE_ANNOTATION ? 'var(--accent-cyan)' : 'var(--text-secondary)'
              }}
              onClick={() => setFilterLevel(EvidenceLevels.DATABASE_ANNOTATION)}
            >
              📖 Database Curated
            </button>
            <button
              className="btn-secondary"
              style={{
                fontSize: '0.78rem',
                padding: '6px 12px',
                borderColor: filterLevel === EvidenceLevels.COMPUTATIONAL_PREDICTION ? 'var(--accent-violet)' : 'var(--border-color)',
                color: filterLevel === EvidenceLevels.COMPUTATIONAL_PREDICTION ? 'var(--accent-violet)' : 'var(--text-secondary)'
              }}
              onClick={() => setFilterLevel(EvidenceLevels.COMPUTATIONAL_PREDICTION)}
            >
              💻 Predictions
            </button>
          </div>
        </div>
      </div>

      {/* Evidence Cards Grid */}
      {filteredRecords.length > 0 ? (
        <div className="grid-2" style={{ gap: '20px' }}>
          {filteredRecords.map(rec => (
            <div key={rec.id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, lineHeight: 1.4 }}>
                    {rec.title}
                  </h3>
                  {getLevelBadge(rec.confidenceLevel)}
                </div>

                {rec.authors && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    <strong>Authors:</strong> {rec.authors} ({rec.year || 'N/D'})
                  </div>
                )}

                {rec.journal && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', marginBottom: '10px' }}>
                    <em>{rec.journal}</em>
                  </div>
                )}

                {rec.summary && (
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
                    {rec.summary}
                  </p>
                )}
              </div>

              {/* Card Footer with Citations & Cross-Space Links */}
              <div style={{
                borderTop: '1px solid var(--border-color)',
                paddingTop: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
                  {rec.pmid && (
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${rec.pmid}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="logo-badge"
                      style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}
                    >
                      PMID: {rec.pmid} <ExternalLink size={10} />
                    </a>
                  )}
                  {rec.doi && (
                    <a
                      href={`https://doi.org/${rec.doi}`}
                      target="_blank"
                      rel="noreferrer"
                      className="logo-badge"
                      style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}
                    >
                      DOI <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <BookOpen size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>No Evidence Records Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '440px', margin: '6px auto 16px' }}>
            No scientific literature or empirical records currently match your filters. Add peer-reviewed papers or link annotations from NCBI and UniProt.
          </p>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add First Evidence Record
          </button>
        </div>
      )}

      {/* Modal: Add Evidence Record */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-card page-fade-in" style={{ width: '100%', maxWidth: '640px', padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <h3 className="card-title">
                <FileText size={18} color="var(--accent-cyan)" /> Record Scientific Evidence
              </h3>
              <button className="btn-icon" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddEvidence} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Article / Paper Title *</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  placeholder="e.g. Crystal structure of human TP53 core domain bound to DNA..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Authors</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Cho Y, Gorina S, Jeffrey PD, Pavletich NP"
                    value={newAuthors}
                    onChange={(e) => setNewAuthors(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <input
                    type="number"
                    className="input-field"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Journal / Repository</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Science / Nature / PNAS"
                    value={newJournal}
                    onChange={(e) => setNewJournal(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Evidence Confidence Tier</label>
                  <select
                    className="select-field"
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value)}
                  >
                    <option value={EvidenceLevels.EXPERIMENTAL}>🔬 Experimental (Assay/Crystallography)</option>
                    <option value={EvidenceLevels.DATABASE_ANNOTATION}>📖 Database Annotation (Swiss-Prot/RefSeq)</option>
                    <option value={EvidenceLevels.COMPUTATIONAL_PREDICTION}>💻 Computational Prediction (In silico)</option>
                    <option value={EvidenceLevels.HYPOTHESIS}>💡 Working Hypothesis</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">PubMed PMID</label>
                  <input
                    type="text"
                    className="input-field font-mono"
                    placeholder="e.g. 8023157"
                    value={newPmid}
                    onChange={(e) => setNewPmid(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">DOI Identifier</label>
                  <input
                    type="text"
                    className="input-field font-mono"
                    placeholder="e.g. 10.1126/science.8023157"
                    value={newDoi}
                    onChange={(e) => setNewDoi(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Findings & Evidence Summary</label>
                <textarea
                  className="textarea-field"
                  rows={3}
                  placeholder="Key molecular mechanism, catalytic residues, or phenotypic observation..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Evidence Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
