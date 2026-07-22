"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase"; // Importando auth direto do seu config
import { 
  collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function PainelDenunciasMaster() {
  const router = useRouter();
  
  const [denuncias, setDenuncias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMaster, setIsMaster] = useState(false);

  useEffect(() => {
    // Monitora o usuário logado sem depender de Context externo
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        // Busca o documento do lojista para ver se ele é o "Master"
        const docRef = doc(db, "lojistas", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().role === "master") {
          setIsMaster(true);
          setLoading(false);
        } else {
          // Se não for master, manda para o painel comum dele
          router.replace("/admin"); 
        }
      } catch (error) {
        console.error("Erro ao validar master:", error);
        router.replace("/login");
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  // Carregamento das Denúncias em tempo real (só se for Master)
  useEffect(() => {
    if (!isMaster) return;

    const q = query(collection(db, "denuncias"), orderBy("createdAt", "desc"));
    const unsubSnap = onSnapshot(q, (snap) => {
      setDenuncias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubSnap();
  }, [isMaster]);

  const resolverDenuncia = async (id: string) => {
    if (!confirm("Deseja marcar como resolvida?")) return;
    await updateDoc(doc(db, "denuncias", id), { status: "resolvido" });
  };

  const deletarDenuncia = async (id: string) => {
    if (!confirm("Excluir permanentemente este registro?")) return;
    await deleteDoc(doc(db, "denuncias", id));
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <p>Verificando credenciais de Master...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <h1 style={{ margin: 0 }}>🚩 Gestão de Denúncias</h1>
                <p style={{ color: '#64748b' }}>Conteúdos reportados pelos clientes finais.</p>
            </div>
            <button onClick={() => router.push('/admin')} style={styles.btnBack}>Voltar ao Painel</button>
        </div>
      </header>

      <div style={styles.grid}>
        {denuncias.length === 0 && <p style={styles.empty}>Nenhuma denúncia registrada.</p>}
        
        {denuncias.map((den) => (
          <div key={den.id} style={{
            ...styles.card, 
            borderLeft: den.status === "pendente" ? "6px solid #ef4444" : "6px solid #10b981"
          }}>
            <div style={styles.cardHeader}>
              <span style={{...styles.status, background: den.status === "pendente" ? "#fee2e2" : "#d1fae5"}}>
                {den.status?.toUpperCase()}
              </span>
              <span style={styles.date}>
                {den.createdAt ? new Date(den.createdAt).toLocaleString() : 'Data não disponível'}
              </span>
            </div>

            <h3 style={styles.shopName}>Loja: {den.nomeLoja || den.slugLoja || 'Sem nome'}</h3>
            <p style={styles.uid}>UID Lojista: <code>{den.lojistaId}</code></p>
            
            <div style={styles.reasonBox}>
              <strong>Relato do Cliente:</strong>
              <p style={{ margin: '10px 0 0 0' }}>{den.motivo}</p>
            </div>

            <div style={styles.actions}>
              {den.status === "pendente" && (
                <button onClick={() => resolverDenuncia(den.id)} style={styles.btnResolve}>Resolver</button>
              )}
              <button onClick={() => deletarDenuncia(den.id)} style={styles.btnDelete}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' },
  container: { padding: '30px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' },
  header: { marginBottom: '30px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' },
  grid: { display: 'flex', flexDirection: 'column', gap: '20px' },
  card: { background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  status: { fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '20px', color: '#1e293b' },
  date: { fontSize: '12px', color: '#94a3b8' },
  shopName: { margin: '0 0 5px 0', color: '#1e293b' },
  uid: { fontSize: '11px', color: '#94a3b8', marginBottom: '15px' },
  reasonBox: { background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' },
  actions: { display: 'flex', gap: '10px', marginTop: '20px' },
  btnResolve: { background: '#10b981', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  btnDelete: { background: '#fff', color: '#ef4444', border: '1px solid #ef4444', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  btnBack: { background: '#f1f5f9', color: '#475569', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: '50px' }
};