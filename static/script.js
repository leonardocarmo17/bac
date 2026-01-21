const INTERVALO_ATUALIZACAO = 10000; // 10 segundos

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
  }

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
function renderTabelaMatriz(id, dados) {
  const tabela = document.getElementById(id);
  
  // Extrair cores únicas e ordenar
  const numeros = new Set();
  for (const cor in dados) {
    for (const numero in dados[cor]) {
      numeros.add(parseInt(numero));
    }
  }
  const numerosOrdenados = Array.from(numeros).sort((a, b) => a - b);

  // Determinar a cor principal da tabela pelo ID
  let corPrincipal = "azul";
  if (id.includes("Vermelho")) corPrincipal = "vermelho";
  else if (id.includes("Empate")) corPrincipal = "empate";
  else if (id.includes("Azul")) corPrincipal = "azul";

  // Cores e multiplicadores
  const linhas = ["AZUL", "VERMELHO", "EMPATE"];

  let html = `<tr><td class="label-linha label-cor-${corPrincipal}" style='width: 100px;'>NÚMEROS</td>`;
  
  // Cabeçalho com números
  for (const num of numerosOrdenados) {
    html += `<th class="header-cor-${corPrincipal}">${num}</th>`;
  }
  html += "</tr>";

  // Cada linha (cor ou multiplicador)
  for (const linha of linhas) {
    // Toda a primeira coluna usa a cor principal da tabela
    html += `<tr><td class="label-linha label-cor-${corPrincipal}" style="background-color: ${corPrincipal === 'vermelho' ? '#ff4444' : corPrincipal === 'azul' ? '#4444ff' : '#ffaa00'};">${linha}</td>`;

    for (const num of numerosOrdenados) {
      let valor = "";
      let classe = "";

      if (linha === "AZUL") {
        valor = dados.Azul[num]?.Azul || 0;
        classe = "azul";
      } else if (linha === "VERMELHO") {
        valor = dados.Vermelho[num]?.Vermelho || 0;
        classe = "vermelho";
      } else if (linha === "EMPATE") {
        valor = dados.Empate[num]?.Empate || 0;
        classe = "empate";
      }

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

// ===============================
// ATUALIZAÇÃO PRINCIPAL
// ===============================
async function atualizar() {
  try {
    const res = await fetch("/baralhos_ultimos_2000.json", { cache: "no-store" });
    const json = await res.json();

    const baralhos = json.baralhos["0"];
    if (!Array.isArray(baralhos) || baralhos.length < 2) {
      console.error("Dados inválidos");
      return;
    }

    // Obter período selecionado em minutos
    const minutos = parseInt(document.getElementById("selectTempo").value);
    const segundos = minutos * 60;

    // Filtrar dados pelos últimos N minutos
    const limiteIndices = Math.max(0, baralhos.length - (minutos * 12)); // ~12 por minuto (5s cada)
    const baralhosFiltrados = baralhos.slice(limiteIndices).reverse(); // Reverter para ler de baixo para cima

    // Processar transições
    const stats = processarTransicoes(baralhosFiltrados);
    atualizarCronometro(baralhos.reverse()); // Também reverter para o cronômetro

    // Renderizar 3 tabelas MATRIZ
    renderTabelaMatriz("tabelaVermelho", { Vermelho: stats.Vermelho, Azul: stats.Azul, Empate: stats.Empate });
    renderTabelaMatriz("tabelaAzul", { Azul: stats.Azul, Vermelho: stats.Vermelho, Empate: stats.Empate });
    renderTabelaMatriz("tabelaEmpate", { Empate: stats.Empate, Azul: stats.Azul, Vermelho: stats.Vermelho });

    // Atualizar informação de timestamp
    const dataAtualizacao = new Date();
    const tempoFormatado = dataAtualizacao.toLocaleTimeString("pt-BR");
    document.getElementById("ultimaAtualizacao").innerText = `Última atualização: ${tempoFormatado}`;

  } catch (err) {
    console.error("Erro ao carregar JSON:", err);
  }
}

// ===============================
// EVENT LISTENERS
// ===============================
document.getElementById("btnAtualizar").addEventListener("click", atualizar);
document.getElementById("selectTempo").addEventListener("change", atualizar);

// ===============================
// INICIALIZAÇÃO
// ===============================
atualizar();
setInterval(atualizar, INTERVALO_ATUALIZACAO);
