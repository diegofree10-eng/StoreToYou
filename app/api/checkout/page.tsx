"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, where, getDocs, limit } from "firebase/firestore";

export default function Checkout() {
  const params = useParams();
  const router = useRouter();
  
  // Captura o parâmetro da URL de forma resiliente (aceita tanto lojista quanto slug)
  const lojistaIdentificador = (params?.lojista as string) || (params?.slug as string) || "";

  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [pedidoConcluido, setPedidoConcluido] = useState(false);
  const [erro, setErro] = useState("");

  const [dadosEntrega, setDadosEntrega] = useState<any>(null);
  const [pixGerado, setPixGerado] = useState("");
  const [totalCalculado, setTotalCalculado] = useState(0);
  const [numeroPedidoCriado, setNumeroPedidoCriado] = useState<number | null>(null);

  // 1. Carrega dados locais e escuta o Firebase de forma inteligente (Trata ID e Slug)
  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    const savedEntrega = JSON.parse(localStorage.getItem("dadosEntrega") || "null");
    
    // Normaliza propriedades para garantir que nome e preco sempre existam
    const normalizedCart = savedCart.map((item: any) => ({
      id: item.id || item.cartItemKey || Math.random().toString(),
      nome: item.nome || item.name || "Produto",
      preco: Number(item.preco || item.price || 0),
      qty: Number(item.qty || 1)
    }));

    setCart(normalizedCart);
    setDadosEntrega(savedEntrega);

    if (!lojistaIdentificador) return;

    // Tática Fallback: Primeiro tenta ler como ID direto do Documento
    const docRef = doc(db, "lojistas", lojistaIdentificador);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setConfig(snap.data());
      } else {
        // Se não achar por ID, tenta buscar pelo campo 'slug' na coleção
        const q = query(collection(db, "lojistas"), where("slug", "==", lojistaIdentificador), limit(1));
        getDocs(q).then((querySnapshot) => {
          if (!querySnapshot.empty) {
            setConfig(querySnapshot.docs[0].data());
          }
        }).catch(err => console.error("Erro ao buscar lojista por slug:", err));
      }
    }, (err) => {
      console.error("Erro no Listener do Firebase:", err);
    });

    return () => unsub();
  }, [lojistaIdentificador]);

  // 2. Processa o checkout com segurança na API interna
  async function criarCheckoutSeguro() {
    if (cart.length === 0 || !dadosEntrega) {
      return setErro("Carrinho vazio ou dados de entrega ausentes.");
    }
    setLoading(true);
    setErro("");

    try {
      const response = await fetch("/api/checkout/processar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lojistaId: lojistaIdentificador,
          itens: cart.map(i => ({ id: i.id, qty: i.qty })),
          dadosEntrega
        })
      });

      const resultado = await response.json();

      if (resultado.sucesso) {
        setPixGerado(resultado.pixCode || "");
        setTotalCalculado(Number(resultado.totalGeral || 0));
        setNumeroPedidoCriado(resultado.numeroPedido || Math.floor(1000 + Math.random() * 9000));
      } else {
        setErro(resultado.error || "Erro ao processar as informações do checkout.");
      }
    } catch (e) {
      setErro("Falha na conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  // 3. Monta e dispara a URL do WhatsApp de forma totalmente limpa e codificada
  function confirmarEIrParaWhatsapp() {
    if (!numeroPedidoCriado || !totalCalculado) return;

    const textoMensagem = `🛒 *PEDIDO CONFIRMADO*\n\n🔢 *Nº DO PEDIDO:* #${numeroPedidoCriado}\n💰 *VALOR TOTAL:* R$ ${totalCalculado.toFixed(2).replace('.', ',')}\n\n*Estou enviando o comprovante do PIX.*`;
    
    // Captura o WhatsApp do Firebase (chavePix ou pix) com fallback seguro para o número padrão
    let telefoneBruto = String(config?.whatsapp || config?.telefone || "5512981654900").replace(/\D/g, "");
    
    if (telefoneBruto.length === 10 || telefoneBruto.length === 11) {
      telefoneBruto = "55" + telefoneBruto;
    }

    const urlFinal = `https://wa.me{telefoneBruto}?text=${encodeURIComponent(textoMensagem)}`;
    window.open(urlFinal, "_blank");
    
    setPedidoConcluido(true);
    localStorage.removeItem("cart");
    localStorage.removeItem("dadosEntrega");
  }

  // Substituição por API alternativa de QR Code aberta de alta performance (sem autenticação)
  const qrCodeUrl = useMemo(() => {
    if (!pixGerado) return "";
    return `https://qrserver.com{encodeURIComponent(pixGerado)}`;
  }, [pixGerado]);

  // Calcula o total local estimado para exibição inicial na tela
  const totalLocalEstimado = useMemo(() => {
    const totalItens = cart.reduce((acc, item) => acc + (item.preco * item.qty), 0);
    const valorFrete = Number(dadosEntrega?.freteValor || dadosEntrega?.price || 0);
    return totalItens + valorFrete;
  }, [cart, dadosEntrega]);

  return (
    <div style={styles.page}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Finalizar Pedido</h2>
      
      {erro && <p style={{ color: "red", fontWeight: "bold", textAlign: "center" }}>⚠️ {erro}</p>}

      <div style={styles.box}>
        {cart.map((i, index) => (
          <p key={i.id || index} style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{i.nome} x{i.qty}</span>
            <span>R$ {(i.preco * i.qty).toFixed(2).replace('.', ',')}</span>
          </p>
        ))}
        <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "12px 0" }} />
        <p style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Frete:</span>
          <span>R$ {Number(dadosEntrega?.freteValor || dadosEntrega?.price || 0).toFixed(2).replace('.', ',')}</span>
        </p>
        <h3 style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
          <span>Total Estimado:</span>
          <span>R$ {totalLocalEstimado.toFixed(2).replace('.', ',')}</span>
        </h3>
      </div>

      {!pedidoConcluido ? (
        <>
          {!pixGerado ? (
            <button onClick={criarCheckoutSeguro} disabled={loading} style={styles.btnCheckout}>
              {loading ? "Validando e Gerando Pix..." : "Gerar Pagamento Seguro"}
            </button>
          ) : (
            <>
              <div style={{ ...styles.box, marginTop: 15, border: "2px solid #25D366" }}>
                <h4 style={{ margin: "0 0 10px 0", textAlign: "center" }}>Total Oficial Confirmado: R$ {totalCalculado.toFixed(2).replace('.', ',')}</h4>
                
                {qrCodeUrl && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "15px 0", gap: "10px" }}>
                    <img src={qrCodeUrl} alt="QR Code Pix" style={{ width: 180, height: 180, border: "1px solid #eee", padding: "5px", borderRadius: "5px" }} />
                    <button 
                      onClick={() => { navigator.clipboard.writeText(pixGerado); alert("Código Pix Copiado com Sucesso!"); }}
                      style={{ padding: "8px 14px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", background: "#f0f0f0", border: "1px solid #ccc", borderRadius: "5px", width: "100%" }}
                    >
                      📋 Copiar Código Pix (Copia e Cola)
                    </button>
                  </div>
                )}

                <p style={{ fontSize: "14px", margin: "15px 0 5px 0", fontWeight: "bold" }}>Código Pix:</p>
                <textarea 
                  readOnly 
                  value={pixGerado} 
                  style={styles.textarea} 
                  onClick={(e) => (e.target as any).select()} 
                />
              </div>

              <button onClick={confirmarEIrParaWhatsapp} style={styles.btn}>
                ✅ Confirmar e Enviar Comprovante no WhatsApp
              </button>
            </>
          )}
        </>
      ) : (
        <div style={styles.success}>
          <h3>🎉 Pedido enviado com sucesso!</h3>
          <p style={{ margin: "15px 0 20px" }}>Redirecionamos você para o WhatsApp da loja para concluir o seu atendimento.</p>
          <button onClick={() => router.push(`/${lojistaIdentificador}`)} style={styles.btn}>Voltar para o Início</button>
        </div>
      )}
    </div>
  );
}

const styles: any = {
  page: { padding: 20, maxWidth: 500, margin: "0 auto", fontFamily: "sans-serif" },
  box: { background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 10px rgba(0,0,0,0.1)" },
  textarea: { width: "100%", height: 80, marginTop: 5, padding: 10, fontSize: "11px", color: "#555", backgroundColor: "#fafafa", border: "1px dashed #ccc", borderRadius: "6px", resize: "none", boxSizing: "border-box" },
  btnCheckout: { width: "100%", padding: 15, background: "#0070f3", color: "#fff", border: "none", borderRadius: 8, fontWeight: "bold", marginTop: 15, cursor: "pointer", fontSize: "15px" },
  btn: { width: "100%", padding: 15, background: "#25D366", color: "#fff", border: "none", borderRadius: 8, fontWeight: "bold", marginTop: 15, cursor: "pointer", fontSize: "15px" },
  success: { textAlign: "center", marginTop: 30 }
};
