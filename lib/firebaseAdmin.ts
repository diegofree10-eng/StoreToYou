import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app;

if (!getApps().length) {
  // Usando as variáveis exatas que já estão cadastradas na sua Vercel
  const projectId = process.env.ID_DO_PROJETO_ADMIN_DO_FIREBASE || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    console.error("ERRO CRÍTICO: As credenciais do Firebase Admin não estão completas nas variáveis de ambiente.");
  }
} else {
  app = getApp();
}

if (!app) {
  throw new Error("Firebase Admin não pôde ser inicializado.");
}

export const dbAdmin = getFirestore(app);