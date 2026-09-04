import { useState } from 'react';

export const useFrete = (lojistaId: string, dadosLoja: any) => {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const cotarFrete = async (pedido: any) => {
    setLoading(true);
    setErro(null);

    // ✨ Lendo estritamente o novo padrão dsCepCliente ou dsCep do endereço
    const cep = pedido.endereco?.dsCepCliente || pedido.endereco?.dsCep || "";
    
    if (!cep || cep.replace(/\D/g, "").length < 8) {
      setLoading(false);
      throw new Error("CEP inválido ou não informado.");
    }

    try {
      const cepLimpo = cep.replace(/\D/g, "");

      // ✨ Calculando o peso real dos itens usando o novo padrão nrPesoProduto
      const itensCarrinho = pedido.itens || pedido.safeCart || [];
      const pesoTotalCarrinho = itensCarrinho.reduce((acc: number, item: any) => {
        const pesoItem = Number(item.nrPesoProduto ?? 0.2);
        const qtdItem = Number(item.qty ?? 1);
        return acc + (pesoItem * qtdItem);
      }, 0);

      const payload = {
        lojistaId,
        cepDestino: cepLimpo,
        itensFiltrados: itensCarrinho,
        pacote: { 
          largura: 20, 
          altura: 10, 
          comprimento: 20, 
          peso: pesoTotalCarrinho > 0 ? pesoTotalCarrinho : 0.5 
        }
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

      // ✨ Lendo estritamente os campos novos da loja (dsCidadeLoja e dsCepLoja)
      const lojaObj = dadosLoja?.dadosLoja || dadosLoja || {};
      const cidadeLojaBruta = lojaObj?.dsCidadeLoja || "";
      const cepLojaBruto = lojaObj?.dsCepLoja || "";

      const cidadeLojista = String(cidadeLojaBruta).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const cidadeCliente = String(pedido.endereco?.dsCidadeCliente || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      
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
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { cotarFrete, loadingFrete: loading, erroFrete: erro };
};