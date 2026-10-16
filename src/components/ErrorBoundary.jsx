import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('BioNexus Studio Caught Module Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card page-fade-in" style={{ padding: '40px', textAlign: 'center', margin: '24px auto', maxWidth: '650px', border: '1px solid var(--accent-rose)' }}>
          <div style={{
            display: 'inline-flex',
            background: 'rgba(244, 63, 94, 0.15)',
            color: 'var(--accent-rose)',
            padding: '12px',
            borderRadius: '50%',
            marginBottom: '16px'
          }}>
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>Module Encountered an Issue</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.5 }}>
            A temporary rendering error occurred in this workspace view. Your saved sequences and workspace data remain completely safe.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={this.handleReset}>
              <RefreshCw size={16} /> Reload Workspace Module
            </button>
            <button className="btn-secondary" onClick={() => window.location.href = '/'}>
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
