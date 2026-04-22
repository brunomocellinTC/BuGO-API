import { z } from "zod";

export const workItemPayloadSchema = z.object({
  kind: z.enum(["bug", "issue", "task"]),
  epicId: z.string().trim().min(1),
  featureId: z.string().trim().min(1),
  parentId: z.string().trim().optional().default(""),
  titleTag: z.string().trim().min(1),
  titleText: z.string().trim().min(1),
  sendBy: z.string().trim().optional().default(""),
  description: z.string().trim().min(1),
  acceptanceCriteria: z.string().trim().optional().default(""),
  priority: z.string().trim().optional().default(""),
  severity: z.string().trim().optional().default(""),
  activity: z.string().trim().optional().default(""),
  processPhase: z.string().trim().optional().default(""),
  valueArea: z.string().trim().optional().default(""),
  areaPath: z.string().trim().optional().default(""),
  steps: z.array(z.string().trim()).optional().default([]),
  systemInfo: z.array(
    z.object({
      category: z.enum(["browser", "desktop", "mobile"]),
      name: z.string().trim().min(1),
      detail: z.string().trim().optional().default(""),
      version: z.string().trim().optional().default("")
    })
  ).optional().default([]),
  attachments: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      size: z.number().nonnegative(),
      contentBase64: z.string().optional().default("")
    })
  ).optional().default([])
});

export type WorkItemPayload = z.infer<typeof workItemPayloadSchema>;

type AzureConfig = {
  organization: string;
  project: string;
  pat: string;
  workItemTypes: Record<"bug" | "issue" | "task", string>;
  fields: {
    title: string;
    description: string;
    acceptanceCriteria?: string;
    reproSteps?: string;
    steps?: string;
    sendBy?: string;
    priority?: string;
    severity?: string;
    activity?: string;
    processPhase?: string;
    valueArea?: string;
    systemInfo?: string;
    areaPath?: string;
    iterationPath?: string;
    tags?: string;
  };
  defaults: {
    areaPath?: string;
    iterationPath?: string;
    tags?: string;
  };
  enableAttachments: boolean;
};

type AzurePatchOperation = {
  op: "add";
  path: string;
  value:
    | string
    | {
        rel: string;
        url: string;
        attributes?: Record<string, string>;
      };
};

type AzureWorkItem = {
  id: number;
  fields?: Record<string, unknown>;
  relations?: Array<{
    rel?: string;
    url?: string;
  }>;
  url: string;
};

type AzureHierarchyItem = {
  id: number;
  title: string;
  workItemType: string;
  state: string;
  parentId?: number;
};

export type AzureSyncResponse = {
  workItemTypes: Array<{
    name: string;
    referenceName?: string;
    color?: string;
  }>;
  epics: Array<{
    id: number;
    title: string;
    state: string;
    features: Array<{
      id: number;
      title: string;
      workItemType: string;
      state: string;
      children: Array<{
        id: number;
        title: string;
        workItemType: string;
        state: string;
      }>;
    }>;
  }>;
  flatItems: AzureHierarchyItem[];
};

export type AzureWorkItemSummary = {
  id: number;
  title: string;
  workItemType: string;
  state: string;
  parentId?: number;
};

type AzureAreaNode = {
  name: string;
  path?: string;
  children?: AzureAreaNode[];
};

function normalizeAreaPath(rawAreaPath: string | undefined, projectName: string) {
  const raw = (rawAreaPath ?? "").trim();

  if (!raw) {
    return "";
  }

  const normalizedProject = projectName.trim();
  const normalized = raw
    .replace(/[\\/]+/g, "\\")
    .replace(/^\\+/, "")
    .replace(/\\+$/, "");

  if (!normalized) {
    return "";
  }

  if (normalized === normalizedProject || normalized.startsWith(`${normalizedProject}\\`)) {
    return normalized;
  }

  return `${normalizedProject}\\${normalized}`;
}

function stripAreaSegment(pathValue: string) {
  const segmentToStrip = (process.env.AZDO_AREA_PATH_STRIP_SEGMENT ?? "").trim();

  if (!segmentToStrip) {
    return pathValue;
  }

  const parts = pathValue.split("\\");
  const filtered = parts.filter((part) => part.trim().toLowerCase() !== segmentToStrip.toLowerCase());

  return filtered.join("\\");
}

