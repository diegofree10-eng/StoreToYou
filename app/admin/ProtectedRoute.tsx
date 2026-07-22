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
      // 1. Se não houver usuário nenhum, bloqueia e manda pro login
      if (!user) {
        setAuthorized(false);
        setLoading(false);
        router.replace("/login");
        return;
      }

      try {
        // 2. Tenta buscar o lojista no banco
        const docRef = doc(db, "lojistas", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          // SÓ AQUI o acesso é liberado
          setAuthorized(true);
        } else {
          // Se o usuário está logado no Firebase mas NÃO existe na sua coleção de lojistas
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

  // Enquanto estiver checando, NÃO MOSTRA NADA DA PÁGINA
  if (loading) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff' }}>
        <strong>Validando sessão...</strong>
      </div>
    );
  }

  // SE NÃO FOR AUTORIZADO, RETORNA NULL (TELA BRANCA ANTES DO REDIRECT)
  // Isso impede que qualquer código da AdminPage (Sidebar, etc) seja carregado.
  if (!authorized) {
    return null; 
  }

  return <>{children}</>;
}