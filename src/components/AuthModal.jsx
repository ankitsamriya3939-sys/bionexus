import React, { useState, useEffect } from 'react';
import { 
  Dna, Lock, Mail, User, ShieldCheck, ArrowRight, X, AlertCircle, 
  Smartphone, Monitor, Tablet, KeyRound, CheckCircle2, Trash2, 
  AlertTriangle, Fingerprint, RefreshCw
} from 'lucide-react';
import { signUp, signIn, verifyAndAuthorizeDevice, getTrustedDevices, revokeDevice, resetPassword } from '../services/authService';
import { detectCurrentDevice } from '../services/deviceService';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, requestedTab }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot' | 'device-challenge' | 'devices'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Researcher');
  const [institution, setInstitution] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  
  // New Device Verification State
  const [challengeDevice, setChallengeDevice] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [mockDemoCode, setMockDemoCode] = useState('');
  
  // Trusted Devices Manager State
  const [trustedDevicesList, setTrustedDevicesList] = useState([]);
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Current Device Info
  const [currentDevice, setCurrentDevice] = useState(() => detectCurrentDevice());

  useEffect(() => {
    setCurrentDevice(detectCurrentDevice());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await signIn({ email, password });
      if (res.isNewDevice) {
        // Trigger New Device Security Check!
        setChallengeDevice(res.challengeDevice);
        setMockDemoCode(res.mockVerificationCode);
        setMode('device-challenge');
        setMessage('New device detected. Enter the 6-digit security verification code to authorize.');
      } else if (res.user) {
        onAuthSuccess(res.user, requestedTab);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDevice = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const user = await verifyAndAuthorizeDevice({
        email,
        code: verificationCode,
        trustThisDevice: trustDevice
      });
      setMessage('Device authorized successfully!');
      setTimeout(() => {
        onAuthSuccess(user, requestedTab);
        onClose();
      }, 600);
    } catch (err) {
      setError(err.message || 'Device verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const user = await signUp({ name, email, password, role, institution });
      onAuthSuccess(user, requestedTab);
      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const loadTrustedDevices = async () => {
    if (!email) return;
    try {
      const list = await getTrustedDevices(email);
      setTrustedDevicesList(list);
      setMode('devices');
    } catch {
      setError('Unable to load device registry.');
    }
  };

  const handleRevokeDevice = async (deviceId) => {
    try {
      await revokeDevice(email, deviceId);
      setTrustedDevicesList(prev => prev.filter(d => d.id !== deviceId));
      setMessage('Device authorization revoked.');
    } catch {
      setError('Failed to revoke device.');
    }
  };

  const getDeviceIcon = (type) => {
    if (type === 'Mobile') return <Smartphone size={18} color="var(--accent-cyan)" />;
    if (type === 'Tablet') return <Tablet size={18} color="var(--accent-emerald)" />;
    return <Monitor size={18} color="var(--accent-cyan)" />;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(14px)',
      zIndex: 1200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-card page-fade-in" style={{
        width: '100%',
        maxWidth: mode === 'devices' ? '540px' : '480px',
        border: '1px solid rgba(6, 182, 212, 0.4)',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.95)',
        maxHeight: '92vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px', position: 'relative' }}>
          <button className="btn-icon" style={{ position: 'absolute', right: 0, top: 0 }} onClick={onClose}>
            <X size={18} />
          </button>
          
          <div style={{
            display: 'inline-flex',
            background: 'linear-gradient(135deg, #06b6d4, #10b981)',
            padding: '12px',
            borderRadius: '16px',
            marginBottom: '10px',
            boxShadow: '0 0 24px rgba(6, 182, 212, 0.45)'
          }}>
            <Dna size={30} color="#0b0f19" />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            BioNexus <span style={{ color: 'var(--accent-cyan)' }}>Studio</span>
          </h2>
          
          {/* Active Device Integrity Tag */}
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '20px', 
            padding: '4px 12px', 
            marginTop: '8px', 
            fontSize: '0.75rem', 
            color: 'var(--text-muted)' 
          }}>
            {getDeviceIcon(currentDevice.type)}
            <span>Detected: <strong>{currentDevice.name}</strong></span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
          </div>
        </div>

        {/* Protected Tab Notice */}
        {requestedTab && mode !== 'device-challenge' && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '0.82rem',
            color: '#f59e0b',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShieldCheck size={16} />
            <span>Sign in required to access <strong>{requestedTab.toUpperCase()}</strong> workspace</span>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '0.82rem',
            color: '#ef4444',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '0.82rem',
            color: '#10b981',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            <span>{message}</span>
          </div>
        )}

        {/* ---------------- MODE 1: SIGN IN ---------------- */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  className="input-field"
                  style={{ paddingLeft: '38px' }}
                  placeholder="researcher@institution.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  className="input-field"
                  style={{ paddingLeft: '38px' }}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                  style={{ accentColor: 'var(--accent-cyan)' }}
                />
                <span>Remember & Trust this Device</span>
              </label>
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem' }} onClick={() => setMode('forgot')}>
                Forgot password?
              </button>
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '12px', fontSize: '0.95rem', marginTop: '6px' }} disabled={loading}>
              {loading ? 'Verifying Credentials...' : 'Sign In'}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* ---------------- MODE 2: NEW DEVICE SECURITY CHECK (THE PROFESSIONAL CHECK) ---------------- */}
        {mode === 'device-challenge' && (
          <form onSubmit={handleVerifyDevice} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.35)',
              borderRadius: '10px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <div style={{ background: '#eab308', padding: '8px', borderRadius: '50%', color: '#000' }}>
                  <AlertTriangle size={24} />
                </div>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#facc15', marginBottom: '4px' }}>
                New Device Security Check
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                This is the first time you are signing in from this device or browser. Identity verification is required.
              </p>

              {/* Detected Device Card */}
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                padding: '10px',
                marginTop: '12px',
                textAlign: 'left',
                fontSize: '0.78rem',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Device / OS:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{challengeDevice?.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Device Type:</span>
                  <span>{challengeDevice?.type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Screen & Session:</span>
                  <span>{challengeDevice?.screen} (TLS Secure)</span>
                </div>
              </div>
            </div>

            {/* Simulated 6-Digit Code Notice for Instant Developer/User Access */}
            {mockDemoCode && (
              <div style={{
                background: 'rgba(6, 182, 212, 0.12)',
                border: '1px dashed var(--accent-cyan)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.8rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: 'var(--text-muted)' }}>Security Code (Sent to {email}):</span>
                <button
                  type="button"
                  style={{
                    background: 'var(--accent-cyan)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                  onClick={() => setVerificationCode(mockDemoCode)}
                >
                  Use Code: {mockDemoCode}
                </button>
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Enter 6-Digit Verification PIN</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  maxLength={6}
                  className="input-field"
                  style={{ paddingLeft: '38px', fontSize: '1.2rem', letterSpacing: '4px', fontWeight: 700, textAlign: 'center' }}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={trustDevice}
                onChange={(e) => setTrustDevice(e.target.checked)}
                style={{ accentColor: 'var(--accent-cyan)' }}
              />
              <span>Trust this device (Do not ask again on this browser)</span>
            </label>

            <button type="submit" className="btn-primary" style={{ padding: '12px', fontSize: '0.95rem' }} disabled={loading || verificationCode.length < 6}>
              {loading ? 'Authorizing Device...' : 'Authorize Device & Enter Workspace'}
              <ShieldCheck size={18} />
            </button>

            <button type="button" className="btn-secondary" style={{ padding: '8px', fontSize: '0.82rem' }} onClick={() => setMode('signin')}>
              Cancel & Return to Sign In
            </button>
          </form>
        )}

        {/* ---------------- MODE 3: CREATE ACCOUNT ---------------- */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '38px' }}
                  placeholder="Dr. Alexander Fleming"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  className="input-field"
                  style={{ paddingLeft: '38px' }}
                  placeholder="researcher@institution.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  className="input-field"
                  style={{ paddingLeft: '38px' }}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Role</label>
                <select className="select-field" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="Researcher">Researcher</option>
                  <option value="Bioinformatician">Bioinformatician</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Student">Student</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Institution</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Genomics Center"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '12px', fontSize: '0.95rem', marginTop: '6px' }} disabled={loading}>
              {loading ? 'Registering Account...' : 'Create Account & Trust Current Device'}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* ---------------- MODE 4: TRUSTED DEVICES MANAGEMENT ---------------- */}
        {mode === 'devices' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Fingerprint size={18} color="var(--accent-cyan)" /> Authorized Trusted Devices
              </h3>
              <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={loadTrustedDevices}>
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {trustedDevicesList.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
                  No additional devices registered for this account.
                </p>
              ) : (
                trustedDevicesList.map((dev) => {
                  const isThisDevice = dev.id === currentDevice.id;
                  return (
                    <div key={dev.id} style={{
                      background: isThisDevice ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isThisDevice ? 'rgba(6, 182, 212, 0.3)' : 'var(--border-color)'}`,
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {getDeviceIcon(dev.type)}
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            {dev.name} {isThisDevice && <span style={{ color: 'var(--accent-cyan)', fontSize: '0.75rem' }}>(This Device)</span>}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            Last Active: {dev.lastActiveAt ? new Date(dev.lastActiveAt).toLocaleDateString() : 'Active Session'} · {dev.screen}
                          </div>
                        </div>
                      </div>

                      {!isThisDevice && (
                        <button
                          type="button"
                          className="btn-icon"
                          style={{ color: '#ef4444' }}
                          title="Revoke Authorization"
                          onClick={() => handleRevokeDevice(dev.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <button type="button" className="btn-secondary" style={{ padding: '10px', fontSize: '0.85rem', marginTop: '6px' }} onClick={() => setMode('signin')}>
              Back to Sign In
            </button>
          </div>
        )}

        {/* ---------------- MODE 5: FORGOT PASSWORD ---------------- */}
        {mode === 'forgot' && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            try {
              await resetPassword(email);
              setMessage('Password reset instructions dispatched to your verified email.');
            } catch (err) {
              setError(err.message);
            }
          }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Enter your email address. If an account is recognized in our database, password recovery credentials will be dispatched.
            </p>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="researcher@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '10px' }}>Send Password Reset Link</button>
            <button type="button" className="btn-secondary" style={{ padding: '8px' }} onClick={() => setMode('signin')}>Back to Sign In</button>
          </form>
        )}

        {/* Footer Navigation */}
        {mode !== 'device-challenge' && mode !== 'devices' && (
          <div style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.82rem'
          }}>
            {mode === 'signin' ? (
              <>
                <span style={{ color: 'var(--text-muted)' }}>Don't have an account?{' '}
                  <button type="button" style={{ color: 'var(--accent-cyan)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }} onClick={() => setMode('signup')}>
                    Create Account
                  </button>
                </span>
                {email && (
                  <button type="button" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={loadTrustedDevices}>
                    Manage Devices
                  </button>
                )}
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Already have an account?{' '}
                <button type="button" style={{ color: 'var(--accent-cyan)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }} onClick={() => setMode('signin')}>
                  Sign In
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
