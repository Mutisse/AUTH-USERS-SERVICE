export class SimpleIdGenerator {
  private static instance: SimpleIdGenerator;
  private usedIds: Set<string> = new Set();

  public static getInstance(): SimpleIdGenerator {
    if (!SimpleIdGenerator.instance) {
      SimpleIdGenerator.instance = new SimpleIdGenerator();
    }
    return SimpleIdGenerator.instance;
  }

  /**
   * Gera um ID no formato URS429XY5-HH-AAAA/MM/DD
   */
  public generate(): string {
    let id: string;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      // Parte 1: URS + 6 caracteres aleatórios (letras e números)
      const randomPart = "URS" + this.generateRandomString(6);

      // Parte 2: HH (hora atual)
      const hours = new Date().getHours().toString().padStart(2, "0");

      // Parte 3: AAAA/MM/DD (data atual)
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const day = now.getDate().toString().padStart(2, "0");
      const datePart = `${year}${month}${day}`;

      id = `${randomPart}${hours}${datePart}`;
      attempts++;

      if (attempts > maxAttempts) {
        throw new Error("Não foi possível gerar um ID único");
      }
    } while (this.usedIds.has(id));

    this.usedIds.add(id);
    return id;
  }

  /**
   * Gera string aleatória com letras e números
   */
  private generateRandomString(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  /**
   * Valida se o ID está no formato correto
   */
  public validate(id: string): boolean {
    const pattern = /^URS[A-Z0-9]{6}-[0-9]{2}-[0-9]{4}\/[0-9]{2}\/[0-9]{2}$/;
    return pattern.test(id);
  }

  /**
   * Limpa IDs usados (para testes)
   */
  public clearUsedIds(): void {
    this.usedIds.clear();
  }
}

// 🎯 FUNÇÃO PRINCIPAL DE CONVENIÊNCIA
export function generateUserId(): string {
  return SimpleIdGenerator.getInstance().generate();
}

// 🎯 FUNÇÃO PARA GERAR VÁRIOS IDs
export function generateBatchIds(count: number): string[] {
  const generator = SimpleIdGenerator.getInstance();
  const ids: string[] = [];

  for (let i = 0; i < count; i++) {
    ids.push(generator.generate());
  }

  return ids;
}

// 🎯 FUNÇÃO DE VALIDAÇÃO
export function validateId(id: string): boolean {
  return SimpleIdGenerator.getInstance().validate(id);
}

// Exemplo de uso:
// const id1 = generateUserId(); // "URS429XY5-14-2024/01/15"
// const id2 = generateUserId(); // "URS8H3KL2-14-2024/01/15"
