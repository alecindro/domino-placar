export interface Jogador {
  id: number;
  nome: string;
  dupla: 1 | 2;
}

export interface Rodada {
  numero: number;
  pontosDupla1: number;
  pontosDupla2: number;
  jogadorQueSaiu: string;
}

export interface Partida {
  id: string;
  data: string;
  dupla1Nome: string;
  dupla2Nome: string;
  jogadores: Jogador[];
  pontuacaoAlvo: number;
  pontosDupla1: number;
  pontosDupla2: number;
  jogadorAtualIndex: number;
  rodadas: Rodada[];
  finalizada: boolean;
  duplaVencedora?: 1 | 2;
}
