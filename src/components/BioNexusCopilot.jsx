import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Send, RefreshCw, BookmarkPlus, Copy, Check, ExternalLink, 
  HelpCircle, AlertCircle, ShieldCheck, Database, FlaskConical, Cpu, 
  Lightbulb, AlertTriangle, Layers, X, Pin 
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { askBioNexusCopilot } from '../utils/copilotEngine';

const SUGGESTED_QUESTIONS = [
  { label: 'Structural Evidence', prompt: 'Summarize experimentally verified folding, resolution, and ligand binding sites.' },
  { label: 'Evolutionary Rate', prompt: 'Evaluate nucleotide substitution divergence between selected homologs.' },
  { label: 'Functional Mutations', prompt: 'What missense mutations or catalytic motifs are documented for this object?' },
  { label: 'Identify Uncertainties', prompt: 'What evidence is missing or based solely on computational prediction?' }
];

export default function BioNexusCopilot({ isDrawer = false, onClose = () => {} }) {
  const { 
    activeProject, 
    selectedScientificObject, 
    activeSpace,
    scientificObjects,
    selectScientificObject 
  } = useWorkspace();

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Welcome to **BioNexus Copilot** — your context-aware scientific AI assistant.\n\nI am grounded in your active project **"${activeProject?.name || 'BioNexus Studio'}"** and currently tracking: **${selectedScientificObject?.name || 'Global Workspace'}**.\n\nEvery finding is strictly organized into validated evidence tiers (Experimental, Curated Databases, Computational Predictions, Hypotheses, and Missing Evidence). How may I assist your research?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isSending, setIsSending] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isSending) return;

    const userMsg = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const data = await askBioNexusCopilot({
        message: query,
        activeObject: selectedScientificObject,
        projectContext: activeProject,
        spaceContext: activeSpace
      });

      const assistantMsg = {
        role: 'assistant',
        content: data.reply || 'Analysis completed with no additional details.',
        mode: data.mode,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Analysis Notice**: An unexpected issue occurred: ${err.message || 'Error processing request'}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // Helper to format evidence tiers with structured UI badges
  const renderFormattedContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (line.includes('[EXPERIMENTAL EVIDENCE]')) {
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '10px 0 4px', color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.85rem' }}>
            <FlaskConical size={15} />
            <span>EXPERIMENTAL EVIDENCE</span>
          </div>
        );
      }
      if (line.includes('[DATABASE ANNOTATIONS]')) {
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '10px 0 4px', color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.85rem' }}>
            <Database size={15} />
            <span>DATABASE ANNOTATIONS (CURATED)</span>
          </div>
        );
      }
      if (line.includes('[COMPUTATIONAL PREDICTIONS]')) {
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '10px 0 4px', color: 'var(--accent-violet)', fontWeight: 700, fontSize: '0.85rem' }}>
            <Cpu size={15} />
            <span>COMPUTATIONAL PREDICTIONS</span>
          </div>
        );
      }
      if (line.includes('[HYPOTHESES & MODEL INFERENCES]')) {
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '10px 0 4px', color: 'var(--accent-amber)', fontWeight: 700, fontSize: '0.85rem' }}>
            <Lightbulb size={15} />
            <span>HYPOTHESES & UNCERTAINTIES</span>
          </div>
        );
      }
      if (line.includes('[MISSING OR UNAVAILABLE EVIDENCE]')) {
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '10px 0 4px', color: 'var(--accent-rose)', fontWeight: 700, fontSize: '0.85rem' }}>
            <AlertTriangle size={15} />
            <span>MISSING OR UNAVAILABLE EVIDENCE</span>
          </div>
        );
      }

      // Standard markdown bold rendering
      const boldFormatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return (
        <p 
          key={idx} 
          style={{ margin: '4px 0', lineHeight: 1.5, fontSize: '0.85rem' }}
          dangerouslySetInnerHTML={{ __html: boldFormatted }}
        />
      );
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      borderRadius: isDrawer ? '16px 0 0 16px' : '12px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex'
          }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>BioNexus Copilot</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={12} /> Grounded in scientific evidence
            </div>
          </div>
        </div>

        {isDrawer && (
          <button className="btn-icon" onClick={onClose} title="Close Copilot Drawer">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Active Context Banner */}
      <div style={{
        padding: '10px 18px',
        background: 'rgba(6, 182, 212, 0.05)',
        borderBottom: '1px solid rgba(6, 182, 212, 0.15)',
        fontSize: '0.78rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Pin size={13} color="var(--accent-cyan)" />
          <span style={{ color: 'var(--text-muted)' }}>Target:</span>
          <strong style={{ color: 'var(--accent-cyan)' }}>
            {selectedScientificObject ? `${selectedScientificObject.name || selectedScientificObject.id} (${selectedScientificObject.type})` : 'Whole Project Context'}
          </strong>
        </div>

        <span style={{
          fontSize: '0.72rem',
          padding: '2px 8px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          color: 'var(--text-muted)'
        }}>
          Space: {activeSpace.toUpperCase()}
        </span>
      </div>

      {/* Message Stream */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{
                maxWidth: '90%',
                padding: '12px 16px',
                borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                background: isUser ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'var(--bg-card)',
                color: isUser ? '#070b14' : 'var(--text-primary)',
                border: isUser ? 'none' : '1px solid var(--border-color)',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)'
              }}>
                {isUser ? (
                  <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600 }}>{msg.content}</p>
                ) : (
                  <div>{renderFormattedContent(msg.content)}</div>
                )}
              </div>

              {/* Message Footer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '4px',
                fontSize: '0.7rem',
                color: 'var(--text-muted)'
              }}>
                <span>{msg.timestamp}</span>
                {!isUser && (
                  <button
                    onClick={() => handleCopy(msg.content, idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: copiedIdx === idx ? 'var(--accent-emerald)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: 0
                    }}
                    title="Copy response to clipboard"
                  >
                    {copiedIdx === idx ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedIdx === idx ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isSending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontSize: '0.82rem', padding: '8px' }}>
            <RefreshCw className="spin" size={16} />
            <span>Consulting biological evidence matrices & model parameters...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        background: 'rgba(11, 15, 25, 0.6)'
      }}>
        {SUGGESTED_QUESTIONS.map((chip, idx) => (
          <button
            key={idx}
            className="btn-secondary"
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              borderRadius: '14px'
            }}
            onClick={() => handleSendMessage(chip.prompt)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div style={{
        padding: '14px 16px',
        borderTop: '1px solid var(--border-color)',
        background: 'rgba(15, 23, 42, 0.95)',
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
      }}>
        <input
          type="text"
          className="input-field"
          style={{ flex: 1, height: '40px', fontSize: '0.85rem' }}
          placeholder="Ask Copilot about mutations, structures, or evolution..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          disabled={isSending}
        />
        <button
          className="btn-primary"
          style={{ height: '40px', padding: '0 16px' }}
          onClick={() => handleSendMessage()}
          disabled={isSending || !inputMessage.trim()}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
