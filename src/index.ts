import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDefaultValues, formConfig } from "./config/formOptions.js";
import {
  createAzureWorkItem,
  getAzureEpicChildren,
  getAzureFieldMap,
  getAzureRelationTypes,
  getAzureTrackingData,
  getAzureWorkItemSummary,
  getAzureAreaOptions,
  validateAzurePat,
  createTitle,
  WorkItemPayload
} from "./services/azureDevops.js";
import { authMiddleware, AuthRequest } from "./middleware/authMiddleware.js";
import { generateJWT, verifyMicrosoftToken, validateEmailDomain } from "./services/authService.js";
import { sendTeamsWorkItemCard } from "./services/teamsWebhook.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const apiRootDir = path.resolve(currentDir, "..");
const clientDistPath = path.resolve(currentDir, "../../BuGO-Front/dist");
const shouldServeClient =
  process.env.NODE_ENV === "production" || process.env.SERVE_CLIENT === "true";

dotenv.config({ path: path.resolve(apiRootDir, ".env") });
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ===== ROTAS DE AUTENTICAÇÃO =====

/**
 * POST /api/auth/microsoft-token
 * Recebe token do Microsoft e retorna JWT da aplicação
 */
app.post("/api/auth/microsoft-token", async (request: Request, response: Response) => {
  try {
    const { access_token: microsoftToken } = request.body;

    if (!microsoftToken) {
      return response.status(400).json({ error: "Token Microsoft não fornecido" });
    }

    // Decodificar o token do Microsoft (sem verificação de assinatura, pois é feito pelo frontend)
    // Em produção, você deveria verificar a assinatura
    const parts = microsoftToken.split(".");
    if (parts.length !== 3) {
      return response.status(400).json({ error: "Formato de token inválido" });
    }

    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());

    // Validar dados do token
    const tokenPayload = verifyMicrosoftToken(payload);

    // Validar domínio
    const allowedDomains = (process.env.ALLOWED_DOMAINS || "").split(",").map(d => d.trim());
    if (!validateEmailDomain(tokenPayload.email, allowedDomains)) {
      return response.status(403).json({
        error: `Acesso negado. Domínio '${tokenPayload.email.split("@")[1]}' não autorizado.`
      });
    }

    // Gerar JWT da aplicação
    const appToken = generateJWT(tokenPayload);

    response.json({
      access_token: appToken,
      user: {
        email: tokenPayload.email,
        name: tokenPayload.name,
        oid: tokenPayload.oid
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha na autenticação";
    response.status(400).json({ error: message });
  }
});

// ===== ROTAS PÚBLICAS =====

app.get("/api/health", (_request: Request, response: Response) => {
  response.json({ ok: true });
});

// ===== ROTAS PROTEGIDAS (requerem SSO) =====

app.get("/api/form-config", authMiddleware, async (_request: Request, response: Response) => {
  try {
    const areaOptions = await getAzureAreaOptions();

    response.json({
      ...formConfig,
      areaOptions,
      defaults: {
        ...createDefaultValues(),
        areaPath: areaOptions[0]?.value ?? ""
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    response.status(400).json({ error: message });
  }
});

app.get("/api/azure-auth-check", authMiddleware, async (_request: Request, response: Response) => {
  try {
    const result = await validateAzurePat();
    response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    response.status(400).json({ error: message });
  }
});

app.get("/api/azure-field-map", authMiddleware, async (_request: Request, response: Response) => {
  try {
    const fields = await getAzureFieldMap();
    response.json(fields);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    response.status(400).json({ error: message });
  }
});

app.get("/api/azure-sync", async (_request: Request, response: Response) => {
  try {
    const [tracking, relationTypes] = await Promise.all([
      getAzureTrackingData(),
      getAzureRelationTypes()
    ]);

    response.json({
      ...tracking,
      relationTypes: relationTypes.value
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    response.status(400).json({ error: message });
  }
});

app.get("/api/epics/:epicId/children", async (request: Request, response: Response) => {
  try {
    const epicId = Number(request.params.epicId);
    const epic = await getAzureEpicChildren(epicId);
    response.json(epic);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    response.status(400).json({ error: message });
  }
});

app.get("/api/work-items/:id", async (request: Request, response: Response) => {
  try {
    const id = Number(request.params.id);
    const item = await getAzureWorkItemSummary(id);
    response.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    response.status(400).json({ error: message });
  }
});

app.post("/api/work-items", authMiddleware, async (request: Request, response: Response) => {
  const req = request as AuthRequest;

  try {
    const body = req.body as Record<string, any>;

    const workItemData = {
      ...body,
      sendBy: req.user?.name || body.sendBy || ""
    };

    const workItem = await createAzureWorkItem(workItemData);

    /**
     * Buscar nomes selecionados
     */
    const tracking = await getAzureTrackingData();

    const epic = tracking.epics.find(
      (item) => String(item.id) === String(body.epicId)
    );

    const feature = epic?.features.find(
      (item) => String(item.id) === String(body.featureId)
    );

    const parent = feature?.children.find(
      (item) => String(item.id) === String(body.parentId)
    );

    /**
     * Enviar card Teams
     */
    try {
      await sendTeamsWorkItemCard({
        title: createTitle(workItemData as WorkItemPayload),

        workItemId: workItem.id,

        workItemType:
          body.kind,

        workItemUrl:
          workItem._links?.html?.href ??
          workItem.url,

        epicName:
          epic?.title || "-",

        featureName:
          feature?.title || "-",

        parentName:
          parent?.title || "-",

        areaPath:
          body.areaPath || "-",

        sendBy:
          req.user?.name ||
          body.sendBy ||
          "Usuário",

        createdUtc:
          new Date().toISOString()
      });

    } catch (teamsError) {
      console.error(
        "Falha webhook Teams:",
        teamsError
      );
    }

    response.status(201).json({
      id: workItem.id,
      url:
        workItem._links?.html?.href ??
        workItem.url
    });

  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error";

    response.status(400).json({
      error: message
    });
  }
});

/**
 * =========================================================
 * TESTE WEBHOOK TEAMS
 * =========================================================
 *
 * Abre no navegador:
 *
 * http://localhost:3000/api/test-teams-webhook
 *
 * ou produção:
 *
 * https://seudominio.com/api/test-teams-webhook
 *
 * =========================================================
 */

app.get(
  "/api/test-teams-webhook",
  async (
    _request: Request,
    response: Response
  ) => {
    try {
      await sendTeamsWorkItemCard({
        title:
          "[WEBHOOK][TEAMS] webhook do teams pbi",

        workItemId: 4272,

        workItemType: "issue",

        workItemUrl:
          "https://dev.azure.com/ti-testingcompany/Inova%C3%A7%C3%A3o/_workitems/edit/4272/",

        epicName:
          "TESTE AZURE BRUNO M",

        featureName:
          "Feature Teste",

        parentName: "",

        areaPath:
          "Inovação\\Area\\cPanel",

        sendBy:
          "Bruno Mocellin",

        createdUtc:
          new Date().toISOString()
      });

      response.json({
        ok: true,
        message:
          "Webhook Teams enviado com sucesso"
      });

    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao enviar webhook";

      response.status(500).json({
        ok: false,
        error: message
      });
    }
  }
);

if (shouldServeClient) {
  app.use(express.static(clientDistPath));

  app.get("*", (request: Request, response: Response, next: NextFunction) => {
    if (request.path.startsWith("/api/")) {
      return next();
    }

    response.sendFile(path.join(clientDistPath, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});











