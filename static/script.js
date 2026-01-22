const INTERVALO_ATUALIZACAO = 10000; // 10 segundos

// ===============================
// TIMER DE RESET AUTOMÁTICO
// ===============================
let timerResetAtivo = false;  // boolean - timer está ativo?
let timerIntervalId = null;   // ID do intervalo setInterval
let intervaloResetMinutos = 0;
let proximoReset = null;
let intervaloContador = null;
let ultimoElementoVisto = null; // Último elemento processado antes do reset

function iniciarTimerReset(minutos) {
  // Validar entrada
  if (!minutos || minutos < 1 || minutos > 1440) {
    alert("⚠️ Por favor, insira um valor entre 1 e 1440 minutos (24 horas)");
    return;
  }

  // Parar timer anterior
  pararTimerReset();

  intervaloResetMinutos = minutos;
  const milissegundos = minutos * 60 * 1000;
  proximoReset = Date.now() + milissegundos;

  // Marcar que timer está ativo
  timerResetAtivo = true;
  // Ainda não foi resetado
  ultimoElementoVisto = null;

  console.log(`✅ Timer iniciado de ${minutos} minutos`);

  // Configurar timer para resetar
  timerIntervalId = setInterval(() => {
    resetarDados();
    proximoReset = Date.now() + milissegundos;
  }, milissegundos);

  // Atualizar contador visual a cada segundo
  intervaloContador = setInterval(atualizarContadorReset, 1000);
  atualizarContadorReset();

  // Marcar botão ativo
  document.getElementById("btnIniciarTimer").classList.add('active');
  document.getElementById("btnIniciarTimer").innerText = "⏱️ Ativo";
}

function pararTimerReset() {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
  if (intervaloContador) {
    clearInterval(intervaloContador);
    intervaloContador = null;
  }
  timerResetAtivo = false;
  proximoReset = null;
  intervaloResetMinutos = 0;
  ultimoElementoVisto = null; // Resetar elemento rastreado ao parar
  document.getElementById("timerStatus").innerText = "";
  document.getElementById("btnIniciarTimer").classList.remove('active');
  document.getElementById("btnIniciarTimer").innerText = "Iniciar Timer";
  console.log("⏹️ Timer parado");
}

function atualizarContadorReset() {
  if (!proximoReset) return;

  const agora = Date.now();
  const tempoRestante = proximoReset - agora;

  if (tempoRestante <= 0) {
    document.getElementById("timerStatus").innerText = "⏳ Resetando...";
    return;
  }

  const minutos = Math.floor(tempoRestante / 60000);
  const segundos = Math.floor((tempoRestante % 60000) / 1000);

  document.getElementById("timerStatus").innerText = 
    `⏰ Próximo reset em: ${minutos}m ${segundos}s (a cada ${intervaloResetMinutos} min)`;
}

function resetarDados() {
  // Limpar cronômetro 24h
  cronometro = {
    inicio: obterTimestampAtual(),
    dados: {}
  };
  localStorage.setItem("cronometro_bacbo", JSON.stringify(cronometro));

  console.log(`✅ RESET CHAMADO - ${new Date().toLocaleTimeString("pt-BR")}`);
  
  // Forçar atualização das tabelas
  fetch("/baralhos_ultimos_2000.json", { cache: "no-store" })
    .then(res => res.json())
    .then(json => {
      const baralhos = json.baralhos["0"];
      
      // IMPORTANTE: Marcar o ÚLTIMO ELEMENTO ATUAL como referência
      // Dados PASSADOS antes deste ponto serão IGNORADOS
      if (baralhos.length > 0) {
        ultimoElementoVisto = baralhos[baralhos.length - 1];
        console.log(`🔄 RESET #${document.querySelectorAll('[data-reset-count]').length + 1}`);
        console.log(`   Último elemento marcado: ${ultimoElementoVisto}`);
        console.log(`   A partir da próxima mensagem, apenas dados APÓS este serão contados`);
      } else {
        console.log("⚠️ Array vazio, não há elemento para marcar");
      }
      
      // Renderizar tabelas limpas com padrão
      const stats = {
        "Vermelho": {},
        "Azul": {},
        "Empate": {}
      };
      
      // Inicializar números fixos com zeros
      const numerosAzulVermelho = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      const numerosEmpate = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      
      numerosAzulVermelho.forEach(num => {
        stats.Azul[num] = { Azul: 0, Vermelho: 0, Empate: 0 };
        stats.Vermelho[num] = { Azul: 0, Vermelho: 0, Empate: 0 };
      });
      
      numerosEmpate.forEach(num => {
        stats.Empate[num] = { Azul: 0, Vermelho: 0, Empate: 0 };
      });
      
      // Renderizar tabelas limpas
      renderTabelaMatriz("tabelaVermelho", stats);
      renderTabelaMatriz("tabelaAzul", stats);
      renderTabelaMatriz("tabelaEmpate", stats);
      
      document.getElementById("ultimaAtualizacao").innerText = "🔄 Dados resetados! Aguardando novos dados...";
      console.log(`✅ Tabelas renderizadas vazias com padrão. Sistema pronto para contar novos dados`);
    })
    .catch(err => console.error("Erro ao resetar:", err));
}

