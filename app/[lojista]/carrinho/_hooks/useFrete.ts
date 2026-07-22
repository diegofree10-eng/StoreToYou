import { useState } from 'react';

export const useFrete = (lojistaId: string, dadosLoja: any) => {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const cotarFrete = async (pedido: any) => {
    setLoading(true);
    setErro(null);

    // Lendo dsCep (novo padrão) e mantendo os fallbacks antigos
    const cep = pedido.endereco?.dsCep || pedido.endereco?.cep || pedido.cliente?.cep || "";
    
    if (!cep || cep.replace(/\D/g, "").length < 8) {
      setLoading(false);
      throw new Error("CEP inválido ou não informado.");
    }

    try {
      const payload = {
        lojistaId,
        cepDestino: cep.replace(/\D/g, ""),
        itensFiltrados: pedido.itens || [],
        pacote: { largura: 20, altura: 10, comprimento: 20, peso: 0.5 }
      };

      const res = await fetch("/api/frete/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const resposta = await res.json();
      if (!res.ok) throw new Error(resposta.error || "Erro ao calcular frete");

      let lista: any[] = Array.isArray(resposta) ? resposta : (resposta.fretes || []);

      // Lógica de Retirada na Loja
      const cidadeLojista = String(dadosLoja?.cidade || "").trim().toLowerCase();
      const cidadeCliente = String(pedido.endereco?.cidade || pedido.endereco?.city || "").trim().toLowerCase();
      
      if (cidadeLojista && cidadeCliente && cidadeLojista === cidadeCliente) {
        if (!lista.find((f: any) => f.id === "retirar_loja")) {
           lista = [{ id: "retirar_loja", name: "Retirar na Loja", price: 0 }, ...lista];
        }
      }

      return lista.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } catch (err: any) {
      setErro(err.message);
      return [{ id: "retirar_loja", name: "Retirar na Loja (Fallback)", price: 0 }];
    } finally {
      setLoading(false);
    }
  };

  return { cotarFrete, loadingFrete: loading, erroFrete: erro };
};