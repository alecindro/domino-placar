import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
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
 // Configuração Inicial
  nomesJogadores = ['Jogador 1', 'Jogador 2', 'Jogador 3', 'Jogador 4'];
  numeroDupla1?:string;
  numeroDupla2?:string;
  pontuacaoAlvo = 100;
  jogadorInicialIndex = 0;

    // Controles de Interface (Modais)
  mostrarModalSaida = false;
  mostrarHistorico = false;
  mostrarModalCancelar = false;

   // Estado da Partida
  partida: Partida | null = null;
  historicoPartidas: Partida[] = [];
  pontosRodadaDupla1: number | null = null;
  pontosRodadaDupla2: number | null = null;

  // Controle de Instalação (PWA / Atalho na Tela Inicial)
  eventoInstalacao: any = null;
  mostrarBotaoInstalar = false;
  ehIOS = false;
  ehAndroid = false;
  mostrarInstrucaoInstalacao = false;

  constructor(private storage: StorageService) {}

  ngOnInit(): void {
    // Restaura a partida em andamento e o histórico ao iniciar o app
     this.verificarSuporteInstalacao();
    this.partida = this.storage.carregarPartidaAtual();
    this.historicoPartidas = this.storage.carregarHistorico();
  }



  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: Event) {
    event.preventDefault();
    this.eventoInstalacao = event;
    this.mostrarBotaoInstalar = true;
  }

  @HostListener('window:appinstalled')
  onAppInstalled() {
    this.mostrarBotaoInstalar = false;
    this.mostrarInstrucaoInstalacao = false;
    this.eventoInstalacao = null;
  }

  verificarSuporteInstalacao() {
    // Se já estiver rodando como aplicativo instalado (tela cheia), oculta o botão
    const jaInstalado =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (jaInstalado) {
      this.mostrarBotaoInstalar = false;
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    this.ehIOS = /iphone|ipad|ipod/.test(userAgent);
    this.ehAndroid = /android/.test(userAgent);

    // Exibe o botão tanto no Android quanto no iOS
    if (this.ehIOS || this.ehAndroid) {
      this.mostrarBotaoInstalar = true;
    }
  }

  async instalarApp() {
    // 1. Se o navegador Android/Chrome liberou a instalação direta em 1 clique:
    if (this.eventoInstalacao) {
      this.eventoInstalacao.prompt();
      const { outcome } = await this.eventoInstalacao.userChoice;
      if (outcome === 'accepted') {
        this.mostrarBotaoInstalar = false;
      }
      this.eventoInstalacao = null;
      return;
    }

    // 2. Se for iPhone ou teste via IP local (HTTP) no Android, mostra o passo a passo:
    this.mostrarInstrucaoInstalacao = true;
  }

  fecharInstrucaoInstalacao() {
    this.mostrarInstrucaoInstalacao = false;
  }

  abrirModalSaida() {
    this.jogadorInicialIndex = 0;
    this.mostrarModalSaida = true;
  }

  fecharModalSaida() {
    this.mostrarModalSaida = false;
  }

   fecharHistorico() {
    this.mostrarHistorico = false;
  }

  confirmarInicioPartida() {
    const jogadores: Jogador[] = [
      { id: 0, nome: this.nomesJogadores[0] || 'Jogador 1', dupla: 1 },
      { id: 1, nome: this.nomesJogadores[1] || 'Jogador 2', dupla: 2 },
      { id: 2, nome: this.nomesJogadores[2] || 'Jogador 3', dupla: 1 },
      { id: 3, nome: this.nomesJogadores[3] || 'Jogador 4', dupla: 2 },
    ];
 const num1 =  this.numeroDupla1 ? this.numeroDupla1.trim() : undefined;
    const num2 = this.numeroDupla2 ? this.numeroDupla2.trim() : undefined;
    this.partida = {
      id: Date.now().toString(),
      data: new Date().toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        dupla1Numero: num1,
      dupla2Numero: num2,
      dupla1Nome: `${jogadores[0].nome} & ${jogadores[2].nome}`,
      dupla2Nome: `${jogadores[1].nome} & ${jogadores[3].nome}`,
      jogadores,
      pontuacaoAlvo: this.pontuacaoAlvo > 0 ? this.pontuacaoAlvo : 100,
      pontosDupla1: 0,
      pontosDupla2: 0,
      jogadorAtualIndex: Number(this.jogadorInicialIndex),
      rodadas: [],
      finalizada: false
    };
this.mostrarModalSaida = false;
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

   abrirHistorico() {
    this.historicoPartidas = this.storage.carregarHistorico();
    this.mostrarHistorico = true;
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

  abrirModalCancelar() {
    this.mostrarModalCancelar = true;
  }

  fecharModalCancelar() {
    this.mostrarModalCancelar = false;
  }

  confirmarCancelamentoPartida() {
    this.partida = null;
    this.pontosRodadaDupla1 = null;
    this.pontosRodadaDupla2 = null;
    this.mostrarModalCancelar = false;
    this.storage.salvarPartidaAtual(null);
  }

    async compartilharWhatsApp() {
    if (!this.cardResultado || !this.partida) return;

    const vencedor = this.partida.duplaVencedora === 1 
      ? `Dupla #${this.partida.dupla1Numero} (${this.partida.dupla1Nome})`
      : `Dupla #${this.partida.dupla2Numero} (${this.partida.dupla2Nome})`;

    const textoResumo = 
      `🀄 *Fim de Jogo - Placar de Dominó*\n\n` +
      `🏆 *Vencedores:* ${vencedor}\n\n` +
      `📊 *Placar Final (Alvo: ${this.partida.pontuacaoAlvo} pts):*\n` +
      `• Dupla #${this.partida.dupla1Numero} (${this.partida.dupla1Nome}): *${this.partida.pontosDupla1} pts*\n` +
      `• Dupla #${this.partida.dupla2Numero} (${this.partida.dupla2Nome}): *${this.partida.pontosDupla2} pts*`;

    try {
      const blob = await toBlob(this.cardResultado.nativeElement, { backgroundColor: '#ffffff' });
      if (!blob) return;

      // 1. Aplicativo Nativo (Android / iOS via Capacitor)
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
          text: textoResumo,
          url: savedFile.uri,
          dialogTitle: 'Compartilhar no WhatsApp'
        });
        return;
      }

      // 2. Navegador Mobile com HTTPS (Abre o seletor nativo com a imagem anexada)
      const file = new File([blob], 'placar-domino.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Placar Dominó',
          text: textoResumo
        });
        return;
      }

      // 3. Fallback (Acesso via HTTP sem SSL ou Desktop): baixa a imagem e abre o WhatsApp
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'placar-domino.png';
      a.click();

      const whatsappUrl = `https://whatsapp.com{encodeURIComponent(textoResumo)}`;
      window.open(whatsappUrl, '_blank');

    } catch (error) {
      console.error('Erro ao compartilhar:', error);
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