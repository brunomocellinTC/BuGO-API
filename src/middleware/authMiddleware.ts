import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    oid: string;
    email: string;
    name: string;
    tid: string;
  };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Token não fornecido" });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as any;
    
    // Validar domínio da empresa
    const allowedDomains = (process.env.ALLOWED_DOMAINS || "").split(",").map(d => d.trim());
    const emailDomain = decoded.email?.split("@")[1];
    
    if (!allowedDomains.includes(emailDomain)) {
      res.status(403).json({ 
        error: `Domínio não autorizado. Seu domínio: ${emailDomain}` 
      });
      return;
    }

    (req as AuthRequest).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
