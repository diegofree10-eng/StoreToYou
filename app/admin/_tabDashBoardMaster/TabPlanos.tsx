"use client";
import React from "react";
import { db, storage } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import { useTheme } from "@/context/ThemeContext";
import {
  FiAward, FiUploadCloud, FiZap, FiTruck, FiCreditCard,
  FiStar, FiShoppingBag, FiDollarSign, FiCalendar, FiClock,
  FiLayers, FiPieChart, FiShield
} from "react-icons/fi";

interface TabPlanosProps {
  planos: any;
  setPlanos: React.Dispatch<React.SetStateAction<any>>;
  mostrarAviso: (msg: string, tipo?: string) => void;
}

export default function TabPlanos({ planos, setPlanos, mostrarAviso }: TabPlanosProps) {
  const { theme, isModoNoturno } = useTheme();

  const handleChangePreco = (planoKey: string, campo: string, valorRaw: string) => {
    const apenasNumeros = valorRaw.replace(/\D/g, "");
    const valorFinal = Number(apenasNumeros) / 100;

    setPlanos({
      ...planos,
      [planoKey]: { ...planos[planoKey], [campo]: valorFinal }
    });
  };

  const toggleRecurso = (planoKey: string, recurso: string) => {
    setPlanos({
      ...planos,
      [planoKey]: { ...planos[planoKey], [recurso]: !planos[planoKey][recurso] }
    });
  };

  const handleToggleMeioPagamento = (planoKey: string, gateway: "mercado_pago" | "pagseguro") => {
    const meiosAtuais = Array.isArray(planos[planoKey].meios_pagamento)
      ? planos[planoKey].meios_pagamento
      : [];

    let novosMeios = [];
    if (meiosAtuais.includes(gateway)) {
      novosMeios = meiosAtuais.filter((g: string) => g !== gateway);
    } else {
      novosMeios = [...meiosAtuais, gateway];
    }

    setPlanos({
      ...planos,
      [planoKey]: { ...planos[planoKey], meios_pagamento: novosMeios }
    });
  };

  async function handleUploadMedalha(planoKey: string, arquivo: File) {
    if (!arquivo) return;
    const options = { maxSizeMB: 0.1, maxWidthOrHeight: 400, useWebWorker: true };

    try {
      mostrarAviso("Otimizando imagem...", "sucesso");
      const compressedFile = await imageCompression(arquivo, options);
      const storageRef = ref(storage, `sistema/medalhas/${planoKey}_${Date.now()}`);

      await uploadBytes(storageRef, compressedFile);
      const url = await getDownloadURL(storageRef);

      const novosPlanos = { ...planos, [planoKey]: { ...planos[planoKey], medalhaUrl: url } };
      await setDoc(doc(db, "configuracoes", "planos"), novosPlanos);

      setPlanos(novosPlanos);
      mostrarAviso(`Medalha do plano ${planoKey} atualizada!`);
    } catch (error) {
      mostrarAviso("Erro no upload da imagem.", "erro");
    }
  }

  async function salvarConfiguracoes() {
    try {
      const planosFormatados = { ...planos };

      const chaves = Object.keys(planosFormatados);
      const chaveOuro = chaves.find(k => k.toLowerCase() === 'ouro');
      const diasOuroConfig = chaveOuro ? Number(planosFormatados[chaveOuro]?.diasTeste || 0) : 0;

      Object.keys(planosFormatados).forEach((key) => {
        delete planosFormatados[key].temGateway;
      });

      await setDoc(doc(db, "configuracoes", "planos"), planosFormatados);

      await setDoc(doc(db, "configuracoes", "sistema"), {
        nrDiasTesteOuro: diasOuroConfig,
        dsPlanoTeste: "Ouro",
        ultimaAtualizacao: new Date()
      }, { merge: true });

      mostrarAviso("Configurações salvas e Dias de Teste Ouro atualizados! ✅");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      mostrarAviso(`Erro ao salvar: ${error.message}`, "erro");
    }
  }

  return (
    <div style={styles.gridPlanos}>
      {Object.keys(planos).map((key) => {
        const gatewaysLiberados = Array.isArray(planos[key].meios_pagamento)
          ? planos[key].meios_pagamento
          : [];

        const isDiamante = key.toLowerCase() === 'diamante';

        return (
          <div key={key} style={{ ...styles.planCard, background: theme.bgCard, border: `1px solid ${theme.border}`, borderTop: `6px solid ${planos[key].cor}` }}>
            <div style={{ ...styles.medalhaPreview, background: isModoNoturno ? theme.bgApp : '#f1f5f9', border: `3px solid ${theme.bgCard}` }}>
              {planos[key].medalhaUrl ? (
                <img src={planos[key].medalhaUrl} style={styles.img} alt="Medalha" />
              ) : (
                <FiAward size={30} color={planos[key].cor} />
              )}
            </div>

            <h3 style={{ color: planos[key].cor, marginBottom: '20px', fontWeight: '900' }}>
              PLANO {key.toUpperCase()}
            </h3>

            <div style={styles.containerFinanceiro}>
              <div style={{ ...styles.inputGroupPreco, background: isModoNoturno ? theme.bgApp : '#f0fdf4', border: `1px solid ${isModoNoturno ? theme.border : '#dcfce7'}` }}>
                <label style={{ ...styles.labelPreco, color: isModoNoturno ? '#4ade80' : '#166534' }}>ASSINATURA MENSAL</label>
                <div style={styles.wrapperInputIcon}>
                  <FiDollarSign style={{ ...styles.iconInput, color: isModoNoturno ? '#4ade80' : '#16a34a' }} />
                  <input
                    type="text"
                    value={(planos[key].preco || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    onChange={(e) => handleChangePreco(key, "preco", e.target.value)}
                    style={{ ...styles.inputPreco, background: theme.bgCard, color: isModoNoturno ? '#4ade80' : '#166534', border: `1px solid ${theme.border}` }}
                  />
                </div>
              </div>

              <div style={{ ...styles.inputGroupPreco, background: isModoNoturno ? theme.bgApp : '#f0f9ff', border: `1px solid ${isModoNoturno ? theme.border : '#bae6fd'}` }}>
                <label style={{ ...styles.labelPreco, color: isModoNoturno ? '#38bdf8' : '#0369a1' }}>ASSINATURA ANUAL</label>
                <div style={styles.wrapperInputIcon}>
                  <FiCalendar style={{ ...styles.iconInput, color: '#0ea5e9' }} />
                  <input
                    type="text"
                    value={(planos[key].precoAnual || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    onChange={(e) => handleChangePreco(key, "precoAnual", e.target.value)}
                    style={{ ...styles.inputPreco, background: theme.bgCard, border: `1px solid ${theme.border}`, color: isModoNoturno ? '#38bdf8' : '#0369a1' }}
                  />
                </div>
              </div>

              <div style={{ ...styles.inputGroupPreco, background: isModoNoturno ? theme.bgApp : '#fff7ed', border: `1px solid ${isModoNoturno ? theme.border : '#ffedd5'}` }}>
                <label style={{ ...styles.labelPreco, color: isModoNoturno ? '#fb923c' : '#9a3412' }}>PERÍODO DE TESTE (DIAS)</label>
                <div style={styles.wrapperInputIcon}>
                  <FiClock style={{ ...styles.iconInput, color: '#f97316' }} />
                  <input
                    type="number"
                    value={planos[key].diasTeste || 0}
                    onChange={(e) => setPlanos({
                      ...planos,
                      [key]: { ...planos[key], diasTeste: Number(e.target.value) }
                    })}
                    style={{ ...styles.inputPreco, background: theme.bgCard, border: `1px solid ${theme.border}`, color: isModoNoturno ? '#fb923c' : '#9a3412' }}
                    placeholder="Ex: 7"
                  />
                </div>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={{ ...styles.label, color: theme.textSec }}>LIMITE PRODUTOS</label>
              <input
                type="number"
                value={planos[key].produtos || 0}
                onChange={(e) => setPlanos({ ...planos, [key]: { ...planos[key], produtos: Number(e.target.value) } })}
                style={{ ...styles.input, background: theme.inputBg || theme.bgApp, color: theme.textMain, border: `2px solid ${theme.border}` }}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={{ ...styles.label, color: theme.textSec }}>LIMITE CATEGORIAS</label>
              <input
                type="number"
                value={planos[key].categorias || 0}
                onChange={(e) => setPlanos({ ...planos, [key]: { ...planos[key], categorias: Number(e.target.value) } })}
                style={{ ...styles.input, background: theme.inputBg || theme.bgApp, color: theme.textMain, border: `2px solid ${theme.border}` }}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={{ ...styles.label, color: theme.textSec }}>MODELO DE DASHBOARD</label>
              <select
                value={planos[key].modeloDash || "basico"}
                onChange={(e) => setPlanos({ ...planos, [key]: { ...planos[key], modeloDash: e.target.value } })}
                style={{ ...styles.input, backgroundColor: isModoNoturno ? theme.bgApp : '#f0f9ff', color: theme.textMain, border: `2px solid ${theme.border}` }}
              >
                <option value="basico">📊 Básico</option>
                <option value="completo">📈 Completo</option>
              </select>
            </div>

            <div style={{ ...styles.recursosSection, background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}` }}>
              <p style={{ ...styles.recursosTitle, color: theme.textSec }}>💳 API DE PAGAMENTOS (RECEBIMENTO ONLINE)</p>
              <label style={{ ...styles.checkRow, borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ ...styles.checkLabel, color: theme.textMain }}><FiCreditCard color="#009ee3" /> Mercado Pago Habilitado</div>
                <input
                  type="checkbox"
                  checked={gatewaysLiberados.includes("mercado_pago")}
                  onChange={() => handleToggleMeioPagamento(key, 'mercado_pago')}
                />
              </label>
              <label style={{ ...styles.checkRow, borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ ...styles.checkLabel, color: theme.textMain }}><FiCreditCard color="#ff6c00" /> PagSeguro Habilitado</div>
                <input
                  type="checkbox"
                  checked={gatewaysLiberados.includes("pagseguro")}
                  onChange={() => handleToggleMeioPagamento(key, 'pagseguro')}
                />
              </label>
            </div>

            <div style={{ ...styles.recursosSection, background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}` }}>
              <p style={{ ...styles.recursosTitle, color: theme.textSec }}>RECURSOS ADICIONAIS HABILITADOS</p>

              <label style={{ ...styles.checkRow, borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ ...styles.checkLabel, color: theme.textMain }}><FiDollarSign color="#10b981" /> Módulo PDV (Caixa Presencial)</div>
                <input type="checkbox" checked={!!planos[key].temPdv} onChange={() => toggleRecurso(key, 'temPdv')} />
              </label>

              <label style={{ ...styles.checkRow, borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ ...styles.checkLabel, color: theme.textMain }}><FiPieChart /> Canais de Renda (CSV)</div>
                <input type="checkbox" checked={!!planos[key].temCanaisRenda} onChange={() => toggleRecurso(key, 'temCanaisRenda')} />
              </label>

              <label style={{ ...styles.checkRow, borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ ...styles.checkLabel, color: theme.textMain }}><FiDollarSign /> Módulo de Despesas</div>
                <input type="checkbox" checked={!!planos[key].temDespesas} onChange={() => toggleRecurso(key, 'temDespesas')} />
              </label>

              <label style={{ ...styles.checkRow, borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ ...styles.checkLabel, color: theme.textMain }}><FiShoppingBag /> Marketplace</div>
                <input type="checkbox" checked={!!planos[key].temMarketplace} onChange={() => toggleRecurso(key, 'temMarketplace')} />
              </label>

              <label style={{ ...styles.checkRow, borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ ...styles.checkLabel, color: theme.textMain }}><FiTruck /> Cálculo de Frete (Melhor Envio)</div>
                <input type="checkbox" checked={!!planos[key].temLogistica} onChange={() => toggleRecurso(key, 'temLogistica')} />
              </label>

              <label style={{ ...styles.checkRow, borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ ...styles.checkLabel, color: theme.textMain }}><FiTruck color="#6366f1" /> ⚡ Automação Completa Melhor Envio</div>
                <input type="checkbox" checked={!!planos[key].temAutomacaoFrete} onChange={() => toggleRecurso(key, 'temAutomacaoFrete')} />
              </label>

              {isDiamante && (
                <label style={{ ...styles.checkRow, borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ ...styles.checkLabel, color: '#ca8a04' }}>
                    <FiShield color="#ca8a04" /> 🟡 Acesso a Modo Sandbox (Testes)
                  </div>
                  <input type="checkbox" checked={!!planos[key].temSandbox} onChange={() => toggleRecurso(key, 'temSandbox')} />
                </label>
              )}

              <label style={{ ...styles.checkRow, borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ ...styles.checkLabel, color: theme.textMain }}><FiTruck color="#10b981" /> Estratégia de Frete Grátis</div>
                <input type="checkbox" checked={!!planos[key].temFreteGratis} onChange={() => toggleRecurso(key, 'temFreteGratis')} />
              </label>

              <label style={{ ...styles.checkRow, borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ ...styles.checkLabel, color: theme.textMain }}><FiZap /> Cupons</div>
                <input type="checkbox" checked={!!planos[key].temCupons} onChange={() => toggleRecurso(key, 'temCupons')} />
              </label>

              <label style={{ ...styles.checkRow, borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ ...styles.checkLabel, color: theme.textMain }}><FiLayers /> Personalização</div>
                <input type="checkbox" checked={!!planos[key].temPersonalizacao} onChange={() => toggleRecurso(key, 'temPersonalizacao')} />
              </label>

              <label style={{ ...styles.checkRow, borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ ...styles.checkLabel, color: theme.textMain }}><FiStar /> Suporte Master</div>
                <input type="checkbox" checked={!!planos[key].temSuporte} onChange={() => toggleRecurso(key, 'temSuporte')} />
              </label>
            </div>

            <label style={{ ...styles.uploadBtn, background: isModoNoturno ? theme.bgApp : '#eff6ff', color: '#3b82f6' }}>
              <FiUploadCloud /> Trocar Medalha
              <input type="file" hidden accept="image/*" onChange={(e) => e.target.files && handleUploadMedalha(key, e.target.files[0])} />
            </label>
            
          </div>
        );
      })}

      <button onClick={salvarConfiguracoes} style={{ ...styles.saveBtn, background: isModoNoturno ? theme.bgCard : '#0f172a', color: '#fff', border: `1px solid ${theme.border}` }}>
        Salvar Todas as Configurações de Planos
      </button>
    </div>
  );
}

const styles: any = {
  gridPlanos: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" },
  planCard: { padding: "25px", borderRadius: "20px", textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.03)" },
  medalhaPreview: { width: "70px", height: "70px", margin: "0 auto 20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
  img: { width: '100%', height: '100%', objectFit: 'cover' },
  containerFinanceiro: { marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  inputGroupPreco: { textAlign: 'left', padding: '10px', borderRadius: '12px' },
  labelPreco: { fontSize: "9px", fontWeight: "900", marginLeft: '5px', display: 'block', marginBottom: '2px', letterSpacing: '0.5px' },
  wrapperInputIcon: { position: 'relative', display: 'flex', alignItems: 'center' },
  iconInput: { position: 'absolute', left: '10px', fontSize: '14px' },
  inputPreco: { width: "100%", padding: "8px 10px 8px 30px", borderRadius: "8px", fontSize: '15px', fontWeight: '800', outline: 'none' },
  inputGroup: { marginBottom: '15px', textAlign: 'left' },
  label: { fontSize: "10px", fontWeight: "800", marginLeft: '5px', display: 'block', marginBottom: '5px' },
  input: { width: "100%", padding: "10px", borderRadius: "10px", marginTop: "5px", fontSize: '15px', fontWeight: '600', outline: 'none' },
  recursosSection: { marginTop: '15px', padding: '15px', borderRadius: '15px', textAlign: 'left' },
  recursosTitle: { fontSize: '10px', fontWeight: '900', marginBottom: '10px', letterSpacing: '1px' },
  checkRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', cursor: 'pointer' },
  checkLabel: { fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' },
  uploadBtn: { marginTop: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "13px", cursor: "pointer", fontWeight: '700', padding: '10px', borderRadius: '10px' },
  saveBtn: { gridColumn: "1 / -1", marginTop: "20px", padding: "18px", border: "none", borderRadius: "15px", fontWeight: "800", cursor: "pointer", transition: '0.2s' }
};