import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDefaultValues, formConfig } from "./config/formOptions.js";
import {
  createAzureWorkItem,
  getAzureEpicChildren,
  getAzureRelationTypes,
  getAzureTrackingData,
  getAzureWorkItemSummary
} from "./services/azureDevops.js";

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
app.use(express.json());

app.get("/api/health", (_request: Request, response: Response) => {
  response.json({ ok: true });
});

app.get("/api/form-config", (_request: Request, response: Response) => {
  response.json({
    ...formConfig,
    defaults: createDefaultValues()
  });
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

app.post("/api/work-items", async (request: Request, response: Response) => {
  try {
    const workItem = await createAzureWorkItem(request.body);

    response.status(201).json({
      id: workItem.id,
      url: workItem._links?.html?.href ?? workItem.url
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    response.status(400).json({ error: message });
  }
});

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


