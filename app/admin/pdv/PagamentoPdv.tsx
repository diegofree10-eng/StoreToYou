// app/admin/pdv/PagamentoPdv.tsx
"use client";
import React from "react";
import { Store, Truck, Edit3, PlusCircle, Clock } from "lucide-react";
import { aplicarMascara } from "@/utils/formatters";

export default function PagamentoPdv({
  cliente,
  setCliente,
  endereco,
  setEndereco,
  handleCepChange,
  tipoEntrega,
  setTipoEntrega,
  valorEntregaLocal,
  carrinho,
  alterarQuantidade,
  removerDoCarrinho,
  setItemEditandoCartId,
  formaPagamento,
  setFormaPagamento,
  vlEntrada,
  setVlEntrada,
  dsPrazoRestante,
  setDsPrazoRestante,
  calcularSubtotal,
  calcularTotalGeral,
  finalizarVenda,
  carregandoVenda,
  formatarMoeda,
  theme,
  styles,
  onAbrirModalProdutos
}: any) {
  
  const isParcelado = vlEntrada > 0;

  return (
    <div style={{ 
      background: theme.bgCard, 
      padding: "24px", 
      borderRadius: "16px", 
      border: `1px solid ${theme.border}`, 
      display: "flex", 
      flexDirection: "column", 
      justifyContent: "space-between", 
      width: "100%", 
      maxWidth: "1100px", 
      margin: "0 auto", 
      height: "calc(100vh - 30px)", 
      boxShadow: "0 6px 16px rgba(0,0,0,0.08)", 
      boxSizing: "border-box" 
    }}>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1, minHeight: 0, overflow: "hidden" }}>
        
        {/* CABEÇALHO DO PDV + BOTÃO DE ADICIONAR PRODUTOS */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", borderBottom: `1px solid ${theme.border}`, paddingBottom: "14px", flexShrink: 0 }}>
          <div>
            <h3 style={{ margin: 0, color: theme.textMain, fontSize: "17px", fontWeight: "800", textTransform: 'uppercase' }}>🛒 Caixa / PDV • Fechamento de Venda</h3>
            <span style={{ fontSize: "11px", color: theme.textSec }}>Gerencie o cliente, itens e condições de pagamento</span>
          </div>

          <button
            type="button"
            onClick={onAbrirModalProdutos}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              background: theme.primary,
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              fontWeight: "bold",
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              transition: "transform 0.1s"
            }}
          >
            <PlusCircle size={18} /> Adicionar Produtos ao Pedido
          </button>
        </div>

        {/* GRID PRINCIPAL (DUAS COLUNAS) */}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "20px", flex: 1, minHeight: 0 }} className="pdv-grid-layout">
          
          {/* COLUNA ESQUERDA: CLIENTE E ITENS DO CARRINHO */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", minHeight: 0 }}>
            
            {/* BLOCO DE DADOS DO CLIENTE */}
            <div style={{ background: theme.bgApp, padding: '12px', borderRadius: '10px', border: `1px solid ${theme.border}`, flexShrink: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, display: 'block', marginBottom: '8px' }}>👤 DADOS DO CLIENTE</span>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="Nome Completo *"
                  value={cliente.nmNomeCliente}
                  onChange={(e) => setCliente((prev: any) => ({ ...prev, nmNomeCliente: e.target.value }))}
                  style={{ flex: 2, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, ...styles.inputPDVBase }}
                />
                <input
                  type="text"
                  placeholder="WhatsApp *"
                  value={cliente.dsTelefoneCliente}
                  onChange={(e) => setCliente((prev: any) => ({ ...prev, dsTelefoneCliente: aplicarMascara(e.target.value, 'tel') }))}
                  style={{ flex: 1.5, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, ...styles.inputPDVBase }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="CPF"
                  value={cliente.dsCpfCliente}
                  onChange={(e) => setCliente((prev: any) => ({ ...prev, dsCpfCliente: aplicarMascara(e.target.value, 'cpf') }))}
                  style={{ flex: 1, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, ...styles.inputPDVBase }}
                />
                <input
                  type="text"
                  placeholder="CEP"
                  value={cliente.dsCepCliente}
                  onChange={handleCepChange}
                  style={{ flex: 1, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, ...styles.inputPDVBase }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="Rua / Endereço"
                  value={endereco.dsRuaCliente}
                  onChange={(e) => setEndereco((prev: any) => ({ ...prev, dsRuaCliente: e.target.value }))}
                  style={{ flex: 2.5, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, ...styles.inputPDVBase }}
                />
                <input
                  type="text"
                  placeholder="Nº"
                  value={endereco.dsNumeroCliente}
                  onChange={(e) => setEndereco((prev: any) => ({ ...prev, dsNumeroCliente: e.target.value }))}
                  style={{ flex: 1, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, ...styles.inputPDVBase }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Cidade"
                  value={endereco.dsCidadeCliente}
                  onChange={(e) => setEndereco((prev: any) => ({ ...prev, dsCidadeCliente: e.target.value }))}
                  style={{ flex: 2, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, ...styles.inputPDVBase }}
                />
                <input
                  type="text"
                  placeholder="UF"
                  value={endereco.dsUfCliente}
                  onChange={(e) => setEndereco((prev: any) => ({ ...prev, dsUfCliente: e.target.value }))}
                  style={{ flex: 1, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, ...styles.inputPDVBase }}
                />
              </div>
            </div>

            {/* ITENS SELECIONADOS NO CARRINHO */}
            <div style={{ background: theme.bgApp, padding: '12px', borderRadius: '10px', border: `1px solid ${theme.border}`, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, display: 'block', marginBottom: '8px', flexShrink: 0 }}>🛍️ ITENS NO CARRINHO ({carrinho.length})</span>

              <div style={{ overflowY: "auto", flex: 1, minHeight: 0, paddingRight: "4px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {carrinho.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 10px", color: theme.textSec }}>
                    <p style={{ fontSize: "13px", margin: "0 0 8px 0" }}>Nenhum produto adicionado ainda.</p>
                    <span style={{ fontSize: "11px", opacity: 0.8 }}>Clique em "Adicionar Produtos ao Pedido" acima.</span>
                  </div>
                ) : (
                  carrinho.map((item: any) => {
                    const requisitosLista = Array.isArray(item.requisitos) ? item.requisitos : [];
                    const possuiReq = requisitosLista.length > 0;
                    
                    // Suporte aos novos campos de prazo (com fallback para antigo)
                    const diasProducao = item.nrDiasProducaoProduto !== undefined ? item.nrDiasProducaoProduto : item.nrDiasProducao;
                    const prazoProd = diasProducao ? `${diasProducao} dias úteis` : "";
                    
                    // Texto da variação tratada
                    const textoVariacao = item.variacao || (item.variacaoStr !== "Padrão" ? item.variacaoStr : "");
                    
                    // Foto do item (lendo novo formato ou antigo)
                    const fotoItem = item.foto || item.dsFotoProduto || item.dsFoto;

                    return (
                      <div key={item.cartItemId} style={{ display: "flex", flexDirection: "column", padding: "8px", background: theme.bgCard, borderRadius: "8px", border: `1px solid ${theme.border}`, gap: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                          {fotoItem && <img src={fotoItem} alt="" style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "6px", marginRight: "8px" }} />}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: "700", color: theme.textMain }}>{item.nome}</div>

                            {/* 🌟 EXIBIÇÃO DA VARIAÇÃO ESCOLHIDA LOGO ABAIXO DO NOME */}
                            {textoVariacao && (
                              <div style={{ fontSize: "11px", color: theme.primary, fontWeight: "600", marginTop: "1px" }}>
                                Variação: {textoVariacao}
                              </div>
                            )}

                            {/* Dados de Personalização */}
                            {item.personalizacao && Object.values(item.personalizacao).some(Boolean) && (
                              <div style={{ fontSize: "10px", color: theme.textSec, marginTop: "2px" }}>
                                {Object.entries(item.personalizacao).map(([k, v]) => v ? <span key={k}>{k}: {String(v)} | </span> : null)}
                              </div>
                            )}

                            {/* Prazo de Produção */}
                            {prazoProd && (
                              <div style={{ fontSize: "10px", color: theme.primary, fontWeight: "600", marginTop: "3px", display: "flex", alignItems: "center", gap: "3px" }}>
                                <Clock size={11} /> Produção: {prazoProd}
                              </div>
                            )}

                            <div style={{ color: theme.textSec, fontSize: "11px", fontWeight: "bold", marginTop: "2px" }}>{formatarMoeda(item.preco)} un</div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <button type="button" onClick={() => alterarQuantidade(-1)(item.cartItemId)} style={{ ...styles.btnQtd, background: theme.border, color: theme.textMain }}>-</button>
                            <span style={{ fontWeight: "bold", fontSize: "12px", color: theme.textMain }}>{item.quantidade}</span>
                            <button type="button" onClick={() => alterarQuantidade(1)(item.cartItemId)} style={{ ...styles.btnQtd, background: theme.border, color: theme.textMain }}>+</button>
                            <strong style={{ marginLeft: "4px", color: theme.textMain, minWidth: "55px", textAlign: "right" }}>{formatarMoeda(item.preco * item.quantidade)}</strong>
                            <button type="button" onClick={() => removerDoCarrinho(item.cartItemId)} style={styles.btnRemove} title="Remover item">🗑️</button>
                          </div>
                        </div>

                        {possuiReq && (
                          <button
                            type="button"
                            onClick={() => setItemEditandoCartId(item.cartItemId)}
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: `1px solid ${theme.primary}`,
                              background: theme.bgApp,
                              color: theme.primary,
                              fontSize: '11px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <Edit3 size={11} /> Preencher dados de personalização
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* COLUNA DIREITA: ENTREGA, PAGAMENTO E FECHAMENTO */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 0, gap: "10px" }}>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", minHeight: 0, overflowY: "auto", paddingRight: "4px" }}>
              {/* TIPO DE ENTREGA */}
              <div style={{ background: theme.bgApp, padding: '12px', borderRadius: '10px', border: `1px solid ${theme.border}`, flexShrink: 0 }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, display: 'block', marginBottom: '8px' }}>🚚 TIPO DE ENTREGA</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setTipoEntrega("retirada")}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: tipoEntrega === "retirada" ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`,
                      background: tipoEntrega === "retirada" ? theme.bgCard : theme.bgApp,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Store size={13} color={theme.primary} /> Retirada
                    </div>
                    <div style={{ fontSize: '10px', color: theme.textSec, marginTop: '2px' }}><b>Grátis</b></div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoEntrega("entrega_local")}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: tipoEntrega === "entrega_local" ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`,
                      background: tipoEntrega === "entrega_local" ? theme.bgCard : theme.bgApp,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Truck size={13} color={theme.primary} /> Entrega Local
                    </div>
                    <div style={{ fontSize: '10px', color: theme.textSec, marginTop: '2px' }}><b>{formatarMoeda(valorEntregaLocal)}</b></div>
                  </button>
                </div>
              </div>

              {/* PAGAMENTO E ENCOMENDA */}
              <div style={{ background: theme.bgApp, padding: '12px', borderRadius: '10px', border: `1px solid ${theme.border}`, flexShrink: 0 }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, display: 'block', marginBottom: '8px' }}>💳 CONDIÇÕES DE PAGAMENTO</span>

                <div style={{ marginBottom: "8px" }}>
                  <label style={{ fontSize: "10px", fontWeight: "600", color: theme.textSec, display: "block", marginBottom: "2px" }}>Tipo de Pagamento:</label>
                  <select
                    value={isParcelado ? "parcelado" : "avista"}
                    onChange={(e) => {
                      if (e.target.value === "avista") {
                        setVlEntrada(0);
                        setDsPrazoRestante("");
                      } else {
                        setVlEntrada(Number((calcularTotalGeral() / 2).toFixed(2)));
                      }
                    }}
                    style={{ width: "100%", padding: "6px 10px", borderRadius: "8px", border: `1px solid ${theme.border}`, fontSize: "12px", outline: "none", background: theme.inputBg, color: theme.textMain }}
                  >
                    <option value="avista">Pagamento Total (À Vista)</option>
                    <option value="parcelado">Entrada + Restante (Encomenda)</option>
                  </select>
                </div>

                {isParcelado && (
                  <div style={{ background: theme.bgCard, padding: "8px", borderRadius: "8px", marginBottom: "8px", border: `1px solid ${theme.primary}` }}>
                    <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: "10px", fontWeight: "600", color: theme.textSec, display: "block", marginBottom: "2px" }}>Entrada (R$):</label>
                        <input
                          type="text"
                          placeholder="R$ 0,00"
                          value={vlEntrada > 0 ? aplicarMascara((vlEntrada * 100).toString(), 'dinheiro') : ""}
                          onChange={(e) => {
                            const apenasDigitos = e.target.value.replace(/\D/g, "");
                            const valorNumerico = apenasDigitos ? Number(apenasDigitos) / 100 : 0;
                            setVlEntrada(valorNumerico);
                          }}
                          style={{ width: "100%", padding: "6px", borderRadius: "6px", border: `1px solid ${theme.border}`, fontSize: "11px", background: theme.inputBg, color: theme.textMain, outline: "none" }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: "10px", fontWeight: "600", color: theme.textSec, display: "block", marginBottom: "2px" }}>Restante:</label>
                        <input
                          type="text"
                          disabled
                          value={formatarMoeda(Math.max(0, calcularTotalGeral() - vlEntrada))}
                          style={{ width: "100%", padding: "6px", borderRadius: "6px", border: `1px solid ${theme.border}`, fontSize: "11px", background: theme.border, color: theme.textMain, fontWeight: "bold" }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "600", color: theme.textSec, display: "block", marginBottom: "2px" }}>Data de Retirada / Quitação:</label>
                      <input
                        type="date"
                        value={dsPrazoRestante}
                        onChange={(e) => setDsPrazoRestante(e.target.value)}
                        style={{ width: "100%", padding: "6px", borderRadius: "6px", border: `1px solid ${theme.border}`, fontSize: "11px", background: theme.inputBg, color: theme.textMain, outline: "none", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: "10px", fontWeight: "600", color: theme.textSec, display: "block", marginBottom: "2px" }}>Forma de Pagamento:</label>
                  <select
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value)}
                    style={{ width: "100%", padding: "6px 10px", borderRadius: "8px", border: `1px solid ${theme.border}`, fontSize: "12px", outline: "none", background: theme.inputBg, color: theme.textMain }}
                  >
                    <option value="pix">PIX</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                  </select>
                </div>
              </div>
            </div>

            {/* RESUMO E BOTÃO DE FINALIZAR */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
              <div style={{ background: theme.bgApp, padding: "10px 12px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "4px", border: `1px solid ${theme.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.textSec }}>
                  <span>Subtotal Produtos:</span>
                  <span>{formatarMoeda(calcularSubtotal())}</span>
                </div>
                {tipoEntrega === "entrega_local" && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.textSec }}>
                    <span>Taxa de Entrega:</span>
                    <span>{formatarMoeda(valorEntregaLocal)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "bold", color: theme.textMain, borderTop: `1px solid ${theme.border}`, paddingTop: "6px", marginTop: "2px" }}>
                  <span>Total Geral:</span>
                  <span style={{ color: theme.primary, fontSize: "16px" }}>{formatarMoeda(calcularTotalGeral())}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={finalizarVenda}
                disabled={carregandoVenda || carrinho.length === 0}
                style={{
                  width: "100%",
                  padding: "13px",
                  background: theme.primary,
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  fontSize: "14px",
                  cursor: "pointer",
                  opacity: carregandoVenda || carrinho.length === 0 ? 0.6 : 1,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                  transition: "opacity 0.2s"
                }}
              >
                {carregandoVenda ? "Processando Venda..." : "✅ Finalizar Venda"}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}