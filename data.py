import requests
import json
import time
from datetime import datetime

URL = "https://api.jogosvirtual.com/jsons/historico_baralho_bacbo.json"
MAX_LINHAS = 2000
OUTPUT_FILE = "baralhos_ultimos_2000.json"
INTERVALO = 2  # segundos

MAPEAMENTO = {
    "P": "Azul",
    "B": "Vermelho",
    "T": "Empate (Amarelo)"
}

def converter_valor(valor: str) -> str:
    """
    Converte:
    B(11) -> Vermelho(11)
    P(10) -> Azul(10)
    T(8)  -> Empate (Amarelo)(8)
    """
    if not isinstance(valor, str) or "(" not in valor:
        return valor

    letra = valor[0].upper()
    numero = valor[1:]  # mantém "(11)"

    return f"{MAPEAMENTO.get(letra, letra)}{numero}"

def atualizar_json():
    response = requests.get(URL, timeout=10)
    response.raise_for_status()

    data = response.json()

    if "baralhos" not in data or not isinstance(data["baralhos"], dict):
        raise ValueError("Estrutura inválida: chave 'baralhos' não encontrada.")

    baralhos_convertidos = {}

    for key, valores in data["baralhos"].items():
        if not isinstance(valores, list):
            continue

        # últimos 2000 registros
        ultimos = valores[-MAX_LINHAS:]

        # conversão mantendo números
        convertidos = [converter_valor(v) for v in ultimos]

        baralhos_convertidos[key] = convertidos

    resultado = {
        "baralhos": baralhos_convertidos,
        "ultima_atualizacao": datetime.now().isoformat()
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)

    print(f"[{datetime.now()}] JSON atualizado com números mantidos")

if __name__ == "__main__":
    print("Iniciando atualização automática...")
    print(f"Intervalo: {INTERVALO}s")
    print(f"Arquivo: {OUTPUT_FILE}\n")

    while True:
        try:
            atualizar_json()
        except Exception as e:
            print(f"[ERRO] {e}")

        time.sleep(INTERVALO)
