from flask import Flask, jsonify, render_template, request, send_file, Response
import requests
from datetime import datetime, timedelta
import os
import json
import threading
import time

app = Flask(__name__)

URL = "https://api.jogosvirtual.com/jsons/historico_baralho_bacbo.json"
OUTPUT_FILE = "baralhos_ultimos_2000.json"
INTERVALO_ATUALIZACAO = 5  # frequência de polling da fonte (mantido curto)
SEGUNDOS_POR_RODADA = 33   # cadência esperada de chegada de uma nova rodada
MAX_LINHAS = 2000

MAPEAMENTO = {
    "P": "Azul",
    "B": "Vermelho",
    "T": "Empate"
}

def parse(valor):
    # B(11) -> (Vermelho, 11)
    cor = MAPEAMENTO.get(valor[0])
    numero = int(valor[valor.find("(")+1:valor.find(")")])
    return cor, numero

def gerar_tabelas(minutos):
    response = requests.get(URL, timeout=10)
    data = response.json()["baralhos"]["0"]

    # janela por quantidade (aprox.) usando a cadência de 33s por rodada
    limite = minutos * 60 // SEGUNDOS_POR_RODADA
    dados = data[-limite:]

    tabelas = {
        "Vermelho": {},
        "Azul": {},
        "Empate": {}
    }

    for i in range(len(dados) - 1):
        cor_atual, num_atual = parse(dados[i])
        cor_prox, _ = parse(dados[i + 1])

        tabelas.setdefault(cor_atual, {})
        tabelas[cor_atual].setdefault(num_atual, {
            "Azul": 0,
            "Vermelho": 0,
            "Empate": 0
        })

        tabelas[cor_atual][num_atual][cor_prox] += 1

    return tabelas

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/baralhos_ultimos_2000.json")
def baralhos_json():
    response = send_file(os.path.join(os.path.dirname(__file__), OUTPUT_FILE))
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route("/atualizacoes")
def atualizacoes():
    """Server-Sent Events para atualização em tempo real."""

    def gerar():
        while True:
            try:
                with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                    dados = json.load(f)
                    yield f"data: {json.dumps(dados)}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'erro': str(e)})}\n\n"
            time.sleep(1)  # verifica a cada 1s (otimizado)

    return Response(gerar(), mimetype='text/event-stream')

@app.route("/dados")
def dados():
    minutos = int(request.args.get("minutos", 30))
    return jsonify(gerar_tabelas(minutos))

# ===============================
# ATUALIZAÇÃO AUTOMÁTICA
# ===============================
def converter_valor(valor: str) -> str:
    """Converte B(11) -> Vermelho(11)"""
    if not isinstance(valor, str) or "(" not in valor:
        return valor
    
    letra = valor[0].upper()
    numero = valor[1:]
    
    return f"{MAPEAMENTO.get(letra, letra)}{numero}"

def atualizar_json_automatico():
    """Thread que atualiza o JSON a cada 10 segundos"""
    while True:
        try:
            response = requests.get(URL, timeout=10)
            data = response.json()

            if "baralhos" not in data or not isinstance(data["baralhos"], dict):
                raise ValueError("Estrutura inválida")

            baralhos_convertidos = {}

            for key, valores in data["baralhos"].items():
                if not isinstance(valores, list):
                    continue

                ultimos = valores[-MAX_LINHAS:]
                convertidos = [converter_valor(v) for v in ultimos]
                baralhos_convertidos[key] = convertidos

            resultado = {
                "baralhos": baralhos_convertidos,
                "ultima_atualizacao": datetime.now().isoformat()
            }

            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(resultado, f, ensure_ascii=False, indent=2)

            print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ JSON atualizado")

        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ✗ Erro ao atualizar: {e}")

        time.sleep(INTERVALO_ATUALIZACAO)

# Iniciar thread de atualização
thread_atualizacao = threading.Thread(target=atualizar_json_automatico, daemon=True)
thread_atualizacao.start()

if __name__ == "__main__":
    app.run(debug=False, host='127.0.0.1', port=5000)
