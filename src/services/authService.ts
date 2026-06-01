import jwt from "jsonwebtoken";

export interface TokenPayload {
  oid: string;
  email: string;
  name: string;
  tid: string;
}

/**
 * Gera um JWT assinado com os dados do usuário
 */
export function generateJWT(payload: TokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET || "", {
    expiresIn: "24h",
    algorithm: "HS256"
  });
}

/**
 * Verifica e extrai dados do token do Azure AD
 */
export function verifyMicrosoftToken(azureToken: any): TokenPayload {
  const email = azureToken.preferred_username || azureToken.email || azureToken.upn;
  const name = azureToken.name || azureToken.given_name || "Usuário";

  if (!email || !azureToken.oid || !azureToken.tid) {
    throw new Error("Token Microsoft inválido: faltam dados obrigatórios");
  }

  return {
    oid: azureToken.oid,
    email,
    name,
    tid: azureToken.tid
  };
}

/**
 * Valida se o domínio do email está na lista de domínios permitidos
 */
export function validateEmailDomain(email: string, allowedDomains: string[]): boolean {
  if (!email || !allowedDomains.length) {
    return false;
  }

  const emailDomain = email.split("@")[1]?.toLowerCase();
  return allowedDomains.some(domain => domain.toLowerCase() === emailDomain);
}
