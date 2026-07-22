import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// 1. Obtém a variável de ambiente
const serviceAccountRaw = process.env.FIREBASE_ADMIN_SDK_JSON;

// 2. Define o app de forma segura
let app;

if (!getApps().length) {
  if (serviceAccountRaw) {
    // Ambiente de Produção/Deploy com credenciais
    app = initializeApp({
      credential: cert(JSON.parse(serviceAccountRaw))
    });
  } else {
    // Ambiente de Build (Local ou Vercel Build):
    // Não inicializamos com nada, apenas criamos um "mock" ou deixamos null
    // para evitar o erro de inicialização.
    console.warn("Firebase Admin: Credenciais não encontradas. O app não será inicializado.");
  }
} else {
  app = getApp();
}

// 3. Exporta o Firestore apenas se o app foi inicializado
export const dbAdmin = app ? getFirestore(app) : ({} as any);