function resolveAreaPath(
  rawAreaPath: string | undefined,
  projectName: string,
  options: Array<{ value: string; label: string }>
) {
  const normalizedInput = stripAreaSegment(normalizeAreaPath(rawAreaPath, projectName));

  if (!normalizedInput) {
    return "";
  }

  const normalizedOptions = options.map((option) => stripAreaSegment(normalizeAreaPath(option.value, projectName)));
  const exact = normalizedOptions.find((value) => value.toLowerCase() === normalizedInput.toLowerCase());

  return exact ?? "";
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getOptionalEnv(name: string) {
  return process.env[name]?.trim() || undefined;
}

function getAzureConfig(): AzureConfig {
  return {
    organization: getRequiredEnv("AZDO_ORGANIZATION"),
    project: getRequiredEnv("AZDO_PROJECT"),
    pat: getRequiredEnv("AZDO_PAT"),
    workItemTypes: {
      bug: getOptionalEnv("AZDO_BUG_WORK_ITEM_TYPE") ?? "Bug",
      issue: getOptionalEnv("AZDO_ISSUE_WORK_ITEM_TYPE") ?? "Issue",
      task: getOptionalEnv("AZDO_TASK_WORK_ITEM_TYPE") ?? "Task"
    },
    fields: {
      title: getOptionalEnv("AZDO_FIELD_TITLE") ?? "System.Title",
      description: getOptionalEnv("AZDO_FIELD_DESCRIPTION") ?? "System.Description",
      acceptanceCriteria: getOptionalEnv("AZDO_FIELD_ACCEPTANCE_CRITERIA"),
      reproSteps: getOptionalEnv("AZDO_FIELD_REPRO_STEPS"),
      steps: getOptionalEnv("AZDO_FIELD_STEPS") ?? "Microsoft.VSTS.TCM.Steps",
      sendBy: getOptionalEnv("AZDO_FIELD_SEND_BY") ?? getOptionalEnv("AZDO_FIELD_REQUESTER_NAME"),
      priority: getOptionalEnv("AZDO_FIELD_PRIORITY"),
      severity: getOptionalEnv("AZDO_FIELD_SEVERITY"),
      activity: getOptionalEnv("AZDO_FIELD_ACTIVITY"),
      processPhase: getOptionalEnv("AZDO_FIELD_PROCESS_PHASE"),
      valueArea: getOptionalEnv("AZDO_FIELD_VALUE_AREA"),
      systemInfo: getOptionalEnv("AZDO_FIELD_SYSTEM_INFO"),
      areaPath: getOptionalEnv("AZDO_FIELD_AREA_PATH") ?? "System.AreaPath",
      iterationPath: getOptionalEnv("AZDO_FIELD_ITERATION_PATH") ?? "System.IterationPath",
      tags: getOptionalEnv("AZDO_FIELD_TAGS")
    },
    defaults: {
      areaPath: getOptionalEnv("AZDO_DEFAULT_AREA_PATH"),
      iterationPath: getOptionalEnv("AZDO_DEFAULT_ITERATION_PATH"),
      tags: getOptionalEnv("AZDO_DEFAULT_TAGS")
    },
    enableAttachments: (getOptionalEnv("AZDO_ENABLE_ATTACHMENTS") ?? "true").toLowerCase() !== "false"
  };
}

async function azureRequest<T>(path: string, init?: RequestInit) {
  const azure = getAzureConfig();
  const basicToken = Buffer.from(`:${azure.pat}`).toString("base64");
  const url = `https://dev.azure.com/${azure.organization}/${azure.project}${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Basic ${basicToken}`,
      Accept: "application/json",
      ...(init?.headers ?? {})
    }
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Azure DevOps request failed (${response.status}): ${responseText}`);
  }

  return JSON.parse(responseText) as T;
}

async function azureOrgRequest<T>(path: string) {
  const azure = getAzureConfig();
  const basicToken = Buffer.from(`:${azure.pat}`).toString("base64");
  const url = `https://dev.azure.com/${azure.organization}${path}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${basicToken}`,
      Accept: "application/json"
    }
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Azure DevOps request failed (${response.status}): ${responseText}`);
  }

  return JSON.parse(responseText) as T;
}

async function uploadAzureAttachment(file: { name: string; type: string; contentBase64?: string }) {
  if (!file.contentBase64) {
    throw new Error(`Arquivo ${file.name} sem conteudo para upload`);
  }

  const azure = getAzureConfig();
  const basicToken = Buffer.from(`:${azure.pat}`).toString("base64");
  const url = `https://dev.azure.com/${azure.organization}/${azure.project}/_apis/wit/attachments?fileName=${encodeURIComponent(file.name)}&api-version=7.1`;

  const binaryContent = Buffer.from(file.contentBase64, "base64");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicToken}`,
      "Content-Type": "application/octet-stream",
      Accept: "application/json"
    },
    body: binaryContent
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Falha ao subir anexo ${file.name} (${response.status}): ${responseText}`);
  }

  const data = JSON.parse(responseText) as { url: string };

  if (!data.url) {
    throw new Error(`Azure nao retornou URL do anexo ${file.name}`);
  }

  return data.url;
}

