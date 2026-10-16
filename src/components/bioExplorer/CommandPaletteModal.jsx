import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Database, Dna, Boxes, Pin, 
  History, ArrowRight, CornerDownLeft, X, Sparkles 
} from 'lucide-react';

export default function CommandPaletteModal({
  isOpen,
  onClose,
  onSelectSourceTab,
  onExecuteSearch,
  recentSearches = [],
  pinnedRecords = [],
  onOpenRecord
}) {
  const [filterText, setFilterText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setFilterText('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Aggregate command options
  const defaultItems = [
    // Source Jump Options
    { id: 'src_all', category: 'Databases', title: 'Switch to All Sources', subtitle: 'Simultaneous parallel search', icon: Database, action: () => onSelectSourceTab('all') },
    { id: 'src_ncbi', category: 'Databases', title: 'Switch to NCBI Entrez', subtitle: 'Nucleotide, Protein, Gene, PubMed', icon: Database, action: () => onSelectSourceTab('ncbi') },
    { id: 'src_uniprot', category: 'Databases', title: 'Switch to UniProt Knowledgebase', subtitle: 'Swiss-Prot & TrEMBL proteins', icon: Boxes, action: () => onSelectSourceTab('uniprot') },
    { id: 'src_ena', category: 'Databases', title: 'Switch to ENA / EMBL-EBI', subtitle: 'European Nucleotide Archive', icon: Dna, action: () => onSelectSourceTab('ena') },
    
    // Example Scientific Benchmarks
    { id: 'ex_brca1', category: 'Examples', title: 'Search "BRCA1"', subtitle: 'Breast cancer type 1 susceptibility gene', icon: Sparkles, action: () => onExecuteSearch('BRCA1') },
    { id: 'ex_tp53', category: 'Examples', title: 'Search "TP53"', subtitle: 'Tumor suppressor p53', icon: Sparkles, action: () => onExecuteSearch('TP53') },
    { id: 'ex_human', category: 'Examples', title: 'Search "Homo sapiens"', subtitle: 'Human species taxon reference', icon: Sparkles, action: () => onExecuteSearch('Homo sapiens') },
    { id: 'ex_nm', category: 'Examples', title: 'Search RefSeq "NM_000546.6"', subtitle: 'Human TP53 transcript variant 1', icon: Dna, action: () => onExecuteSearch('NM_000546.6') },
    { id: 'ex_uniprot', category: 'Examples', title: 'Search UniProt "P04637"', subtitle: 'Human Cellular tumor antigen p53', icon: Boxes, action: () => onExecuteSearch('P04637') }
  ];

  // Add Recent Searches
  const recentItems = recentSearches.map((term, i) => ({
    id: `recent_${i}`,
    category: 'Recent Searches',
    title: term,
    subtitle: 'Recent local search query',
    icon: History,
    action: () => onExecuteSearch(term)
  }));

  // Add Pinned Records
  const pinnedItems = pinnedRecords.map((r) => ({
    id: `pinned_${r.id}`,
    category: 'Pinned Records',
    title: `${r.accession} - ${r.title}`,
    subtitle: `${r.source} • ${r.organism}`,
    icon: Pin,
    action: () => onOpenRecord(r)
  }));

  const allItems = [...recentItems, ...pinnedItems, ...defaultItems];

  const filteredItems = allItems.filter(item => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q);
  });

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 10, 20, 0.75)',
      backdropFilter: 'blur(6px)',
      zIndex: 1400,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: '10vh'
    }} onClick={onClose}>
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '620px',
          background: '#0c1322',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '12px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Search Input Bar */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Search size={18} color="#06b6d4" />
          <input
            ref={inputRef}
            type="text"
            value={filterText}
            onChange={e => {
              setFilterText(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, database name, or search query..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: '0.96rem',
              fontFamily: "'Inter', sans-serif"
            }}
          />
          <kbd style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '0.72rem',
            color: '#94a3b8'
          }}>
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div style={{
          maxHeight: '360px',
          overflowY: 'auto',
          padding: '8px'
        }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              No matching commands or benchmarks found.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = selectedIndex === idx;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                    border: `1px solid ${isSelected ? 'rgba(6, 182, 212, 0.3)' : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all 0.1s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      padding: '6px',
                      borderRadius: '6px',
                      background: isSelected ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      color: isSelected ? '#38bdf8' : '#94a3b8'
                    }}>
                      <Icon size={16} />
                    </div>

                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isSelected ? '#f8fafc' : '#cbd5e1' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                      {item.category}
                    </span>
                    {isSelected && <CornerDownLeft size={13} color="#06b6d4" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          background: '#090f1d',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.72rem',
          color: '#64748b'
        }}>
          <span>Use ↑↓ arrows to navigate, Enter to select</span>
          <span>BioNexus Command Palette</span>
        </div>
      </div>
    </div>
  );
}
