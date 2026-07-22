import { getDadosLoja } from "@/lib/db-loja";
import { notFound } from "next/navigation";
import { LojaProvider } from "./_components/LojaContext";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface LojaLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lojista: string }>;
}

export default async function LojaLayout({ children, params }: LojaLayoutProps) {
  const { lojista } = await params;
  const lojaBruta = await getDadosLoja(lojista);

  if (!lojaBruta) {
    notFound();
  }

  const loja = JSON.parse(JSON.stringify(lojaBruta, (key, value) => {
    if (value && typeof value === 'object' && typeof value.toJSON === 'function') {
      return value.toJSON();
    }
    return value;
  }));

  let categorias: any[] = [];
  try {
    const q = query(collection(db, "lojistas"), where("dadosLoja.dsSlug", "==", lojista), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docId = snap.docs[0].id;
      const catsSnap = await getDocs(collection(db, "lojistas", docId, "categorias"));
      categorias = catsSnap.docs.map(c => ({ id: c.id, ...c.data() }));
    }
  } catch (e) {
    console.error(e);
  }

  const lojaComTudo = {
    ...loja,
    categorias: categorias
  };

  const ap = loja.aparencia || {};
  const isLojaAberta = loja.dadosLoja?.isLojaAberta !== false;

  return (
    <LojaProvider dadosLoja={lojaComTudo}>
      <div style={{ backgroundColor: ap.dscorFundo || '#FFF9F2', minHeight: '100vh' }}>
        {!isLojaAberta && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            textAlign: 'center',
            padding: '10px',
            fontSize: '13px',
            fontWeight: 'bold',
            borderBottom: '1px solid #fecaca',
            width: '100%',
            position: 'fixed',
            top: 0,
            zIndex: 99999
          }}>
            🔴 Loja em férias / modo vitrine. Os pedidos estão temporariamente desativados.
          </div>
        )}
        <div style={{ paddingTop: !isLojaAberta ? '155px' : '1px' }}>
          {children}
        </div>
      </div>
    </LojaProvider>
  );
}