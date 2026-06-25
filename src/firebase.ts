import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  OAuthProvider, // <-- Para Microsoft
  signInWithPopup,
  signOut
} from 'firebase/auth';

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  // ... resto de la configuración
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Proveedores OAuth
const googleProvider = new GoogleAuthProvider();
const microsoftProvider = new OAuthProvider('microsoft.com'); // <-- Configuración para Microsoft

// Exportaciones
export {
  auth,
  googleProvider,
  microsoftProvider, // <-- Asegúrate de exportarlo
  signInWithPopup,
  signOut
};
