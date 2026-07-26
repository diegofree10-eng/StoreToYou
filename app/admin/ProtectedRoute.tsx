"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthorized(false);
        setLoading(false);
        router.replace("/login");
        return;
      }

      try {
        // 1. Busca primeiro o perfil do usuário para descobrir o ID correto da loja
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await auth.signOut();
          setAuthorized(false);
          router.replace("/login");
          return;
        }

        const userData = userSnap.data();
        const lojaId = userData.lojaId;

        if (!lojaId) {
          await auth.signOut();
          setAuthorized(false);
          router.replace("/login");
          return;
        }

        // 2. Valida se a loja realmente existe no banco usando o ID correto salvo no usuário
        const lojaRef = doc(db, "lojistas", lojaId);
        const lojaSnap = await getDoc(lojaRef);
        
        if (lojaSnap.exists()) {
          setAuthorized(true);
        } else {
          await auth.signOut();
          setAuthorized(false);
          router.replace("/login");
        }
      } catch (error) {
        console.error("Erro de validação:", error);
        setAuthorized(false);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff' }}>
        <strong>Validando sessão...</strong>
      </div>
    );
  }

  if (!authorized) {
    return null; 
  }

  return <>{children}</>;
}