// ===============================
// UTILIDADES
// ===============================
function parse(item) {
  const letra = item[0];
  const numero = parseInt(item.match(/\d+/)[0]);

  return {
    letra,
    numero,
    nome: letra === "P" ? "Azul" : letra === "B" ? "Vermelho" : "Empate"
  };
}

function obterTimestampAtual() {
  return new Date().getTime();
}

// ===============================
// CRONÔMETRO 24H (PERSISTENTE)
// ===============================
let cronometro = JSON.parse(localStorage.getItem("cronometro_bacbo")) || {
  inicio: obterTimestampAtual(),
  dados: {}
};

function resetarSe24h() {
  const agora = obterTimestampAtual();
  if (agora - cronometro.inicio >= 24 * 60 * 60 * 1000) {
    cronometro = {
      inicio: agora,
      dados: {}
    };
    localStorage.setItem("cronometro_bacbo", JSON.stringify(cronometro));
  }
}

// ===============================
// PROCESSAMENTO
// ===============================
function processarTransicoes(lista) {
  const stats = {
    Azul: {},
    Vermelho: {},
    Empate: {}
  };

  console.log(`🔍 processarTransicoes: lista com ${lista.length} elementos`);

  // Iterar da lista: lista[i] é anterior, lista[i+1] é o próximo
  for (let i = 0; i < lista.length - 1; i++) {
    const itemAnterior = lista[i];
    const itemProximo = lista[i + 1];
    
    const parteAnterior = itemAnterior.split("(");
    const corAnterior = parteAnterior[0];
    const numeroAnterior = parseInt(parteAnterior[1].replace(")", ""));

    const parteProxima = itemProximo.split("(");
    const corProxima = parteProxima[0];

    // Inicializar se não existe
    if (!stats[corAnterior][numeroAnterior]) {
      stats[corAnterior][numeroAnterior] = {
        Azul: 0,
        Vermelho: 0,
        Empate: 0
      };
    }

    // Contar qual cor veio após este número
    stats[corAnterior][numeroAnterior][corProxima]++;
    
    console.log(`  ${itemAnterior} → ${itemProximo}: ${corAnterior}(${numeroAnterior}) → ${corProxima}++`);
  }

  console.log(`✅ Stats finais:`, stats);
  return stats;
}

function atualizarCronometro(lista) {
  resetarSe24h();

  // Iterar da lista: lista[i] é anterior, lista[i+1] é o próximo
  for (let i = 0; i < lista.length - 1; i++) {
    const itemAnterior = lista[i];
    const itemProximo = lista[i + 1];
    
    const parteAnterior = itemAnterior.split("(");
    const corAnterior = parteAnterior[0];
    const numeroAnterior = parseInt(parteAnterior[1].replace(")", ""));

    const parteProxima = itemProximo.split("(");
    const corProxima = parteProxima[0];

    const chave = `${corAnterior}${numeroAnterior}`;

    if (!cronometro.dados[chave]) {
      cronometro.dados[chave] = { Azul: 0, Vermelho: 0, Empate: 0 };
    }

    cronometro.dados[chave][corProxima]++;
  }

  localStorage.setItem("cronometro_bacbo", JSON.stringify(cronometro));
}