async function attachFileToWorkItem(workItemId: number, fileName: string, attachmentUrl: string) {
  await azureRequest<AzureWorkItem>(
    `/_apis/wit/workitems/${workItemId}?api-version=7.1`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json-patch+json"
      },
      body: JSON.stringify([
        {
          op: "add",
          path: "/relations/-",
          value: {
            rel: "AttachedFile",
            url: attachmentUrl,
            attributes: {
              comment: `Anexo enviado via BuGO: ${fileName}`
            }
          }
        }
      ])
    }
  );
}
type UploadedAttachment = {
  name: string;
  type: string;
  url: string;
};

async function attachPayloadFilesToWorkItem(workItemId: number, payload: WorkItemPayload, azure: AzureConfig) {
  const uploaded: UploadedAttachment[] = [];

  if (!azure.enableAttachments || payload.attachments.length === 0) {
    return uploaded;
  }

  for (const file of payload.attachments) {
    if (!file.contentBase64) {
      continue;
    }

    const attachmentUrl = await uploadAzureAttachment(file);
    await attachFileToWorkItem(workItemId, file.name, attachmentUrl);
    uploaded.push({
      name: file.name,
      type: file.type,
      url: attachmentUrl
    });
  }

  return uploaded;
}
function addOperation(operations: AzurePatchOperation[], fieldName: string | undefined, value: string | undefined) {
  if (!fieldName || !value) {
    return;
  }

  operations.push({
    op: "add",
    path: `/fields/${fieldName}`,
    value
  });
}

function createTitle(payload: WorkItemPayload) {
  const normalizedTags = payload.titleTag
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => `[${tag}]`)
    .join("");

  return `${normalizedTags}${normalizedTags ? " " : ""}${payload.titleText.trim()}`;
}

function formatBddStep(step: string) {
  const trimmed = step.trim();
  const normalized = trimmed.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const match = normalized.match(/^(quando|e|entao)\b\s*(.*)$/i);

  if (!match) {
    return trimmed;
  }

  const keywordRaw = match[1].toLowerCase();
  const keyword = keywordRaw.startsWith("ent") ? "Ent�o" : keywordRaw === "e" ? "E" : "Quando";
  const tail = match[2]?.trim() ?? "";

  return `${keyword}${tail ? ` ${tail}` : ""}`;
}

function createSystemInfoText(payload: WorkItemPayload) {
  return payload.systemInfo
    .map((item) => {
      const categoryLabel =
        item.category === "browser"
          ? "Browser"
          : item.category === "desktop"
            ? "Desktop OS"
            : "Mobile";

      const suffix = [item.version, item.detail].filter(Boolean).join(" / ");
      return `${categoryLabel} - ${item.name}${suffix ? ` ${suffix}` : ""}`;
    })
    .join("\n");
}

function createDescription(payload: WorkItemPayload) {
  return payload.description.trim();
}

function createReproStepsHtml(payload: WorkItemPayload) {
  const steps = payload.steps
    .map((step) => step.trim())
    .filter(Boolean)
    .map((step, index) => `${index + 1}. ${formatBddStep(step)}`);

  return steps.join("<br/>");
}

