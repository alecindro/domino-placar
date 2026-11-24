import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toBlob } from 'html-to-image';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Jogador, Partida } from './domino.model';
import { StorageService } from './storage.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  @ViewChild('cardResultado') cardResultado!: ElementRef;

  nomesJogadores = ['Jogador 1', 'Jogador 2', 'Jogador 3', 'Jogador 4'];
  pontuacaoAlvo = 100;
  jogadorInicialIndex = 0;

  partida: Partida | null = null;
  historicoPartidas: Partida[] = [];
  pontosRodadaDupla1: number | null = null;
  pontosRodadaDupla2: number | null = null;

  constructor(private storage: StorageService) {}

  ngOnInit(): void {
    // Restaura a partida em andamento e o histórico ao iniciar o app
    this.partida = this.storage.carregarPartidaAtual();
    this.historicoPartidas = this.storage.carregarHistorico();
  }

  iniciarPartida() {
    const jogadores: Jogador[] = [
      { id: 0, nome: this.nomesJogadores[0] || 'Jogador 1', dupla: 1 },
      { id: 1, nome: this.nomesJogadores[1] || 'Jogador 2', dupla: 2 },
      { id: 2, nome: this.nomesJogadores[2] || 'Jogador 3', dupla: 1 },
      { id: 3, nome: this.nomesJogadores[3] || 'Jogador 4', dupla: 2 },
    ];

    this.partida = {
      id: Date.now().toString(),
      data: new Date().toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      dupla1Nome: `${jogadores[0].nome} & ${jogadores[1].nome}`,
      dupla2Nome: `${jogadores[2].nome} & ${jogadores[3].nome}`,
      jogadores,
      pontuacaoAlvo: this.pontuacaoAlvo > 0 ? this.pontuacaoAlvo : 100,
      pontosDupla1: 0,
      pontosDupla2: 0,
      jogadorAtualIndex: Number(this.jogadorInicialIndex),
      rodadas: [],
      finalizada: false
    };

    this.storage.salvarPartidaAtual(this.partida);
  }

  registrarRodada() {
    if (!this.partida || this.partida.finalizada) return;

    const p1 = Number(this.pontosRodadaDupla1) || 0;
    const p2 = Number(this.pontosRodadaDupla2) || 0;

    if (p1 === 0 && p2 === 0) return;

    const jogadorQueSaiu = this.partida.jogadores[this.partida.jogadorAtualIndex].nome;

    this.partida.rodadas.push({
      numero: this.partida.rodadas.length + 1,
      pontosDupla1: p1,
      pontosDupla2: p2,
      jogadorQueSaiu
    });

    this.partida.pontosDupla1 += p1;
    this.partida.pontosDupla2 += p2;
    this.partida.jogadorAtualIndex = (this.partida.jogadorAtualIndex + 1) % 4;

    if (this.partida.pontosDupla1 >= this.partida.pontuacaoAlvo) {
      this.partida.finalizada = true;
      this.partida.duplaVencedora = 1;
    } else if (this.partida.pontosDupla2 >= this.partida.pontuacaoAlvo) {
      this.partida.finalizada = true;
      this.partida.duplaVencedora = 2;
    }

    // Salva o progresso da rodada atual
    this.storage.salvarPartidaAtual(this.partida);

    // Se acabou, registra no histórico permanente
    if (this.partida.finalizada) {
      this.storage.salvarNoHistorico(this.partida);
      this.historicoPartidas = this.storage.carregarHistorico();
    }

    this.pontosRodadaDupla1 = null;
    this.pontosRodadaDupla2 = null;
  }

  novaPartida() {
    this.partida = null;
    this.storage.salvarPartidaAtual(null);
  }

  limparHistorico() {
    this.storage.limparHistorico();
    this.historicoPartidas = [];
  }

    desfazerUltimaRodada() {
    if (!this.partida || this.partida.rodadas.length === 0) return;

    const ultimaRodada = this.partida.rodadas.pop();
    if (!ultimaRodada) return;

    // Subtrai os pontos da rodada desfeita
    this.partida.pontosDupla1 = Math.max(0, this.partida.pontosDupla1 - ultimaRodada.pontosDupla1);
    this.partida.pontosDupla2 = Math.max(0, this.partida.pontosDupla2 - ultimaRodada.pontosDupla2);

    // Retrocede o turno do jogador na mesa (sentido anti-horário)
    this.partida.jogadorAtualIndex = (this.partida.jogadorAtualIndex + 3) % 4;

    // Se a partida havia sido finalizada nessa rodada, reabre o jogo e remove do histórico
    if (this.partida.finalizada) {
      this.partida.finalizada = false;
      this.partida.duplaVencedora = undefined;
      this.storage.removerDoHistorico(this.partida.id);
      this.historicoPartidas = this.storage.carregarHistorico();
    }

    // Atualiza o estado salvo
    this.storage.salvarPartidaAtual(this.partida);
  }


  async compartilharWhatsApp() {
    if (!this.cardResultado) return;

    try {
      const blob = await toBlob(this.cardResultado.nativeElement, { backgroundColor: '#ffffff' });
      if (!blob) return;

      // Se estiver rodando no Android ou iOS via Capacitor
      if (Capacitor.isNativePlatform()) {
        const base64Data = await this.blobToBase64(blob);
        const fileName = `domino-resultado-${Date.now()}.png`;

        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache
        });

        await Share.share({
          title: 'Resultado da Partida de Dominó',
          text: `Fim de jogo! Confira o placar de ${this.partida?.dupla1Nome} vs ${this.partida?.dupla2Nome}.`,
          url: savedFile.uri,
          dialogTitle: 'Compartilhar no WhatsApp'
        });
      } else {
        // Fallback para Web / Electron (Desktop)
        const file = new File([blob], 'placar-domino.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Placar Dominó',
            text: 'Confira o resultado da nossa partida!'
          });
        } else {
          // Baixa a imagem automaticamente caso o navegador/Electron não suporte Web Share de arquivos
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'placar-domino.png';
          a.click();
          alert('Imagem salva! Agora você pode anexá-la no WhatsApp Web/Desktop.');
        }
      }
    } catch (error) {
      console.error('Erro ao gerar/compartilhar imagem:', error);
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.readAsDataURL(blob);
    });
  }
}