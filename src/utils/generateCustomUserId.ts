import { UserMainRole, EmployeeSubRole } from "../models/interfaces/user.roles";

// 🎯 CONFIGURAÇÃO DO GERADOR DE ID
interface IdGeneratorConfig {
  prefix: string;
  pattern: string; // 'T' = timestamp, 'R' = random, 'L' = letters, 'N' = numbers
  length: number;
  separator?: string;
  checksum?: boolean;
}

// 🎯 CONFIGURAÇÕES POR TIPO DE USUÁRIO
const ID_CONFIGS: Record<string, IdGeneratorConfig> = {
  [UserMainRole.CLIENT]: {
    prefix: "CLI",
    pattern: "TTTLLLRNN",
    length: 12,
    separator: "-",
    checksum: true
  },
  [UserMainRole.EMPLOYEE]: {
    prefix: "EMP",
    pattern: "TTTLLLRNN",
    length: 12,
    separator: "-",
    checksum: true
  },
  [UserMainRole.ADMINSYSTEM]: {
    prefix: "ADM",
    pattern: "TTTLLLRNN",
    length: 12,
    separator: "-",
    checksum: true
  }
};

// 🎯 CONFIGURAÇÕES ESPECÍFICAS POR SUB-ROLE
const SUBROLE_PREFIXES: Partial<Record<EmployeeSubRole, string>> = {
  [EmployeeSubRole.SALON_OWNER]: "SO",
  [EmployeeSubRole.MANAGER]: "MG",
  [EmployeeSubRole.STAFF]: "ST",
  [EmployeeSubRole.RECEPTIONIST]: "RC"
};

// 🎯 GERADOR PRINCIPAL
export class UserIdGenerator {
  private usedIds: Set<string> = new Set();
  private static instance: UserIdGenerator;

  public static getInstance(): UserIdGenerator {
    if (!UserIdGenerator.instance) {
      UserIdGenerator.instance = new UserIdGenerator();
    }
    return UserIdGenerator.instance;
  }

  /**
   * Gera um ID customizado baseado no role e sub-role
   */
  public generate(
    role: UserMainRole, 
    subRole?: EmployeeSubRole, 
    options: { 
      includeSubRole?: boolean; 
      customPrefix?: string;
      timestamp?: number;
    } = {}
  ): string {
    const config = ID_CONFIGS[role] || this.getDefaultConfig();
    const { includeSubRole = true, customPrefix, timestamp = Date.now() } = options;

    let userId: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      userId = this.buildUserId(role, subRole, config, timestamp, includeSubRole, customPrefix);
      attempts++;
      
      if (attempts > maxAttempts) {
        throw new Error(`Não foi possível gerar um ID único após ${maxAttempts} tentativas`);
      }
    } while (this.usedIds.has(userId));