function createSystemInfoHtml(payload: WorkItemPayload) {
  const systemInfoText = createSystemInfoText(payload).trim();
  return systemInfoText ? escapeHtml(systemInfoText).replaceAll("\n", "<br/>") : "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildDescriptionWithAttachments(baseDescription: string, uploadedAttachments: UploadedAttachment[]) {
  if (uploadedAttachments.length === 0) {
    return baseDescription;
  }

  const htmlParts: string[] = [];

  const escapedBase = escapeHtml(baseDescription).replaceAll("\n", "<br>");
  htmlParts.push(`<p>${escapedBase}</p>`);
  htmlParts.push("<hr>");
  htmlParts.push("<p><strong>-- Anexos --</strong></p>");

  for (const attachment of uploadedAttachments) {
    if (attachment.type.startsWith("image/")) {
     htmlParts.push(`<p><img src="${attachment.url}" alt="${escapeHtml(attachment.name)}" style="max-width:100%;height:auto;" /></p>`);
      continue;
    }

    if (attachment.type.startsWith("video/")) {
      htmlParts.push(`<p><a href="${attachment.url}" target="_blank" rel="noopener noreferrer">Segue video ${escapeHtml(attachment.name)}</a></p>`);
      continue;
    }

    htmlParts.push(`<p><a href="${attachment.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(attachment.name)}</a></p>`);
  }

  return htmlParts.join("");
}

async function updateDescriptionWithAttachmentLinks(
  workItemId: number,
  descriptionField: string,
  descriptionWithAttachments: string
) {
  await azureRequest<AzureWorkItem>(
    `/_apis/wit/workitems/${workItemId}?api-version=7.1`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json-patch+json"
      },
      body: JSON.stringify([
        {
          op: "add",
          path: `/fields/${descriptionField}`,
          value: descriptionWithAttachments
        }
      ])
    }
  );
}

function getParentIdFromRelations(workItem: AzureWorkItem) {
  const relation = workItem.relations?.find((item) => item.rel === "System.LinkTypes.Hierarchy-Reverse");
  const idText = relation?.url?.split("/").pop();
  const id = idText ? Number(idText) : Number.NaN;

  return Number.isFinite(id) ? id : undefined;
}

async function runWiql(query: string) {
  return azureRequest<{ workItems: Array<{ id: number }> }>(
    "/_apis/wit/wiql?api-version=7.1",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    }
  );
}

async function listWorkItems(ids: number[]) {
  if (ids.length === 0) {
    return [] as AzureWorkItem[];
  }

  const chunks: AzureWorkItem[] = [];

  for (let index = 0; index < ids.length; index += 200) {
    const batch = ids.slice(index, index + 200);
    const response = await azureRequest<{ value: AzureWorkItem[] }>(
      `/_apis/wit/workitems?ids=${batch.join(",")}&$expand=relations&api-version=7.1`
    );
    chunks.push(...response.value);
  }

  return chunks;
}

export async function getAzureTrackingData(): Promise<AzureSyncResponse> {
  const [workItemTypes, hierarchyQuery] = await Promise.all([
    azureRequest<{ value: Array<{ name: string; referenceName?: string; color?: string }> }>(
      "/_apis/wit/workitemtypes?api-version=7.1"
    ),
    runWiql(`
      SELECT [System.Id]
      FROM WorkItems
      WHERE
        [System.TeamProject] = @project
        AND [System.WorkItemType] IN ('Epic', 'Feature', 'Product Backlog Item', 'User Story', 'Issue', 'Task', 'Bug')
      ORDER BY [System.ChangedDate] DESC
    `)
  ]);

  const ids = hierarchyQuery.workItems.map((item) => item.id);
  const items = await listWorkItems(ids);

  const normalized: AzureHierarchyItem[] = items.map((item) => ({
    id: item.id,
    title: String(item.fields?.["System.Title"] ?? `#${item.id}`),
    workItemType: String(item.fields?.["System.WorkItemType"] ?? ""),
    state: String(item.fields?.["System.State"] ?? ""),
    parentId: getParentIdFromRelations(item)
  }));

  const epicMap = new Map<number, AzureSyncResponse["epics"][number]>();

  for (const item of normalized.filter((current) => current.workItemType === "Epic")) {
    epicMap.set(item.id, {
      id: item.id,
      title: item.title,
      state: item.state,
      features: []
    });
  }

  const byId = new Map(normalized.map((item) => [item.id, item]));

  const featureToEpic = new Map<number, number>();

  for (const item of normalized.filter((current) => current.workItemType === "Feature")) {
    const epicId = item.parentId;

    if (!epicId || !epicMap.has(epicId)) {
      continue;
    }

    epicMap.get(epicId)?.features.push({
      id: item.id,
      title: item.title,
      workItemType: item.workItemType,
      state: item.state,
      children: []
    });
    featureToEpic.set(item.id, epicId);
  }

  const parentCandidateTypes = new Set(["Product Backlog Item", "User Story", "Issue"]);

  for (const item of normalized.filter((current) => parentCandidateTypes.has(current.workItemType))) {
    const featureId = item.parentId;

    if (!featureId) {
      continue;
    }

    const epicId = featureToEpic.get(featureId);

    if (!epicId) {
      continue;
    }

    const feature = epicMap.get(epicId)?.features.find((current) => current.id === featureId);

    feature?.children.push({
      id: item.id,
      title: item.title,
      workItemType: item.workItemType,
      state: item.state
    });
  }

  return {
    workItemTypes: workItemTypes.value,
    epics: [...epicMap.values()].sort((left, right) => left.title.localeCompare(right.title)),
    flatItems: normalized
  };
}

