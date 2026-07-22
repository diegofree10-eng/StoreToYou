"use client";
import React from "react";
import { db, storage } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import {
  FiAward, FiUploadCloud, FiZap, FiTruck, FiCreditCard,
  FiStar, FiShoppingBag, FiDollarSign, FiCalendar, FiClock,
  FiLayers, FiPieChart
} from "react-icons/fi";

interface TabPlanosProps {
  planos: any;
  setPlanos: React.Dispatch<React.SetStateAction<any>>;
  mostrarAviso: (msg: string, tipo?: string) => void;
}

export default function TabPlanos({ planos, setPlanos, mostrarAviso }: TabPlanosProps) {

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

      // Ajuste: Encontra a chave do plano, ignorando maiúsculas/minúsculas
      const chaves = Object.keys(planosFormatados);
      const chaveOuro = chaves.find(k => k.toLowerCase() === 'ouro');

      // Pega o valor dos dias, garantindo que pegamos o número correto
      const diasOuroConfig = chaveOuro ? Number(planosFormatados[chaveOuro]?.diasTeste || 0) : 0;

      // Log para depuração: verifique no F12 se este valor é 15
      console.log("Chave encontrada:", chaveOuro);
      console.log("Dias capturados:", diasOuroConfig);

      // Remove campos temporários
      Object.keys(planosFormatados).forEach((key) => {
        delete planosFormatados[key].temGateway;
      });

      // Salva os planos
      await setDoc(doc(db, "configuracoes", "planos"), planosFormatados);

      // Salva a configuração global
      await setDoc(doc(db, "configuracoes", "sistema"), {
        nrDiasTesteOuro: diasOuroConfig, // Agora ele deve salvar o valor de 15
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

        return (
          <div key={key} style={{ ...styles.planCard, borderTop: `6px solid ${planos[key].cor}` }}>
            <div style={styles.medalhaPreview}>
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
              <div style={styles.inputGroupPreco}>
                <label style={styles.labelPreco}>ASSINATURA MENSAL</label>
                <div style={styles.wrapperInputIcon}>
                  <FiDollarSign style={styles.iconInput} />
                  <input
                    type="text"
                    value={(planos[key].preco || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    onChange={(e) => handleChangePreco(key, "preco", e.target.value)}
                    style={styles.inputPreco}
                  />
                </div>
              </div>

              <div style={{ ...styles.inputGroupPreco, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <label style={{ ...styles.labelPreco, color: '#0369a1' }}>ASSINATURA ANUAL</label>
                <div style={styles.wrapperInputIcon}>
                  <FiCalendar style={{ ...styles.iconInput, color: '#0ea5e9' }} />
                  <input
                    type="text"
                    value={(planos[key].precoAnual || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    onChange={(e) => handleChangePreco(key, "precoAnual", e.target.value)}
                    style={{ ...styles.inputPreco, border: '1px solid #7dd3fc', color: '#0369a1' }}
                  />
                </div>
              </div>

              <div style={{ ...styles.inputGroupPreco, background: '#fff7ed', border: '1px solid #ffedd5' }}>
                <label style={{ ...styles.labelPreco, color: '#9a3412' }}>PERÍODO DE TESTE (DIAS)</label>
                <div style={styles.wrapperInputIcon}>
                  <FiClock style={{ ...styles.iconInput, color: '#f97316' }} />
                  <input
                    type="number"
                    value={planos[key].diasTeste || 0}
                    onChange={(e) => setPlanos({
                      ...planos,
                      [key]: { ...planos[key], diasTeste: Number(e.target.value) }
                    })}
                    style={{ ...styles.inputPreco, border: '1px solid #fed7aa', color: '#9a3412' }}
                    placeholder="Ex: 7"
                  />
                </div>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>LIMITE PRODUTOS</label>
              <input
                type="number"
                value={planos[key].produtos || 0}
                onChange={(e) => setPlanos({ ...planos, [key]: { ...planos[key], produtos: Number(e.target.value) } })}
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>LIMITE CATEGORIAS</label>
              <input
                type="number"
                value={planos[key].categorias || 0}
                onChange={(e) => setPlanos({ ...planos, [key]: { ...planos[key], categorias: Number(e.target.value) } })}
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>MODELO DE DASHBOARD</label>
              <select
                value={planos[key].modeloDash || "basico"}
                onChange={(e) => setPlanos({ ...planos, [key]: { ...planos[key], modeloDash: e.target.value } })}
                style={{ ...styles.input, backgroundColor: '#f0f9ff' }}
              >
                <option value="basico">📊 Básico</option>
                <option value="completo">📈 Completo</option>
              </select>
            </div>

            <div style={styles.recursosSection}>
              <p style={styles.recursosTitle}>💳 API DE PAGAMENTOS (RECEBIMENTO ONLINE)</p>
              <label style={styles.checkRow}>
                <div style={styles.checkLabel}><FiCreditCard color="#009ee3" /> Mercado Pago Habilitado</div>
                <input
                  type="checkbox"
                  checked={gatewaysLiberados.includes("mercado_pago")}
                  onChange={() => handleToggleMeioPagamento(key, 'mercado_pago')}
                />
              </label>
              <label style={styles.checkRow}>
                <div style={styles.checkLabel}><FiCreditCard color="#ff6c00" /> PagSeguro Habilitado</div>
                <input
                  type="checkbox"
                  checked={gatewaysLiberados.includes("pagseguro")}
                  onChange={() => handleToggleMeioPagamento(key, 'pagseguro')}
                />
              </label>
            </div>

            {/* SEÇÃO: RECURSOS ADICIONAIS — ALINHAMENTO ORIGINAL 100% RESTAURADO */}
            <div style={styles.recursosSection}>
              <p style={styles.recursosTitle}>RECURSOS ADICIONAIS HABILITADOS</p>

              <label style={styles.checkRow}>
                <div style={styles.checkLabel}><FiPieChart /> Canais de Renda (CSV)</div>
                <input type="checkbox" checked={!!planos[key].temCanaisRenda} onChange={() => toggleRecurso(key, 'temCanaisRenda')} />
              </label>

              <label style={styles.checkRow}>
                <div style={styles.checkLabel}><FiDollarSign /> Módulo de Despesas</div>
                <input type="checkbox" checked={!!planos[key].temDespesas} onChange={() => toggleRecurso(key, 'temDespesas')} />
              </label>

              <label style={styles.checkRow}>
                <div style={styles.checkLabel}><FiShoppingBag /> Marketplace</div>
                <input type="checkbox" checked={!!planos[key].temMarketplace} onChange={() => toggleRecurso(key, 'temMarketplace')} />
              </label>

              <label style={styles.checkRow}>
                <div style={styles.checkLabel}><FiTruck /> Cálculo de Frete (Melhor Envio)</div>
                <input type="checkbox" checked={!!planos[key].temLogistica} onChange={() => toggleRecurso(key, 'temLogistica')} />
              </label>

              <label style={styles.checkRow}>
                <div style={styles.checkLabel}><FiTruck color="#10b981" /> Estratégia de Frete Grátis</div>
                <input type="checkbox" checked={!!planos[key].temFreteGratis} onChange={() => toggleRecurso(key, 'temFreteGratis')} />
              </label>

              <label style={styles.checkRow}>
                <div style={styles.checkLabel}><FiZap /> Cupons</div>
                <input type="checkbox" checked={!!planos[key].temCupons} onChange={() => toggleRecurso(key, 'temCupons')} />
              </label>

              <label style={styles.checkRow}>
                <div style={styles.checkLabel}><FiLayers /> Personalização</div>
                <input type="checkbox" checked={!!planos[key].temPersonalizacao} onChange={() => toggleRecurso(key, 'temPersonalizacao')} />
              </label>

              <label style={styles.checkRow}>
                <div style={styles.checkLabel}><FiStar /> Suporte Master</div>
                <input type="checkbox" checked={!!planos[key].temSuporte} onChange={() => toggleRecurso(key, 'temSuporte')} />
              </label>
            </div>

            <label style={styles.uploadBtn}>
              <FiUploadCloud /> Trocar Medalha
              <input type="file" hidden accept="image/*" onChange={(e) => e.target.files && handleUploadMedalha(key, e.target.files[0])} />
            </label>
            
          </div>
        );
      })}

      <button onClick={salvarConfiguracoes} style={styles.saveBtn}>
        Salvar Todas as Configurações de Planos
      </button>
    </div>

  );
}

const styles: any = {
  gridPlanos: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" },
  planCard: { background: "#fff", padding: "25px", borderRadius: "20px", textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.03)" },
  medalhaPreview: { width: "70px", height: "70px", margin: "0 auto 20px", background: "#f1f5f9", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", overflow: 'hidden', border: '3px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
  img: { width: '100%', height: '100%', objectFit: 'cover' },
  containerFinanceiro: { marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  inputGroupPreco: { textAlign: 'left', background: '#f0fdf4', padding: '10px', borderRadius: '12px', border: '1px solid #dcfce7' },
  labelPreco: { fontSize: "9px", color: "#166534", fontWeight: "900", marginLeft: '5px', display: 'block', marginBottom: '2px', letterSpacing: '0.5px' },
  wrapperInputIcon: { position: 'relative', display: 'flex', alignItems: 'center' },
  iconInput: { position: 'absolute', left: '10px', color: '#16a34a', fontSize: '14px' },
  inputPreco: { width: "100%", padding: "8px 10px 8px 30px", borderRadius: "8px", border: "1px solid #bbf7d0", fontSize: '15px', fontWeight: '800', outline: 'none', color: '#166534', background: '#fff' },
  inputGroup: { marginBottom: '15px', textAlign: 'left' },
  label: { fontSize: "10px", color: "#94a3b8", fontWeight: "800", marginLeft: '5px', display: 'block', marginBottom: '5px' },
  input: { width: "100%", padding: "10px", borderRadius: "10px", border: "2px solid #f1f5f9", marginTop: "5px", fontSize: '15px', fontWeight: '600', outline: 'none' },
  recursosSection: { marginTop: '15px', padding: '15px', background: '#f8fafc', borderRadius: '15px', textAlign: 'left', border: '1px solid #e2e8f0' },
  recursosTitle: { fontSize: '10px', fontWeight: '900', color: '#64748b', marginBottom: '10px', letterSpacing: '1px' },
  checkRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' },
  checkLabel: { fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', color: '#475569' },
  uploadBtn: { marginTop: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "13px", color: "#3b82f6", cursor: "pointer", fontWeight: '700', padding: '10px', background: '#eff6ff', borderRadius: '10px' },
  saveBtn: { gridColumn: "1 / -1", marginTop: "20px", padding: "18px", background: "#0f172a", color: "#fff", border: "none", borderRadius: "15px", fontWeight: "800", cursor: "pointer", transition: '0.2s' }
};