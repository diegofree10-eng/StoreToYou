import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy, updateDoc } from "firebase/firestore";
import { FiX, FiCheckCircle, FiClock } from "react-icons/fi";

const ModalPerfilLojista = ({ lojaId, onClose }: { lojaId: string, onClose: () => void }) => {
  const [dados, setDados] = useState<any>(null);
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aprovando, setAprovando] = useState(false);

  const [historicoTestes, setHistoricoTestes] = useState<any[]>([]);

  const carregarFicha = async () => {
    setLoading(true);
    const snap = await getDoc(doc(db, "lojistas", lojaId));
    if (snap.exists()) setDados(snap.data());

    // Busca TODO o histórico ordenado pelas mais recentes
    const colRef = collection(db, "lojistas", lojaId, "assinaturas", "registro_inicial", "up_upgrade");
    const snapSol = await getDocs(query(colRef, orderBy("tsDataSolicitacao", "desc")));
    setSolicitacoes(snapSol.docs.map(d => ({ id: d.id, ...d.data() })));
    // BUSCA O NOVO HISTÓRICO DE TESTES OURO
    const histRef = collection(db, "lojistas", lojaId, "assinaturas", "registro_inicial", "historico_testesOuro");
    const snapHist = await getDocs(query(histRef, orderBy("dataAtivacao", "desc")));
    setHistoricoTestes(snapHist.docs.map(d => ({ id: d.id, ...d.data() })));

    setLoading(false);
  };

  useEffect(() => { carregarFicha(); }, [lojaId]);

  const aprovarUpgrade = async (sol: any) => {
    setAprovando(true);
    try {
      await updateDoc(doc(db, "lojistas", lojaId), {
        "dadosLoja.dsPlanoLoja": sol.dsPlanoDesejado,
        "sistema.dsStatusUpgrade": "aprovado"
      });

      // Adicionando a data de aprovação ao documento
      await updateDoc(doc(db, "lojistas", lojaId, "assinaturas", "registro_inicial", "up_upgrade", sol.id), {
        dsStatusUpgrade: "aprovado",
        tsDataAprovacao: new Date() // Grava o momento atual
      });

      alert("Upgrade aprovado!");
      carregarFicha();
    } catch (e) { alert("Erro ao aprovar."); }
    setAprovando(false);
  };

  if (loading) return <div style={styles.modalOverlay}>Carregando...</div>;

  const { dadosLoja, dadosPessoais } = dados || {};

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        {/* CABEÇALHO: Logo movido para a direita */}
        <div style={styles.modalHeader}>
          <div>
            <h3 style={{ margin: '0 0 5px 0' }}>Lojista: {dadosLoja?.dsNomeLoja || "Loja"}</h3>
            <p style={{ fontSize: '15px', color: '#106ff5', marginBottom: '15px' }}>Loja Id: {lojaId}</p>
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#076dfd' }}>Plano: {dadosLoja?.dsPlanoLoja}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {dadosLoja?.dsLogoLoja && <img src={dadosLoja.dsLogoLoja} style={styles.logoTopo} />}
            <button onClick={onClose} style={styles.btnClose}><FiX size={24} /></button>
          </div>
        </div>

        {/* HISTÓRICO DE UPGRADES */}
        {solicitacoes.map(s => (
          <div key={s.id} style={{ ...styles.alertBox, background: s.dsStatusUpgrade === 'pendente' ? '#ecfdf5' : '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {/* Usando dsPlanoAtual e dsPlanoDesejado */}
                <p style={{ margin: 0, fontWeight: 'bold' }}>Solicitação: {s.dsPlanoAtual} ➔ <strong>{s.dsPlanoDesejado}</strong></p>

                <div style={{ margin: '5px 0', fontSize: '11px', color: '#64748b' }}>
                  {/* Usando tsDataSolicitacao */}
                  <p style={{ margin: 0 }}>Solicitado: {s.tsDataSolicitacao?.toDate().toLocaleString()}</p>

                  {/* Usando tsDataAprovacao */}
                  {s.dsStatusUpgrade === 'aprovado' && s.tsDataAprovacao && (
                    <p style={{ margin: 0, color: '#059669' }}>
                      <strong>Aprovado:</strong> {s.tsDataAprovacao?.toDate().toLocaleString()}
                    </p>
                  )}
                </div>

                <span style={{
                  fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px',
                  background: s.dsStatusUpgrade === 'pendente' ? '#d1fae5' : '#e2e8f0',
                  color: s.dsStatusUpgrade === 'pendente' ? '#065f46' : '#475569'
                }}>
                  {s.dsStatusUpgrade.toUpperCase()}
                </span>
              </div>

              {s.dsStatusUpgrade === 'pendente' && (
                <button onClick={() => aprovarUpgrade(s)} disabled={aprovando} style={styles.btnAprovar}>
                  <FiCheckCircle size={14} /> Aprovar
                </button>
              )}
            </div>
          </div>
        ))}

        <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
          <h4 style={styles.subTitle}>⭐ HISTÓRICO DE TESTES OURO</h4>
          <div style={{ display: 'grid', gap: '5px' }}>
            {historicoTestes.map((h: any) => (
              <div key={h.id} style={{ fontSize: '11px', background: '#f8fafc', padding: '8px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Início:</strong> {h.dataAtivacao?.toDate().toLocaleDateString()}</span>
                <span><strong>Expira:</strong> {h.dataExpiracao?.toDate().toLocaleDateString()}</span>
                <span><strong>Dias:</strong> {h.diasConcedidos}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}></div>
        </div>



        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '13px' }}>
          <section>
            <h4 style={styles.subTitle}>👤 RESPONSÁVEL</h4>
            <p><strong>Nome:</strong> {dadosPessoais?.dsNomeResponsavel || "---"}</p>
            <p><strong>CPF:</strong> {dadosPessoais?.dsCpfResponsavel || "---"}</p>
            <p><strong>Rua:</strong> {dadosPessoais?.dsRuaResponsavel || "---"}</p>
            <p><strong>Numero:</strong> {dadosPessoais?.nrNumeroResponsavel || "---"}</p>
            <p><strong>Bairro:</strong> {dadosPessoais?.dsBairroResponsavel || "---"}</p>
            <p><strong>Cidade:</strong> {dadosPessoais?.dsCidadeResponsavel || "---"} - {dadosPessoais?.dsUfResponsavel || ""}</p>
            <p><strong>E-mail:</strong> {dadosPessoais?.dsEmailResponsavel || dados?.email || "---"}</p>
            <p><strong>Tel:</strong> {dadosPessoais?.dsTelResponsavel || "---"}</p>
          </section>

          <section>
            <h4 style={styles.subTitle}>🏪 DADOS DA LOJA</h4>
            <p><strong>Segmento:</strong> {dadosLoja?.dsSeguimentoLoja || "---"}</p>
            <p><strong>WhatsApp:</strong> {dadosLoja?.nrWhatssapLoja || "---"}</p>
            <p><strong>Rua:</strong> {dadosLoja?.dsRuaLoja || "---"}</p>
            <p><strong>Numero:</strong> {dadosLoja?.nrNumeroLoja || "---"}</p>
            <p><strong>Bairro:</strong> {dadosLoja?.dsBairroLoja || "---"}</p>
            <p><strong>Cidade:</strong> {dadosLoja?.dsCidadeLoja || "---"} - {dadosLoja?.dsUfLoja || ""}</p>
            <p><strong>Endereço:</strong> {dadosLoja?.dsRuaLoja || "---"}</p>
          </section>
        </div>
      </div>
    </div>
  );
};

const styles: any = {
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: '#fff', padding: '25px', borderRadius: '20px', width: '90%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' },
  logoTopo: { width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' },
  btnClose: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex' },
  alertBox: { padding: '15px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #e2e8f0' },
  btnAprovar: { background: '#059669', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' },
  subTitle: { fontSize: '10px', color: '#2563eb', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '900' }
};

export default ModalPerfilLojista;