export async function getAzureEpicChildren(epicId: number) {
  const tracking = await getAzureTrackingData();
  const epic = tracking.epics.find((item) => item.id === epicId);

  if (!epic) {
    throw new Error(`Epic ${epicId} not found`);
  }

  return epic;
}

export async function getAzureWorkItemSummary(id: number): Promise<AzureWorkItemSummary> {
  const response = await azureRequest<AzureWorkItem>(
    `/_apis/wit/workitems/${id}?$expand=relations&api-version=7.1`
  );

  return {
    id: response.id,
    title: String(response.fields?.["System.Title"] ?? `#${response.id}`),
    workItemType: String(response.fields?.["System.WorkItemType"] ?? ""),
    state: String(response.fields?.["System.State"] ?? ""),
    parentId: getParentIdFromRelations(response)
  };
}

export async function createAzureWorkItem(rawPayload: unknown) {
  const payload = workItemPayloadSchema.parse(rawPayload);
  const azure = getAzureConfig();
  const operations: AzurePatchOperation[] = [];
  const areaOptions = await getAzureAreaOptions();
  const resolvedAreaPath = resolveAreaPath(payload.areaPath || azure.defaults.areaPath, azure.project, areaOptions);

  if (!resolvedAreaPath) {
    const attemptedArea = stripAreaSegment(normalizeAreaPath(payload.areaPath || azure.defaults.areaPath, azure.project));
    throw new Error(`Area invalida para o projeto ${azure.project}: ${attemptedArea || "(vazia)"}. Use exatamente um value de /api/form-config.areaOptions.`);
  }
  const title = createTitle(payload);
  const description = createDescription(payload);
  const systemInfoText = createSystemInfoHtml(payload);
  const stepsText = createReproStepsHtml(payload);
  const acceptanceCriteriaText = payload.acceptanceCriteria
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+\.\s*/, "").trim())
    .filter(Boolean)
    .map((line, index) => `${index + 1}. ${line}`)
    .join("<br/>");

  addOperation(operations, azure.fields.title, title);
  addOperation(operations, azure.fields.description, description);
  addOperation(operations, azure.fields.acceptanceCriteria, acceptanceCriteriaText);
  addOperation(operations, azure.fields.reproSteps, stepsText);

  if (azure.fields.steps && azure.fields.steps !== azure.fields.reproSteps) {
    addOperation(operations, azure.fields.steps, stepsText);
  }
  addOperation(operations, azure.fields.sendBy, payload.sendBy);
  addOperation(operations, azure.fields.priority, payload.priority);
  addOperation(operations, azure.fields.severity, payload.severity);
  addOperation(operations, azure.fields.activity, payload.activity);
  addOperation(operations, azure.fields.processPhase, payload.processPhase);
  addOperation(operations, azure.fields.valueArea, payload.valueArea);
  addOperation(operations, azure.fields.systemInfo, systemInfoText);
  addOperation(operations, azure.fields.areaPath, resolvedAreaPath);
  addOperation(operations, azure.fields.iterationPath, azure.defaults.iterationPath);

  const hierarchyParentId = payload.kind === "task" ? payload.parentId : payload.featureId;

  if (!hierarchyParentId) {
    throw new Error("Missing hierarchy parent id for work item creation");
  }

  operations.push({
    op: "add",
    path: "/relations/-",
    value: {
      rel: "System.LinkTypes.Hierarchy-Reverse",
      url: `https://dev.azure.com/${azure.organization}/_apis/wit/workItems/${hierarchyParentId}`
    }
  });

  const workItemType = encodeURIComponent(azure.workItemTypes[payload.kind]);
  const basicToken = Buffer.from(`:${azure.pat}`).toString("base64");
  const url = `https://dev.azure.com/${azure.organization}/${azure.project}/_apis/wit/workitems/$${workItemType}?api-version=7.1`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicToken}`,
      "Content-Type": "application/json-patch+json",
      Accept: "application/json"
    },
    body: JSON.stringify(operations)
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Azure DevOps request failed (${response.status}) [areaPath=${resolvedAreaPath} project=${azure.project}]: ${responseText}`);
  }

  const createdWorkItem = JSON.parse(responseText) as {
    id: number;
    url: string;
    _links?: {
      html?: {
        href: string;
      };
    };
    fields?: Record<string, unknown>;
  };

  const uploadedAttachments = await attachPayloadFilesToWorkItem(createdWorkItem.id, payload, azure);

  if (uploadedAttachments.length > 0) {
    const descriptionWithAttachments = buildDescriptionWithAttachments(description, uploadedAttachments);
    await updateDescriptionWithAttachmentLinks(createdWorkItem.id, azure.fields.description, descriptionWithAttachments);
  }

  return createdWorkItem;
}