// ===============================
// RENDER - TABELA MATRIZ (ESTILO EXCEL)
// ===============================
function renderTabelaMatriz(id, stats) {
  const tabela = document.getElementById(id);
  
  // Determinar qual cor é a principal desta tabela
  let corPrincipal = "Azul";
  let numerosFixos = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // Padrão para Azul e Vermelho
  
  if (id.includes("Vermelho")) {
    corPrincipal = "Vermelho";
    numerosFixos = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  } else if (id.includes("Empate")) {
    corPrincipal = "Empate";
    numerosFixos = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // Amarelo tem 2 a 12
  }

  // Cores que aparecem nas linhas
  const coresLinhas = ["Azul", "Vermelho", "Empate"];
  const corPrincipalMinuscula = corPrincipal.toLowerCase();

  let html = `<tr><td class="label-linha label-cor-${corPrincipalMinuscula}" style='width: 100px;'>NÚMEROS</td>`;
  
  // Cabeçalho com números fixos
  for (const num of numerosFixos) {
    html += `<th class="header-cor-${corPrincipalMinuscula}">${num}</th>`;
  }
  html += "</tr>";

  // Cada linha representa uma cor que PODE vir depois
  for (const corLinha of coresLinhas) {
    const corLinhaMinuscula = corLinha.toLowerCase();
    const bgColor = corPrincipalMinuscula === 'vermelho' ? '#ff4444' : corPrincipalMinuscula === 'azul' ? '#4444ff' : '#ffaa00';
    
    html += `<tr><td class="label-linha label-cor-${corPrincipalMinuscula}" style="background-color: ${bgColor};">${corLinha.toUpperCase()}</td>`;

    // Para cada número do padrão fixo
    for (const num of numerosFixos) {
      // Buscar quantas vezes essa transição ocorreu
      // stats[corPrincipal][numero][corQueVeioDepois]
      const valor = stats[corPrincipal]?.[num]?.[corLinha] || 0;
      const classe = corLinhaMinuscula;

      if (valor > 0) {
        html += `<td class="${classe}">${valor}</td>`;
      } else {
        html += `<td class="vazio"></td>`;
      }
    }

    html += "</tr>";
  }

  tabela.innerHTML = html;
}

function renderizarTelas(json) {
  console.log(`\n📨 renderizarTelas chamada`);
  console.log(`   timerResetAtivo=${timerResetAtivo}, ultimoElementoVisto=${ultimoElementoVisto}`);
  
  const baralhos = json.baralhos["0"];
  if (!Array.isArray(baralhos)) {
    console.error("Dados inválidos - não é array");
    mostrarTabelasVazias();
    return;
  }

  console.log(`   total de dados: ${baralhos.length}`);

  // Obter período selecionado em minutos
  const minutos = parseInt(document.getElementById("selectTempo").value);

  // Se timer está ativo E já foi resetado (ultimoElementoVisto != null)
  // Então contar APENAS dados após o elemento marcado
  // Caso contrário, use o período normal
  let baralhosFiltrados;
  if (timerResetAtivo && ultimoElementoVisto !== null) {
    // Timer ativo e já foi resetado: apenas dados NOVOS após o último visto
    const indiceUltimo = baralhos.lastIndexOf(ultimoElementoVisto);
    if (indiceUltimo === -1) {
      // Elemento marcado saiu do array (muito tempo passou)
      // Contar todos os dados atuais
      baralhosFiltrados = baralhos;
      console.log(`🔍 Elemento ${ultimoElementoVisto} saiu do array, contando todos os ${baralhos.length} dados`);
    } else {
      // Contar a partir do próximo elemento após o marcado
      baralhosFiltrados = baralhos.slice(indiceUltimo + 1);
      console.log(`📊 TIMER ATIVO + RESETADO - Encontrado ${ultimoElementoVisto} no índice ${indiceUltimo}, contando ${baralhosFiltrados.length} novos dados`);
    }
  } else if (timerResetAtivo) {
    // Timer ativo mas ainda não foi resetado: usa período normal
    const limiteIndices = Math.max(0, baralhos.length - (minutos * 12)); // ~12 por minuto (5s cada)
    baralhosFiltrados = baralhos.slice(limiteIndices);
    console.log(`📊 TIMER ATIVO (aguardando reset) - últimos ${minutos}min (${baralhosFiltrados.length} dados)`);
  } else {
    // Timer desativado: comportamento normal
    const limiteIndices = Math.max(0, baralhos.length - (minutos * 12)); // ~12 por minuto (5s cada)
    baralhosFiltrados = baralhos.slice(limiteIndices);
    console.log(`📊 TIMER INATIVO - últimos ${minutos}min (${baralhosFiltrados.length} dados)`);
  }

  if (baralhosFiltrados.length < 2) {
    console.log("⚠️ Dados insuficientes para processar transições");
    console.log(`   baralhos.length=${baralhos.length}, ultimoElementoVisto=${ultimoElementoVisto}`);
    console.log(`   elementos após último visto: ${baralhosFiltrados.length}`);
    document.getElementById("ultimaAtualizacao").innerText = "Aguardando novos dados...";
    
    // SEMPRE renderizar tabelas com padrão, mesmo que vazias!
    mostrarTabelasVazias();
    return;
  }

  // Processar transições
  console.log(`✅ Processando ${baralhosFiltrados.length} elementos...`);
  const stats = processarTransicoes(baralhosFiltrados);
  atualizarCronometro(baralhos); // Sem reverter

  // Renderizar 3 tabelas com os stats corretos
  console.log("📊 Renderizando tabelas com dados");
  renderTabelaMatriz("tabelaVermelho", stats);
  renderTabelaMatriz("tabelaAzul", stats);
  renderTabelaMatriz("tabelaEmpate", stats);

  // Atualizar informação de timestamp
  const dataAtualizacao = new Date();
  const tempoFormatado = dataAtualizacao.toLocaleTimeString("pt-BR");
  document.getElementById("ultimaAtualizacao").innerText = `Última atualização: ${tempoFormatado}`;
}

