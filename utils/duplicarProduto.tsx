// utils/duplicarProduto.tsx

export const duplicarProduto = (
    p: any,
    {
        setEditId,
        setProdutoIdAtual,
        setNome,
        setSku,
        setDescricao,
        setCategoria,
        setSubcategoria,
        setPrecoBasico,
        setCustoUnitario,
        setEstoque,
        setAtivo,
        setEnvioTransportadora,
        setPermiteRetirada,
        setPeso,
        setComprimento,
        setLargura,
        setAltura,
        setImagens,
        setFiles,
        setRequisitos,
        setNomeVar1,
        setNomeVar2,
        setTabelaPrecos,
        setOpcoesVar1,
        setOpcoesVar2,
        isMobile,
        setIsOpenRight
    }: any
) => {
    setEditId(null);
    setProdutoIdAtual(null);

    setNome(`${p.nome} (Cópia)`);
    setSku("");
    setDescricao(p.descricao || "");
    setCategoria(p.categoria || "");
    setSubcategoria(p.subcategoria || "");
    setPrecoBasico(p.precoBasico || "");
    setCustoUnitario(p.custoUnitario || "");
    setEstoque(p.estoque || "");
    setAtivo(p.ativo ?? true);

    setEnvioTransportadora(p.envioTransportadora ?? true);
    setPermiteRetirada(p.permiteRetirada ?? false);
    setPeso(p.peso || "");
    setComprimento(p.comprimento || "");
    setLargura(p.largura || "");
    setAltura(p.altura || "");

    setImagens(p.imagens || []);
    setFiles([]);

    setRequisitos(p.requisitos || { pedeNome: false, pedeIdade: false, pedeData: false, pedeObs: false });

    if (p.variacoes && p.variacoes.length > 0) {
        setNomeVar1(p.nomeVar1 || "");
        setNomeVar2(p.nomeVar2 || "");
        const tab: any = {};
        p.variacoes.forEach((v: any) => {
            const key = v.v2 ? `${v.v1}-${v.v2}` : v.v1;
            tab[key] = {
                preco: v.preco,
                custo: v.custo,
                estoque: v.estoque || "",
                foto: v.foto || "",
                sku: ""
            };
        });
        setTabelaPrecos(tab);
        setOpcoesVar1([...new Set(p.variacoes.map((v: any) => v.v1))] as string[]);
        setOpcoesVar2([...new Set(p.variacoes.map((v: any) => v.v2).filter((v: any) => v))] as string[]);
    } else {
        setNomeVar1("");
        setNomeVar2("");
        setOpcoesVar1([]);
        setOpcoesVar2([]);
        setTabelaPrecos({});
    }

    if (isMobile) {
        setIsOpenRight(true);
    }

    alert("Produto duplicado com sucesso! Altere o que precisa e clique em 'Salvar Produto'.");
};

// criar uma função que pega os dados do produto selecionado,
// limpa o ID de edição (para que o sistema entenda que é um novo produto)
// e preenche os estados do formulário. Duplica o item para edicao