export async function getAzureRelationTypes() {
  return azureOrgRequest<{ value: Array<{ referenceName: string; name: string }> }>(
    "/_apis/wit/workitemrelationtypes?api-version=7.1"
  );
}



export async function getAzureAreaOptions() {
  const root = await azureRequest<AzureAreaNode>(
    "/_apis/wit/classificationnodes/areas?$depth=2&api-version=7.1"
  );

  const options: Array<{ value: string; label: string }> = [];

  const walk = (node: AzureAreaNode) => {
    const normalizedPath = normalizeAreaPath(node.path ?? `${root.name}\\${node.name}`, root.name);

    if (normalizedPath && normalizedPath !== root.name) {
      options.push({
        value: normalizedPath,
        label: normalizedPath.split("\\").pop() ?? node.name
      });
    }

    for (const child of node.children ?? []) {
      walk(child);
    }
  };

  for (const child of root.children ?? []) {
    walk(child);
  }

  const deduped = Array.from(new Map(options.map((option) => [option.value.toLowerCase(), option])).values());

  deduped.sort((left, right) => left.label.localeCompare(right.label));

  return deduped;
}

export async function getAzureFieldMap() {
  const azure = getAzureConfig();

  const bugTypeName = azure.workItemTypes.bug;
  const pbiTypeName = azure.workItemTypes.issue;

  const [bugFieldsResponse, pbiFieldsResponse] = await Promise.all([
    azureRequest<{ value: Array<{ name: string; referenceName: string; type?: string; isIdentity?: boolean; readOnly?: boolean }> }>(
      `/_apis/wit/workitemtypes/${encodeURIComponent(bugTypeName)}/fields?api-version=7.1`
    ),
    azureRequest<{ value: Array<{ name: string; referenceName: string; type?: string; isIdentity?: boolean; readOnly?: boolean }> }>(
      `/_apis/wit/workitemtypes/${encodeURIComponent(pbiTypeName)}/fields?api-version=7.1`
    )
  ]);

  return {
    project: azure.project,
    workItemTypes: {
      bug: bugTypeName,
      pbi: pbiTypeName
    },
    configuredFieldMap: azure.fields,
    bugFields: bugFieldsResponse.value,
    pbiFields: pbiFieldsResponse.value
  };
}
export async function validateAzurePat() {
  const azure = getAzureConfig();

  await azureRequest<{ value: Array<{ name: string }> }>(
    "/_apis/wit/workitemtypes?api-version=7.1"
  );

  return {
    ok: true,
    organization: azure.organization,
    project: azure.project,
    checkedAt: new Date().toISOString()
  };
}



























