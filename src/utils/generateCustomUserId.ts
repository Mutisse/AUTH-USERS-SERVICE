// utils/generateCustomUserId.ts - DEVE estar assim:
import { randomBytes } from 'crypto';
import { UserMainRole, EmployeeSubRole, Role } from '../models/interfaces/interfaces.user';

// ✅ EXPORTAÇÃO CORRETA (default)
export default function generateCustomUserId(role: Role): string {
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const randomPart = randomBytes(2).toString('hex').toUpperCase();

  const prefixMap: Record<string, string> = {
    [UserMainRole.CLIENT]: 'CLI',
    [UserMainRole.EMPLOYEE]: 'EMP',
    [`${UserMainRole.EMPLOYEE}_${EmployeeSubRole.MANAGER}`]: 'EMP-MGR',
    [`${UserMainRole.EMPLOYEE}_${EmployeeSubRole.STAFF}`]: 'EMP-STA',
    [`${UserMainRole.EMPLOYEE}_${EmployeeSubRole.SALON_OWNER}`]: 'OWN'
  };

  // Verifica se é um role composto
  if (role.includes('_') && prefixMap[role]) {
    return `${prefixMap[role]}-${currentYear}-${randomPart}`;
  }

  // Fallback para roles simples ou desconhecidos
  const prefix = prefixMap[role] || 'USR';
  return `${prefix}-${currentYear}-${randomPart}`;
}

// ❌ NÃO exporte assim:
// export { generateCustomUserId }; // ISSO CAUSA O ERRO