/**
 * Aplica máscaras de forma fluida (CPF, Telefone, CEP, CNPJ, Dinheiro)
 * com suporte otimizado ao Backspace em dispositivos móveis.
 */
export const aplicarMascara = (valor: string, tipo: string): string => {
  if (!valor) return "";
  let v = valor.replace(/\D/g, "");

  if (tipo === 'cpf') {
    const numeros = v.slice(0, 11);
    if (numeros.length <= 3) return numeros;
    if (numeros.length <= 6) return `${numeros.slice(0, 3)}.${numeros.slice(3)}`;
    if (numeros.length <= 9) return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`;
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9, 11)}`;
  }

  if (tipo === 'tel') {
    const numeros = v.slice(0, 11);
    if (numeros.length <= 2) return numeros.length > 0 ? `(${numeros}` : "";
    if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    if (numeros.length <= 10) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
  }

  if (tipo === 'cep') {
    const numeros = v.slice(0, 8);
    if (numeros.length <= 5) return numeros;
    return `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
  }

  if (tipo === 'cnpj') {
    const numeros = v.slice(0, 14);
    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 5) return `${numeros.slice(0, 2)}.${numeros.slice(2)}`;
    if (numeros.length <= 8) return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5)}`;
    if (numeros.length <= 12) return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8)}`;
    return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8, 12)}-${numeros.slice(12, 14)}`;
  }

  if (tipo === 'dinheiro') {
    if (!v) return "";
    const numero = (parseInt(v, 10) / 100).toFixed(2);
    return numero.replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
  }

  return v;
};

/**
 * Valida se um CPF é real utilizando o algoritmo oficial dos dígitos verificadores.
 */
export const validarCPFReal = (cpf: string): boolean => {
  if (!cpf) return false;
  const limpo = cpf.replace(/\D/g, "");
  
  if (limpo.length !== 11 || /^(\d)\1{10}$/.test(limpo)) return false;

  let soma = 0;
  let resto;

  for (let i = 1; i <= 9; i++) {
    soma += parseInt(limpo.substring(i - 1, i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.substring(9, 10))) return false;

  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(limpo.substring(i - 1, i)) * (12 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.substring(10, 11))) return false;

  return true;
};

/**
 * Comprime imagens enviadas para otimizar armazenamento.
 */
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

/**
 * Garante que o link de redes sociais contenha o protocolo HTTP/HTTPS.
 */
export const tratarLinkRede = (plataforma: string, url: string): string => {
  if (!url) return "";
  return url.startsWith("http") ? url : `https://${url}`;
};

 // A função aplicarMascara serve para formatar automaticamente os campos de texto à medida
 // que o usuário vai digitando, aplicando pontuações, parênteses e traços padrões do Brasil.
 // 'cpf' (Formata para 000.000.000-00):
 // 'tel' (Formata para (00) 00000-0000 ou telefones fixos):
 // cep' (Formata para 00000-000): 'cnpj' (Formata para 00.000.000/0000-00):
 //'dinheiro' (Formata para valores monetários como 1.500,50):