import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  setPersistence, 
  browserLocalPersistence,
  browserSessionPersistence, 
  inMemoryPersistence 
} from 'firebase/auth';
import { initializeFirestore, getFirestore, collection, addDoc, getDocs, doc, setDoc, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
const getFirebaseConfig = () => {
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  // Use import.meta.glob to gracefully load config without breaking Vite build if the file is missing in CI/CD
  const configModules = import.meta.glob('../../firebase-applet-config.json', { eager: true });
  const jsonConfig: any = (configModules['../../firebase-applet-config.json'] as any)?.default || {};

  return {
    apiKey: envConfig.apiKey || jsonConfig.apiKey || 'AIzaSyAyiQFMYvZBsKLD5SpIWQ8vEnEo6gwMZmU',
    authDomain: envConfig.authDomain || jsonConfig.authDomain || 'gen-lang-client-0463518042.firebaseapp.com',
    projectId: envConfig.projectId || jsonConfig.projectId || 'gen-lang-client-0463518042',
    storageBucket: envConfig.storageBucket || jsonConfig.storageBucket || 'gen-lang-client-0463518042.firebasestorage.app',
    messagingSenderId: envConfig.messagingSenderId || jsonConfig.messagingSenderId || '924868470204',
    appId: envConfig.appId || jsonConfig.appId || '1:924868470204:web:89b73cc5a94df5356537b9',
    firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || jsonConfig.firestoreDatabaseId || 'ai-studio-abukaamal-dc3580e3-4ebf-42ac-9362-f55b50f98cfa'
  };
};

const finalConfig = getFirebaseConfig();
const app = initializeApp(finalConfig);
export const auth = getAuth(app);

// Configure persistent auth so closing browser retains session until explicit logout
const configureAuthPersistence = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (e) {
    try {
      await setPersistence(auth, browserSessionPersistence);
    } catch (err) {
      try {
        await setPersistence(auth, inMemoryPersistence);
      } catch (e2) {
        // ignore
      }
    }
  }
};
configureAuthPersistence();

let databaseInstance;
const dbId = (finalConfig.firestoreDatabaseId && finalConfig.firestoreDatabaseId !== '(default)') 
  ? finalConfig.firestoreDatabaseId 
  : undefined;

try {
  const dbSettings = {
    experimentalAutoDetectLongPolling: true,
  };

  if (dbId) {
    databaseInstance = initializeFirestore(app, dbSettings, dbId);
  } else {
    databaseInstance = initializeFirestore(app, dbSettings);
  }
} catch (e) {
  console.warn("Firestore initializeFirestore failed, falling back to getFirestore:", e);
  if (dbId) {
    databaseInstance = getFirestore(app, dbId);
  } else {
    databaseInstance = getFirestore(app);
  }
}
export const db = databaseInstance;

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export interface AccessLog {
  id?: string;
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  accessTimeFormatted: string;
  timestamp?: any;
}

// Function to log user login access into Firestore database
export const logAccessToFirestore = async (user: User): Promise<AccessLog> => {
  const now = new Date();
  const timeFormatted = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const userData = {
    uid: user.uid,
    displayName: user.displayName || 'Pengguna Google',
    email: user.email || '',
    photoURL: user.photoURL || '',
    lastAccessTimeFormatted: timeFormatted,
    lastLoginTimestamp: serverTimestamp(),
    isGoogleAccountValid: true,
    status: 'Aktif & Terverifikasi',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
  };

  const logData = {
    uid: user.uid,
    displayName: user.displayName || 'Pengguna Google',
    email: user.email || '',
    photoURL: user.photoURL || '',
    accessTimeFormatted: timeFormatted,
    timestamp: serverTimestamp(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
  };

  try {
    // 1. Store or update active user profile document in 'users' collection in Firestore
    await setDoc(doc(db, 'users', user.uid), userData, { merge: true });

    // 2. Add log entry into 'user_access_logs' collection in Firestore
    const docRef = await addDoc(collection(db, 'user_access_logs'), logData);
    
    return {
      id: docRef.id,
      ...logData
    };
  } catch (err) {
    console.warn('Gagal menyimpan riwayat akses ke Firestore:', err);
    return logData;
  }
};

// Function to fetch recent access logs from Firestore
export const fetchAccessLogs = async (): Promise<AccessLog[]> => {
  try {
    const q = query(collection(db, 'user_access_logs'), orderBy('timestamp', 'desc'), limit(20));
    const snapshot = await getDocs(q);
    const logs: AccessLog[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        uid: data.uid,
        displayName: data.displayName,
        email: data.email,
        photoURL: data.photoURL,
        accessTimeFormatted: data.accessTimeFormatted || (data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString('id-ID') : 'N/A')
      });
    });
    return logs;
  } catch (err) {
    console.warn('Gagal mengambil riwayat akses dari Firestore:', err);
    return [];
  }
};

export const initAuth = (
  onAuthSuccess: (user: User, token: string) => void,
  onAuthFailure: () => void
) => {
  // Check redirect result on initialization (useful if returning from OAuth redirect)
  getRedirectResult(auth).then(async (result) => {
    if (result && result.user) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      cachedAccessToken = credential?.accessToken || '';
      await logAccessToFirestore(result.user);
      onAuthSuccess(result.user, cachedAccessToken);
    }
  }).catch(() => {
    // Ignore error silently when no redirect was initiated
  });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If logged in via Firebase session, pass user and cached token or empty string
        onAuthSuccess(user, cachedAccessToken || '');
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure();
    }
  });
};

// Google Sign-In with Redirect (Ideal for Mobile / Tablet / Browsers blocking popups)
export const googleSignInWithRedirect = async (): Promise<void> => {
  isSigningIn = true;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  await signInWithRedirect(auth, provider);
};

// Standard Google Sign-In with auto fallback to Redirect if popup blocked
export const googleSignIn = async (): Promise<{ user: User; accessToken: string; accessLog?: AccessLog } | null> => {
  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    // Invoke signInWithPopup synchronously in current user event tick
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || '';

    // Save access log automatically upon login
    const log = await logAccessToFirestore(result.user);

    return { user: result.user, accessToken: cachedAccessToken, accessLog: log };
  } catch (error: any) {
    if (error?.code === 'auth/popup-blocked') {
      console.warn('Pop-up diblokir peramban, mengalihkan ke mode Redirect...');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithRedirect(auth, provider);
      return null;
    }

    const isCancelled = 
      error?.code === 'auth/popup-closed-by-user' || 
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('closing/hidden') ||
      error?.message?.includes('closing');

    if (!isCancelled) {
      console.error('Sign-in error:', error);
    } else {
      console.log('Login pop-up ditutup atau dibatalkan.');
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Connect or refresh Google Workspace (Sheets & Drive) access token
export const connectWorkspaceScopes = async (): Promise<string | null> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/drive.readonly');
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      return cachedAccessToken;
    }
    return null;
  } catch (err: any) {
    console.error('Gagal menghubungkan Google Workspace scope:', err);
    return null;
  }
};

// Request additional Gmail permissions if requested inside Gmail tab
export const connectGmailScopes = async (): Promise<string | null> => {
  try {
    const gmailProvider = new GoogleAuthProvider();
    gmailProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
    gmailProvider.addScope('https://www.googleapis.com/auth/gmail.send');
    gmailProvider.setCustomParameters({
      prompt: 'select_account'
    });

    const result = await signInWithPopup(auth, gmailProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      return cachedAccessToken;
    }
    return null;
  } catch (err: any) {
    console.error('Gagal menghubungkan Gmail scope:', err);
    return null;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
