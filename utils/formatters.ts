export const aplicarMascara = (valor: string, tipo: string) => {
  let v = valor.replace(/\D/g, "");
  if (tipo === 'cpf') {
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return v.substring(0, 14);
  }
  if (tipo === 'tel') {
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d{5})(\d)/, "$1-$2");
    return v.substring(0, 15);
  }
  if (tipo === 'cep') {
    v = v.replace(/^(\d{5})(\d)/, "$1-$2");
    return v.substring(0, 9);
  }
  if (tipo === 'cnpj') {
    v = v.replace(/(\d{2})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1/$2");
    v = v.replace(/(\d{4})(\d{1,2})$/, "$1-$2");
    return v.substring(0, 18);
  }
  if (tipo === 'dinheiro') {
    if (!v) return "";
    const numero = (parseInt(v, 10) / 100).toFixed(2);
    return numero.replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
  }
  return v;
};

export const comprimirImagem = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const MAX_WIDTH = 1500;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(); }, "image/jpeg", 0.7);
      };
    };
  });
};

export const tratarLinkRede = (plataforma: string, url: string) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `https://${url}`;
};

 // A função aplicarMascara serve para formatar automaticamente os campos de texto à medida
 // que o usuário vai digitando, aplicando pontuações, parênteses e traços padrões do Brasil.
 // 'cpf' (Formata para 000.000.000-00):
 // 'tel' (Formata para (00) 00000-0000 ou telefones fixos):
 // cep' (Formata para 00000-000): 'cnpj' (Formata para 00.000.000/0000-00):
 //'dinheiro' (Formata para valores monetários como 1.500,50):