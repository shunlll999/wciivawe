import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env variable: ${key}`);
  return value;
}

const firebaseConfig = {
  apiKey:            requireEnv('REACT_APP_FIREBASE_API_KEY'),
  authDomain:        requireEnv('REACT_APP_FIREBASE_AUTH_DOMAIN'),
  projectId:         requireEnv('REACT_APP_FIREBASE_PROJECT_ID'),
  storageBucket:     requireEnv('REACT_APP_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireEnv('REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
  appId:             requireEnv('REACT_APP_FIREBASE_APP_ID'),
  measurementId:     requireEnv('REACT_APP_FIREBASE_MEASUREMENT_ID'),
};

export const app       = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
