export interface Cliente {
  id: string;
  nome: string;
  email: string;
  cidade: string;
  estado: string;
  pais: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ClienteFormData {
  nome: string;
  email: string;
  cidade: string;
  estado: string;
  pais: string;
}