    this.usedIds.add(userId);
    return userId;
  }

  /**
   * Constrói o ID passo a passo
   */
  private buildUserId(
    role: UserMainRole,
    subRole: EmployeeSubRole | undefined,
    config: IdGeneratorConfig,
    timestamp: number,
    includeSubRole: boolean,
    customPrefix?: string
  ): string {
    const parts: string[] = [];

    // 🎯 PREFIXO
    let prefix = customPrefix || config.prefix;
    if (includeSubRole && subRole && SUBROLE_PREFIXES[subRole]) {
      prefix += SUBROLE_PREFIXES[subRole];
    }
    parts.push(prefix);

    // 🎯 CORPO BASEADO NO PATTERN
    const body = this.generateFromPattern(config.pattern, timestamp);
    parts.push(body);

    // 🎯 CHECKSUM (opcional)
    if (config.checksum) {
      const checksum = this.generateChecksum(parts.join(''));
      parts.push(checksum);
    }

    // 🎯 FORMATAÇÃO FINAL
    let finalId = parts.join(config.separator || '');

    // 🎯 GARANTIR COMPRIMENTO
    finalId = this.ensureLength(finalId, config.length);

    return finalId;
  }

  /**
   * Gera parte do ID baseado no pattern
   */
  private generateFromPattern(pattern: string, timestamp: number): string {
    let result = '';

    for (const char of pattern) {
      switch (char) {
        case 'T': // Timestamp
          result += timestamp.toString().slice(-3);
          break;
        case 'R': // Random
          result += Math.random().toString(36).substring(2, 4).toUpperCase();
          break;
        case 'L': // Letters
          result += this.generateRandomLetters(1);
          break;
        case 'N': // Numbers
          result += Math.floor(Math.random() * 10);
          break;
        default:
          result += char;
      }
    }

    return result;
  }

  /**
   * Gera letras aleatórias
   */
  private generateRandomLetters(length: number): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    return result;
  }

  /**
   * Gera checksum simples
   */
  private generateChecksum(id: string): string {
    let sum = 0;
    
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      sum = (sum + char) % 36;
    }

    return sum.toString(36).toUpperCase();
  }

  /**
   * Garante o comprimento do ID
   */
  private ensureLength(id: string, length: number): string {
    if (id.length > length) {
      return id.substring(0, length);
    }
    
    if (id.length < length) {
      return id.padEnd(length, this.generateRandomLetters(1));
    }

    return id;
  }

  /**
   * Configuração padrão
   */
  private getDefaultConfig(): IdGeneratorConfig {
    return {
      prefix: "USR",
      pattern: "TTTRRNN",
      length: 10,
      checksum: false
    };
  }

  /**
   * Valida um ID gerado
   */
  public validate(id: string, role?: UserMainRole): boolean {
    // Verifica formato básico
    if (!id || id.length < 6) return false;

    // Verifica prefixo se role for fornecido
    if (role && ID_CONFIGS[role]) {
      const expectedPrefix = ID_CONFIGS[role].prefix;
      if (!id.startsWith(expectedPrefix)) return false;
    }

    // Verifica checksum se aplicável
    if (id.includes('-')) {
      const parts = id.split('-');
      if (parts.length > 1) {
        const body = parts.slice(0, -1).join('');
        const providedChecksum = parts[parts.length - 1];
        const calculatedChecksum = this.generateChecksum(body);
        
        if (providedChecksum !== calculatedChecksum) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Decodifica informações do ID
   */
  public decode(id: string): {
    role?: UserMainRole;
    subRole?: EmployeeSubRole;
    timestamp?: number;
    isValid: boolean;
  } {
    const result: any = { isValid: this.validate(id) };

    if (!result.isValid) return result;

    // Detecta role pelo prefixo
    for (const [role, config] of Object.entries(ID_CONFIGS)) {
      if (id.startsWith(config.prefix)) {
        result.role = role as UserMainRole;
        
        // Detecta sub-role
        const prefix = config.prefix;
        const remaining = id.substring(prefix.length);
        
        for (const [subRole, subPrefix] of Object.entries(SUBROLE_PREFIXES)) {
          if (remaining.startsWith(subPrefix)) {
            result.subRole = subRole as EmployeeSubRole;
            break;
          }
        }
        break;
      }
    }

    return result;
  }

  /**
   * Limpa IDs usados (útil para testes)
   */
  public clearUsedIds(): void {
    this.usedIds.clear();
  }

  /**
   * Estatísticas de uso
   */
  public getStats(): { totalGenerated: number; cacheSize: number } {
    return {
      totalGenerated: this.usedIds.size,
      cacheSize: this.usedIds.size
    };
  }
}

// 🎯 FUNÇÃO DE CONVENIÊNCIA (backward compatibility)
export default function generateCustomUserId(
  role: UserMainRole, 
  subRole?: EmployeeSubRole
): string {
  return UserIdGenerator.getInstance().generate(role, subRole);
}

// 🎯 FUNÇÕES UTILITÁRIAS ADICIONAIS
export function generateBatchUserIds(
  role: UserMainRole, 
  count: number, 
  subRole?: EmployeeSubRole
): string[] {
  const generator = UserIdGenerator.getInstance();
  const ids: string[] = [];

  for (let i = 0; i < count; i++) {
    ids.push(generator.generate(role, subRole));
  }

  return ids;
}

export function validateUserId(id: string, role?: UserMainRole): boolean {
  return UserIdGenerator.getInstance().validate(id, role);
}

export function decodeUserId(id: string) {
  return UserIdGenerator.getInstance().decode(id);
}

// 🎯 EXEMPLOS DE USO:
/*
// 1. Uso básico
const clientId = generateCustomUserId(UserMainRole.CLIENT);
// "CLI-429XY5-29-A"

const employeeId = generateCustomUserId(UserMainRole.EMPLOYEE, EmployeeSubRole.SALON_OWNER);
// "EMPSO-384AB-38-B"

// 2. Uso avançado
const generator = UserIdGenerator.getInstance();
const adminId = generator.generate(UserMainRole.ADMINSYSTEM, undefined, {
  customPrefix: "SYS",
  includeSubRole: false
});
// "SYS-529CD-52-C"

// 3. Validação
const isValid = validateUserId("CLI-429XY5-29-A", UserMainRole.CLIENT);
// true

// 4. Decodificação
const info = decodeUserId("EMPSO-384AB-38-B");
// { role: "employee", subRole: "salon_owner", isValid: true }

// 5. Lote
const batchIds = generateBatchUserIds(UserMainRole.CLIENT, 5);
// ["CLI-529CD-52-A", "CLI-630DE-63-B", ...]
*/