function mostrarTabelasVazias() {
  console.log("📋 Renderizando tabelas vazias com padrão");
  
  const stats = {
    "Vermelho": {},
    "Azul": {},
    "Empate": {}
  };
  
  // Inicializar números fixos com zeros
  const numerosAzulVermelho = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const numerosEmpate = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  
  numerosAzulVermelho.forEach(num => {
    stats.Azul[num] = { Azul: 0, Vermelho: 0, Empate: 0 };
    stats.Vermelho[num] = { Azul: 0, Vermelho: 0, Empate: 0 };
  });
  
  numerosEmpate.forEach(num => {
    stats.Empate[num] = { Azul: 0, Vermelho: 0, Empate: 0 };
  });
  
  // Renderizar tabelas com zeros
  renderTabelaMatriz("tabelaVermelho", stats);
  renderTabelaMatriz("tabelaAzul", stats);
  renderTabelaMatriz("tabelaEmpate", stats);
}

// ===============================
// CONEXÃO COM SERVER-SENT EVENTS
// ===============================
function conectarSSE() {
  const eventSource = new EventSource("/atualizacoes");
  
  eventSource.onmessage = function(event) {
    try {
      const json = JSON.parse(event.data);
      if (json.erro) {
        console.error("Erro do servidor:", json.erro);
        return;
      }
      renderizarTelas(json);
    } catch (err) {
      console.error("Erro ao processar evento:", err);
    }
  };
  
  eventSource.onerror = function(err) {
    console.error("Erro na conexão SSE:", err);
    eventSource.close();
    // Tentar reconectar após 3 segundos
    setTimeout(conectarSSE, 3000);
  };
}

// ===============================
// EVENT LISTENERS
// ===============================
document.getElementById("btnAtualizar").addEventListener("click", () => {
  // Forçar atualização imediata
  fetch("/baralhos_ultimos_2000.json", { cache: "no-store" })
    .then(res => res.json())
    .then(json => renderizarTelas(json))
    .catch(err => console.error("Erro ao atualizar:", err));
});

document.getElementById("selectTempo").addEventListener("change", () => {
  // Re-renderizar com novo período ao mudar
  fetch("/baralhos_ultimos_2000.json", { cache: "no-store" })
    .then(res => res.json())
    .then(json => renderizarTelas(json))
    .catch(err => console.error("Erro ao atualizar:", err));
});

// Botões do timer
document.getElementById("btnIniciarTimer").addEventListener("click", () => {
  const minutos = parseInt(document.getElementById("inputTimer").value);
  iniciarTimerReset(minutos);
});

document.getElementById("inputTimer").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const minutos = parseInt(document.getElementById("inputTimer").value);
    iniciarTimerReset(minutos);
  }
});

document.getElementById("btnTimerStop").addEventListener("click", pararTimerReset);

// ===============================
// INICIALIZAÇÃO
// ===============================
console.log("✅ Script carregado");

// Aguardar DOM estar pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarPagina);
} else {
  inicializarPagina();
}

function inicializarPagina() {
  console.log("📄 DOM pronto - Inicializando...");
  
  // Carregar dados iniciais
  console.log("📥 Carregando dados iniciais...");
  fetch("/baralhos_ultimos_2000.json", { cache: "no-store" })
    .then(res => res.json())
    .then(json => {
      console.log("✅ Dados iniciais carregados");
      renderizarTelas(json);
    })
    .catch(err => console.error("❌ Erro ao carregar dados iniciais:", err));
  
  // Conectar ao SSE para atualizações contínuas
  console.log("🔌 Conectando ao SSE...");
  try {
    conectarSSE();
    console.log("✅ SSE conectado");
  } catch (err) {
    console.error("❌ Erro ao conectar SSE:", err);
  }
}
