import { UserMainRole } from "../models/interfaces/user.roles";

export default function generateCustomUserId(role: UserMainRole): string {
  const timestamp = Date.now().toString().slice(-6);
  const randomNumbers = Math.random().toString().slice(2, 6);
  const randomLetters = generateMixedRandomPart();

  let prefix = "USR";

  if (role === UserMainRole.CLIENT) {
    prefix = "CLI";
  } else if (role === UserMainRole.EMPLOYEE) {
    prefix = "EMP";
  } else if (role === UserMainRole.ADMINSYSTEM) {
    prefix = "ADM";
  }

  return `${prefix}${timestamp}${randomLetters}${randomNumbers}`;
}

function generateMixedRandomPart(): string {
  // Gera 2 letras aleatórias
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let letterPart = "";

  for (let i = 0; i < 2; i++) {
    letterPart += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  return letterPart;
}

// Exemplo: "CLI429384XY5293"
