"use client";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, addDoc, updateDoc, deleteDoc, Timestamp, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import {
  FiSearch, FiUser, FiPauseCircle, FiPlayCircle,
  FiRefreshCw, FiTrash2, FiClock, FiFilter, FiX, FiStar, FiCalendar
} from "react-icons/fi";
import { buscarLojistas } from "@/hooks/useLojistas";
import ModalPerfilLojista from "@/app/admin/_components/ModalPerfilLojista";

interface TabAssinaturasProps {
  lojistas: any[];
  planos: any;
  // O "?" após 'tipo' torna ele opcional
  mostrarAviso: (texto: string, tipo?: 'sucesso' | 'erro') => void;
}

export default function TabAssinaturas({ planos, mostrarAviso }: TabAssinaturasProps) {
  const [lojistas, setLojistas] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [lojaSelecionada, setLojaSelecionada] = useState<any>(null);
  const [confirmacaoTexto, setConfirmacaoTexto] = useState("");
  const [acaoTipo, setAcaoTipo] = useState<"limpar" | "excluir" | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "vencidos" | "vencer">("todos");
  const [lojaParaPerfil, setLojaParaPerfil] = useState<string | null>(null);

  // LOGICA DE REVERSÃO AUTOMÁTICA
  const verificarEReverterPlano = async (loja: any) => {
    const sistema = loja.sistema || {};
    if (sistema.dsPlanoTeste === "Ouro" && sistema.tsVencimentoTeste) {
      const fimOuro = sistema.tsVencimentoTeste.seconds * 1000;
      if (Date.now() > fimOuro) {
        try {
          await updateDoc(doc(db, "lojistas", loja.id), {
            "sistema.dsPlanoTeste": "",
            "sistema.tsVencimentoTeste": null,
            "sistema.isTesteOuroAtivo": false,
            "dadosLoja.tsVencimentoOuro": null
          });
          return true;
        } catch (error) {
          console.error("Erro ao reverter plano:", error);
          return false;
        }
      }
    }
    return false;
  };

  // CARREGAR DADOS COM VERIFICAÇÃO DE VENCIMENTO
  const carregarDados = async (termo = "", reset = false) => {
    setLoading(true);

    // 1. Busca os dados do Firestore/Hook
    const { docs, lastVisible } = await buscarLojistas(reset ? null : lastDoc, termo);

    // 2. Processa cada loja para verificar se o teste Ouro venceu
    const docsProcessados = await Promise.all(docs.map(async (loja: any) => {
      const houveMudanca = await verificarEReverterPlano(loja);

      // Se houve mudança, atualizamos o objeto localmente para refletir o "limpo" na tela
      return houveMudanca
        ? { ...loja, sistema: { ...loja.sistema, isTesteOuroAtivo: false, dsPlanoTeste: "" } }
        : loja;
    }));

    // 3. Atualiza o estado da lista e o último documento
    setLojistas(reset ? docsProcessados : [...lojistas, ...docsProcessados]);
    setLastDoc(lastVisible);
    setLoading(false);
  };

  useEffect(() => {
    carregarDados("", true);
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      carregarDados(busca, true);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [busca]);

  const obterStatusVencimento = (dataVencimento: string) => {
    if (!dataVencimento) return { texto: "Sem data", cor: "#94a3b8", alerta: false };
    const hoje = new Date();
    const venc = new Date(dataVencimento);
    const diffDays = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { texto: "VENCIDO", cor: "#ef4444", alerta: true };
    if (diffDays <= 5) return { texto: `Vence em ${diffDays}d`, cor: "#f59e0b", alerta: true };
    return { texto: `${diffDays} dias restantes`, cor: "#10b981", alerta: false };
  };

  async function alterarCicloECalcularVencimento(id: string, novoCiclo: "mensal" | "anual", planoNome: string) {
    const diasDeBanhos = planos[planoNome]?.diasTeste || 0;
    const data = new Date();
    if (novoCiclo === "mensal") data.setMonth(data.getMonth() + 1);
    else data.setFullYear(data.getFullYear() + 1);
    data.setDate(data.getDate() + diasDeBanhos);

    try {
      await updateDoc(doc(db, "lojistas", id), {
        "dadosLoja.ciclo": novoCiclo,
        "dadosLoja.tsVencimentoLoja": Timestamp.fromDate(data),
        "dadosLoja.isTeste": false
      });
      carregarDados(busca, true);
      mostrarAviso(`Ciclo alterado para ${novoCiclo}!`, "sucesso");
    } catch (e) { mostrarAviso("Erro ao atualizar ciclo.", "erro"); }
  }

  async function toggleTesteOuro(loja: any) {
    const estaAtivo = loja.sistema?.isTesteOuroAtivo;
    const lojaRef = doc(db, "lojistas", loja.id);
    // Caminho da nova coleção solicitado
    const historicoRef = collection(db, "lojistas", loja.id, "assinaturas", "registro_inicial", "historico_testesOuro");

    try {
      if (estaAtivo) {
        // DESATIVAR: apenas atualiza o status principal
        await updateDoc(lojaRef, {
          "sistema.dsPlanoTeste": "",
          "sistema.tsVencimentoTeste": null,
          "sistema.isTesteOuroAtivo": false
        });
        mostrarAviso("Período de teste Ouro desativado.", "sucesso");
      } else {
        // ATIVAR: busca dias, atualiza principal e cria registro no histórico
        const configSnap = await getDoc(doc(db, "configuracoes", "sistema"));
        const dias = configSnap.exists() ? (configSnap.data()?.nrDiasTesteOuro || 15) : 15;

        const dataInicio = new Date();
        const dataFim = new Date();
        dataFim.setDate(dataFim.getDate() + dias);

        // Atualiza o documento do lojista
        await updateDoc(lojaRef, {
          "sistema.dsPlanoTeste": "Ouro",
          "sistema.tsVencimentoTeste": Timestamp.fromDate(dataFim),
          "sistema.isTesteOuroAtivo": true
        });

        // Cria o registro no histórico no caminho solicitado
        await addDoc(historicoRef, {
          dataAtivacao: Timestamp.fromDate(dataInicio),
          dataExpiracao: Timestamp.fromDate(dataFim),
          diasConcedidos: dias,
          status: "ativado"
        });

        mostrarAviso(`Teste Ouro ativado por ${dias} dias!`, "sucesso");
      }
      carregarDados("", true);
    } catch (error) {
      console.error("Erro:", error);
      mostrarAviso("Erro ao alterar status do teste.", "erro");
    }
  }
  async function renovarAssinatura(loja: any) {
    const dataAtual = new Date();
    const ciclo = loja.dadosLoja?.ciclo || "mensal";

    if (ciclo === "anual") {
      dataAtual.setFullYear(dataAtual.getFullYear() + 1);
    } else {
      dataAtual.setMonth(dataAtual.getMonth() + 1);
    }

    try {
      await updateDoc(doc(db, "lojistas", loja.id), {
        "dadosLoja.tsVencimentoLoja": Timestamp.fromDate(dataAtual),
        "dadosLoja.dsStatusLoja": "ativo"
      });
      mostrarAviso(`Assinatura renovada para ${dataAtual.toLocaleDateString()}!`, "sucesso");
      carregarDados(busca, true);
    } catch (e) {
      mostrarAviso("Erro ao renovar.", "erro");
    }
  }

  async function executarAcaoSegura() {
    if (confirmacaoTexto !== lojaSelecionada?.dadosLoja?.dsNomeLoja) {
      mostrarAviso("Nome da loja incorreto!", "erro");
      return;
    }

    try {
      if (acaoTipo === "excluir") {
        await deleteDoc(doc(db, "lojistas", lojaSelecionada.id));
       mostrarAviso("Lojista excluído com sucesso!", "sucesso");
      } else if (acaoTipo === "limpar") {
        // Exemplo: Limpar dados de assinatura
        await updateDoc(doc(db, "lojistas", lojaSelecionada.id), {
          "dadosLoja.dsStatusLoja": "limpo",
          "sistema.dsPlanoTeste": ""
        });
        mostrarAviso("Dados do lojista limpos!", "sucesso");
      }
      setModalAberto(false);
      setConfirmacaoTexto("");
      carregarDados("", true);
    } catch (e) {
      mostrarAviso("Erro ao executar ação.", "erro");
    }
  }

  // Função auxiliar para abrir o modal de confirmação
  function abrirConfirmacao(loja: any, tipo: "limpar" | "excluir") {
    setLojaSelecionada(loja);
    setAcaoTipo(tipo);
    setConfirmacaoTexto("");
    setModalAberto(true);
  }


  const totalVencer = lojistas.filter(l => {
    const status = obterStatusVencimento(l.dadosLoja?.tsVencimentoLoja?.seconds ? new Date(l.dadosLoja.tsVencimentoLoja.seconds * 1000).toISOString() : "");
    return status.texto.includes("Vence em");
  }).length;

  // Cálculo dos contadores para os botões
  const totalVencidos = lojistas.filter(l =>
    obterStatusVencimento(l.dadosLoja?.tsVencimentoLoja?.seconds ? new Date(l.dadosLoja.tsVencimentoLoja.seconds * 1000).toISOString() : "").texto === "VENCIDO"
  ).length;

  // Filtragem da lista exibida
  const lojistasExibidos = lojistas.filter(loja => {
    const status = obterStatusVencimento(loja.dadosLoja?.tsVencimentoLoja?.seconds ? new Date(loja.dadosLoja.tsVencimentoLoja.seconds * 1000).toISOString() : "");
    if (filtroStatus === "vencidos") return status.texto === "VENCIDO";
    if (filtroStatus === "vencer") return status.texto.includes("Vence em");
    return true;
  });

  return (
    <div style={styles.container}>
      {modalAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h4 style={{ color: acaoTipo === 'excluir' ? '#ef4444' : '#3b82f6' }}>
                {acaoTipo === 'excluir' ? 'Confirmar Exclusão' : 'Confirmar Limpeza'}
              </h4>
              <button onClick={() => setModalAberto(false)} style={styles.btnClose}><FiX /></button>
            </div>
            <p style={styles.modalText}>
              Digite o nome da loja: <strong>"{lojaSelecionada?.dadosLoja?.dsNomeLoja}"</strong>
            </p>
            <input type="text" value={confirmacaoTexto} onChange={(e) => setConfirmacaoTexto(e.target.value)} style={styles.modalInput} />
            <button onClick={executarAcaoSegura} style={{ ...styles.btnConfirmar, backgroundColor: acaoTipo === 'excluir' ? '#ef4444' : '#3b82f6' }}>
              Confirmar
            </button>
          </div>
        </div>
      )}

      <div style={styles.headerFlex}>
        <div style={styles.headerText}>
          <h3 style={styles.title}>Gestão de Assinaturas</h3>

          {/* COLE AQUI O BLOCO DE BOTÕES QUE VOCÊ ENVIOU */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button onClick={() => setFiltroStatus("todos")} style={{ ...styles.btnFilter, backgroundColor: filtroStatus === "todos" ? '#e2e8f0' : '#f1f5f9' }}>
              Todos ({lojistas.length})
            </button>
            <button onClick={() => setFiltroStatus("vencer")} style={{ ...styles.btnFilter, backgroundColor: filtroStatus === "vencer" ? '#fef3c7' : '#f1f5f9', color: '#b45309', border: filtroStatus === "vencer" ? '1px solid #fcd34d' : 'none' }}>
              A vencer ({totalVencer})
            </button>
            <button onClick={() => setFiltroStatus("vencidos")} style={{ ...styles.btnFilter, backgroundColor: filtroStatus === "vencidos" ? '#fee2e2' : '#f1f5f9', color: '#ef4444', border: filtroStatus === "vencidos" ? '1px solid #fecdd3' : 'none' }}>
              Vencidos ({totalVencidos})
            </button>
          </div>
        </div>

        <div style={styles.searchWrapper}>
          <FiSearch style={styles.searchIcon} />
          <input type="text" placeholder="Nome da loja..." value={busca} onChange={(e) => setBusca(e.target.value)} style={styles.searchInput} />
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>LOJA / CADASTRO</th>
              <th style={styles.th}>PLANO</th>
              <th style={styles.th}>CICLO</th>
              <th style={styles.th}>VENCIMENTO</th>
              <th style={styles.th}>ÚLTIMO LOGIN</th>
              <th style={styles.th}>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {lojistasExibidos.map((loja) => {
              const statusVenc = obterStatusVencimento(loja.dadosLoja?.tsVencimentoLoja?.seconds ? new Date(loja.dadosLoja.tsVencimentoLoja.seconds * 1000).toISOString() : "");
              return (
                <tr key={loja.id} style={{ ...styles.tr, borderLeft: statusVenc.alerta ? '4px solid #ef4444' : '4px solid transparent' }}>
                  <td style={styles.td}>
                    <div style={styles.lojaInfo}>
                      <div style={styles.avatarLoja}><FiUser /></div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong
                            style={{ ...styles.nomeLoja, cursor: 'pointer', color: '#3b82f6' }}
                            // Certifique-se que você está passando 'loja.id' e não 'uid' ou algo do Master
                            onClick={() => {
                              console.log("ID da loja clicada:", loja.id); // Verifique se este log mostra o ID correto
                              setLojaParaPerfil(loja.id);
                            }}
                          >
                            {loja.dadosLoja?.dsNomeLoja || "Sem nome"}

                            {loja.sistema?.dsStatusUpgrade === "pendente" && (
                              <span style={{
                                marginLeft: '8px',
                                background: '#ecfdf5', color: '#065f46', padding: '2px 6px',
                                borderRadius: '4px', fontSize: '8px', fontWeight: '900',
                                textTransform: 'uppercase', border: '1px solid #d1fae5'
                              }}>
                                UPGRADE PENDENTE
                              </span>
                            )}

                          </strong>

                          {/* SELO Ouro Teste aqui */}
                          {loja.sistema?.dsPlanoTeste === "Ouro" && (
                            <span style={{
                              background: '#fef3c7', color: '#b45309', padding: '2px 6px',
                              borderRadius: '4px', fontSize: '8px', fontWeight: '900',
                              textTransform: 'uppercase', border: '1px solid #fcd34d'
                            }}>
                              Ouro Teste
                            </span>
                          )}
                        </div>
                        <small style={styles.cpfLoja}>
                          Cadastrado: {loja.dadosLoja?.tsCriacaoLoja?.seconds ? new Date(loja.dadosLoja.tsCriacaoLoja.seconds * 1000).toLocaleDateString('pt-BR') : '---'}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <select
                      value={loja.dadosLoja?.dsPlanoLoja || "Bronze"}
                      onChange={async (e) => {
                        const novoPlano = e.target.value;

                        // 1. Atualiza no Firebase
                        await updateDoc(doc(db, "lojistas", loja.id), {
                          "dadosLoja.dsPlanoLoja": novoPlano
                        });

                        // 2. FORÇA a atualização do estado local (AQUI ESTAVA O SEGREDO)
                        setLojistas(prev => prev.map(l =>
                          l.id === loja.id
                            ? { ...l, dadosLoja: { ...l.dadosLoja, dsPlanoLoja: novoPlano } }
                            : l
                        ));

                        mostrarAviso(`Plano alterado para ${novoPlano}!`);
                      }}
                      style={styles.select}
                    >
                      {Object.keys(planos).map((planoKey) => (
                        <option key={planoKey} value={planoKey.charAt(0).toUpperCase() + planoKey.slice(1)}>
                          {planoKey.charAt(0).toUpperCase() + planoKey.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.cicloToggle}>
                      <button onClick={() => alterarCicloECalcularVencimento(loja.id, "mensal", loja.dadosLoja?.dsPlanoLoja)} style={{ ...styles.btnToggle, ...(loja.dadosLoja?.ciclo === "mensal" ? styles.activeM : {}) }}>M</button>
                      <button onClick={() => alterarCicloECalcularVencimento(loja.id, "anual", loja.dadosLoja?.dsPlanoLoja)} style={{ ...styles.btnToggle, ...(loja.dadosLoja?.ciclo === "anual" ? styles.activeA : {}) }}>A</button>
                    </div>
                  </td>
                  <td style={styles.td}>
                    {/* Data do Plano Real */}
                    <div style={{ color: statusVenc.cor, fontWeight: '800', fontSize: '12px' }}>
                      {loja.dadosLoja?.tsVencimentoLoja?.seconds
                        ? new Date(loja.dadosLoja.tsVencimentoLoja.seconds * 1000).toLocaleDateString('pt-BR')
                        : '---'}
                    </div>

                    {loja.sistema?.dsPlanoTeste === "Ouro" && loja.sistema?.tsVencimentoTeste?.seconds && (
                      <div style={{
                        fontSize: '10px', color: '#d97706', marginTop: '4px',
                        fontWeight: 'bold', background: '#fffbeb', padding: '2px 4px', borderRadius: '4px', width: 'fit-content'
                      }}>
                        Teste expira em: {Math.max(0, Math.ceil((loja.sistema.tsVencimentoTeste.seconds * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))} dias
                      </div>
                    )}
                  </td>

                  <td style={styles.td}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>
                      <FiClock size={12} color="#94a3b8" /> {loja.ultimoLogin?.seconds ? new Date(loja.ultimoLogin.seconds * 1000).toLocaleDateString('pt-BR') : 'Sem acesso'}
                      {loja.ultimoLogin?.seconds && <div style={{ marginLeft: '16px', fontSize: '10px' }}>{new Date(loja.ultimoLogin.seconds * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>}
                    </div>
                  </td>

                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '8px' }}>

                      <button
                        onClick={() => renovarAssinatura(loja)}
                        style={{ ...styles.btnAction, color: '#059669' }}
                        title="Confirmar Pagamento / Renovar"
                      >
                        <FiCalendar size={18} />
                      </button>

                      {/* NOVO BOTÃO DE MIMOS (ESTRELA) */}
                      <button
                        onClick={() => toggleTesteOuro(loja)} // Chama a nova função de toggle
                        style={styles.btnAction}
                        title={loja.sistema?.isTesteOuroAtivo ? "Desativar Ouro Teste" : "Ativar Ouro Teste"}
                      >
                        <FiStar
                          color={loja.sistema?.isTesteOuroAtivo ? "#f59e0b" : "#94a3b8"}
                          size={18}
                          fill={loja.sistema?.isTesteOuroAtivo ? "#f59e0b" : "none"}
                        />
                      </button>

                      {/* SEUS BOTÕES EXISTENTES */}
                      <button
                        style={styles.btnAction}
                        title="Suspender/Ativar"
                        onClick={async () => {
                          const statusAtual = loja.dadosLoja?.dsStatusLoja || 'ativo';
                          const novoStatus = statusAtual === 'suspenso' ? 'ativo' : 'suspenso';

                          try {
                            // 1. Atualiza no Firebase
                            await updateDoc(doc(db, "lojistas", loja.id), {
                              "dadosLoja.dsStatusLoja": novoStatus,
                            });

                            // 2. Atualiza o estado local para refletir na tela imediatamente
                            setLojistas((prev) =>
                              prev.map((l) =>
                                l.id === loja.id
                                  ? { ...l, dadosLoja: { ...l.dadosLoja, dsStatusLoja: novoStatus } }
                                  : l
                              )
                            );

                            mostrarAviso(`Loja ${novoStatus === 'suspenso' ? 'suspensa' : 'ativada'}!`);
                          } catch (error) {
                            console.error("Erro ao alterar status:", error);
                            mostrarAviso("Erro ao alterar status.", "erro");
                          }
                        }}
                      >
                        {(loja.dadosLoja?.dsStatusLoja || 'ativo') === 'suspenso' ? (
                          <FiPlayCircle color="#10b981" size={18} />
                        ) : (
                          <FiPauseCircle color="#f59e0b" size={18} />
                        )}
                      </button>

                      <button onClick={() => abrirConfirmacao(loja, "limpar")} style={styles.btnAction} title="Limpar">
                        <FiRefreshCw color="#3b82f6" size={16} />
                      </button>

                      <button onClick={() => abrirConfirmacao(loja, "excluir")} style={styles.btnAction} title="Excluir">
                        <FiTrash2 color="#ef4444" size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {lastDoc && <button onClick={() => carregarDados(busca)} style={styles.btnCarregarMais}>Carregar mais</button>}
      </div>
      {/* ... após a tabela, dentro do return principal ... */}
      {lojaParaPerfil && (
        <ModalPerfilLojista
          lojaId={lojaParaPerfil}
          onClose={() => setLojaParaPerfil(null)}
        />
      )}

    </div >
  );
}
// Componente de Modal de Perfil




const styles: any = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px' },
  headerFlex: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0 },
  sub: { fontSize: '12px', color: '#64748b', fontWeight: 'bold' },
  btnFilter: { border: 'none', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' },
  searchWrapper: { position: 'relative', width: '250px' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' },
  searchInput: { width: '100%', padding: '10px 10px 10px 35px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '13px', outline: 'none' },
  tableContainer: { background: "#fff", borderRadius: "20px", overflow: 'hidden', boxShadow: "0 4px 10px rgba(0,0,0,0.02)" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "15px 20px", textAlign: 'left', background: '#f8fafc', color: '#64748b', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' },
  td: { padding: "15px 20px", borderBottom: "1px solid #f1f5f9" },
  tr: { transition: '0.2s' },
  lojaInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatarLoja: { width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' },
  nomeLoja: { display: 'block', fontSize: '14px', color: '#1e293b' },
  cpfLoja: { fontSize: '10px', color: '#94a3b8', display: 'block', marginTop: '2px' },
  select: { padding: '5px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold', outline: 'none' },
  cicloToggle: { display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '2px', width: 'fit-content' },
  btnToggle: { border: 'none', background: 'transparent', padding: '4px 10px', fontSize: '10px', fontWeight: '900', borderRadius: '6px', cursor: 'pointer', color: '#94a3b8' },
  activeM: { background: '#10b981', color: '#fff' },
  activeA: { background: '#3b82f6', color: '#fff' },
  btnAction: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modalContent: { background: '#fff', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  btnClose: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' },
  modalText: { fontSize: '14px', color: '#475569', marginBottom: '20px', lineHeight: '1.6' },
  nomeDestaque: { display: 'block', margin: '10px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a', textAlign: 'center', background: '#f8fafc', padding: '10px', borderRadius: '10px' },
  modalInput: { width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none', marginBottom: '20px', textAlign: 'center', fontWeight: 'bold' },
  btnConfirmar: { width: '100%', padding: '14px', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }
};