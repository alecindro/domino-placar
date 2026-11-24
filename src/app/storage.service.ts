import { Injectable } from '@angular/core';
import { Partida } from './domino.model';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly KEY_PARTIDA_ATUAL = 'domino_partida_atual';
  private readonly KEY_HISTORICO = 'domino_historico_partidas';

  // Salva o estado atual da partida a cada jogada
  salvarPartidaAtual(partida: Partida | null): void {
    if (partida) {
      localStorage.setItem(this.KEY_PARTIDA_ATUAL, JSON.stringify(partida));
    } else {
      localStorage.removeItem(this.KEY_PARTIDA_ATUAL);
    }
  }

  // Recupera a partida em andamento ao abrir o app
  carregarPartidaAtual(): Partida | null {
    const dados = localStorage.getItem(this.KEY_PARTIDA_ATUAL);
    return dados ? JSON.parse(dados) : null;
  }

  // Adiciona uma partida finalizada ao histórico geral
  salvarNoHistorico(partida: Partida): void {
    const historico = this.carregarHistorico();
    const jaExiste = historico.some(p => p.id === partida.id);
    
    if (!jaExiste) {
      historico.unshift(partida); // Coloca a mais recente no topo
      localStorage.setItem(this.KEY_HISTORICO, JSON.stringify(historico));
    }
  }

  // Lista todas as partidas já concluídas
  carregarHistorico(): Partida[] {
    const dados = localStorage.getItem(this.KEY_HISTORICO);
    return dados ? JSON.parse(dados) : [];
  }

  // Limpa o histórico completo
  limparHistorico(): void {
    localStorage.removeItem(this.KEY_HISTORICO);
  }

  removerDoHistorico(id: string): void {
    const historico = this.carregarHistorico().filter(p => p.id !== id);
    localStorage.setItem(this.KEY_HISTORICO, JSON.stringify(historico));
  }

}
