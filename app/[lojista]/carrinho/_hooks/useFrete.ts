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
      const cepLimpo = cep.replace(/\D/g, "");
      const payload = {
        lojistaId,
        cepDestino: cepLimpo,
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
      lista = lista.filter((f: any) => !f.error);

      // Flexibilizando a leitura da cidade e CEP da loja
      const lojaObj = dadosLoja?.dadosLoja || dadosLoja || {};
      const cidadeLojaBruta = lojaObj?.dsCidadeLoja || lojaObj?.cidade || "";
      const cepLojaBruto = lojaObj?.dsCepLoja || lojaObj?.cep || "";

      const cidadeLojista = String(cidadeLojaBruta).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const cidadeCliente = String(pedido.endereco?.cidade || pedido.endereco?.city || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      
      const cepLojaLimpo = String(cepLojaBruto).replace(/\D/g, "");
      const mesmoCepLoja = cepLojaLimpo.length === 8 && cepLimpo === cepLojaLimpo;

      // Adiciona retirada se for na mesma cidade ou mesmo CEP da loja
      if (mesmoCepLoja || (cidadeLojista && cidadeCliente && cidadeLojista === cidadeCliente)) {
        if (!lista.some((f: any) => f.id === "retirar_loja")) {
           lista = [{ id: "retirar_loja", name: "Retirar na Loja (Grátis)", price: 0 }, ...lista];
        }
      }

      return lista.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } catch (err: any) {
      setErro(err.message || "Erro desconhecido ao cotar frete.");
      // Retorna vazio em vez de forçar retirada gratuita por erro
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { cotarFrete, loadingFrete: loading, erroFrete: erro };
};