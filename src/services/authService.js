// Provider-Independent Authentication Service with Multi-Device Verification
import { detectCurrentDevice, generateDeviceSecurityCode } from './deviceService';

const USER_STORAGE_KEY = 'bionexus_auth_user';
const USERS_DB_KEY = 'bionexus_registered_users';
const DEVICE_CHALLENGE_KEY = 'bionexus_device_challenge';

export async function getCurrentUser() {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export async function signUp({ name, email, password, role = 'Researcher', institution = '' }) {
  if (!email || !password) throw new Error('Email and password are required.');
  
  const registeredUsers = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]');
  const existing = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const currentDevice = detectCurrentDevice();
  const initialDevice = {
    ...currentDevice,
    authorizedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    isCurrent: true
  };

  const newUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: name || email.split('@')[0],
    email: email.toLowerCase(),
    role,
    institution,
    trustedDevices: [initialDevice],
    createdAt: new Date().toISOString()
  };

  registeredUsers.push({ ...newUser, passwordHash: btoa(password) });
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(registeredUsers));
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));

  return newUser;
}

export async function signIn({ email, password, bypassDeviceCheck = false }) {
  if (!email || !password) throw new Error('Email and password are required.');

  const registeredUsers = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]');
  const userRecord = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!userRecord || userRecord.passwordHash !== btoa(password)) {
    throw new Error('Invalid email or password.');
  }

  // Device Check
  const currentDevice = detectCurrentDevice();
  const trustedList = Array.isArray(userRecord.trustedDevices) ? userRecord.trustedDevices : [];
  const isKnownDevice = trustedList.some(d => d.id === currentDevice.id);

  if (!isKnownDevice && !bypassDeviceCheck) {
    // Generate Security Verification Code for New Device Check
    const code = generateDeviceSecurityCode();
    const challenge = {
      email: userRecord.email,
      code,
      device: currentDevice,
      issuedAt: Date.now(),
      expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
    };
    sessionStorage.setItem(DEVICE_CHALLENGE_KEY, JSON.stringify(challenge));

    return {
      user: null,
      isNewDevice: true,
      challengeDevice: currentDevice,
      mockVerificationCode: code // Provided for seamless sandbox/local testing
    };
  }

  // Known device — Update last active timestamp
  const updatedDevices = trustedList.map(d => 
    d.id === currentDevice.id ? { ...d, lastActiveAt: new Date().toISOString() } : d
  );
  if (!isKnownDevice) {
    updatedDevices.push({
      ...currentDevice,
      authorizedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    });
  }

  userRecord.trustedDevices = updatedDevices;
  const userIdx = registeredUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (userIdx !== -1) {
    registeredUsers[userIdx] = userRecord;
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(registeredUsers));
  }

  const user = {
    id: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
    role: userRecord.role,
    institution: userRecord.institution,
    trustedDevices: updatedDevices,
    createdAt: userRecord.createdAt
  };

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  return { user, isNewDevice: false };
}

export async function verifyAndAuthorizeDevice({ email, code, trustThisDevice = true }) {
  const challengeRaw = sessionStorage.getItem(DEVICE_CHALLENGE_KEY);
  if (!challengeRaw) {
    throw new Error('Verification session expired. Please sign in again.');
  }

  const challenge = JSON.parse(challengeRaw);
  if (challenge.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error('Email does not match active challenge.');
  }

  if (Date.now() > challenge.expiresAt) {
    throw new Error('Verification code has expired. Please request a new code.');
  }

  if (challenge.code !== code.trim()) {
    throw new Error('Invalid verification code. Please check and try again.');
  }

  // Code is valid! Add device to user record
  const registeredUsers = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]');
  const userRecord = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!userRecord) throw new Error('User record not found.');

  const trustedList = Array.isArray(userRecord.trustedDevices) ? userRecord.trustedDevices : [];
  const currentDevice = challenge.device;

  if (trustThisDevice && !trustedList.some(d => d.id === currentDevice.id)) {
    trustedList.push({
      ...currentDevice,
      authorizedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    });
  }

  userRecord.trustedDevices = trustedList;
  const userIdx = registeredUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (userIdx !== -1) {
    registeredUsers[userIdx] = userRecord;
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(registeredUsers));
  }

  const user = {
    id: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
    role: userRecord.role,
    institution: userRecord.institution,
    trustedDevices: trustedList,
    createdAt: userRecord.createdAt
  };

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  sessionStorage.removeItem(DEVICE_CHALLENGE_KEY);

  return user;
}

export async function getTrustedDevices(email) {
  const registeredUsers = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]');
  const userRecord = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  return userRecord?.trustedDevices || [];
}

export async function revokeDevice(email, deviceId) {
  const registeredUsers = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]');
  const userRecord = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!userRecord) return false;

  userRecord.trustedDevices = (userRecord.trustedDevices || []).filter(d => d.id !== deviceId);
  const userIdx = registeredUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (userIdx !== -1) {
    registeredUsers[userIdx] = userRecord;
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(registeredUsers));
  }

  // Update current session if revoked
  const currentUser = await getCurrentUser();
  if (currentUser && currentUser.email.toLowerCase() === email.toLowerCase()) {
    currentUser.trustedDevices = userRecord.trustedDevices;
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
  }

  return true;
}

export async function signOut() {
  localStorage.removeItem(USER_STORAGE_KEY);
  sessionStorage.removeItem(DEVICE_CHALLENGE_KEY);
  return true;
}

export async function resetPassword(email) {
  if (!email) throw new Error('Please enter your email address.');
  const registeredUsers = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]');
  const user = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    throw new Error('No account found with this email.');
  }
  return true;
}
