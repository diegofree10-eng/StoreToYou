import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountRaw = process.env.FIREBASE_ADMIN_SDK_JSON;

let app;

if (!getApps().length) {
  if (serviceAccountRaw) {
    try {
      const serviceAccount = JSON.parse(serviceAccountRaw);
      // Corrige quebras de linha na chave privada se vierem escapadas
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      app = initializeApp({
        credential: cert(serviceAccount)
      });
    } catch (error) {
      console.error("Erro ao fazer parse do JSON do Firebase Admin:", error);
    }
  } else {
    console.error("ERRO CRÍTICO: A variável FIREBASE_ADMIN_SDK_JSON não está configurada no ambiente!");
  }
} else {
  app = getApp();
}

if (!app) {
  throw new Error("Firebase Admin não pôde ser inicializado por falta de credenciais.");
}

export const dbAdmin = getFirestore(app);