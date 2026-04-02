import { z } from "zod";

export const workItemPayloadSchema = z.object({
  kind: z.enum(["bug", "issue", "task"]),
  epicId: z.string().trim().min(1),
  featureId: z.string().trim().min(1),
  parentId: z.string().trim().optional().default(""),
  titleTag: z.string().trim().min(1),
  titleText: z.string().trim().min(1),
  madeBy: z.string().trim().min(1),
  description: z.string().trim().min(1),
  acceptanceCriteria: z.string().trim().optional().default(""),
  priority: z.string().trim().optional().default(""),
  severity: z.string().trim().optional().default(""),
  activity: z.string().trim().optional().default(""),
  processPhase: z.string().trim().optional().default(""),
  valueArea: z.string().trim().optional().default(""),
  requesterName: z.string().trim().min(1),
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
      size: z.number().nonnegative()
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
    requesterName?: string;
    madeBy?: string;
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
      requesterName: getOptionalEnv("AZDO_FIELD_REQUESTER_NAME"),
      madeBy: getOptionalEnv("AZDO_FIELD_MADE_BY"),
      priority: getOptionalEnv("AZDO_FIELD_PRIORITY"),
      severity: getOptionalEnv("AZDO_FIELD_SEVERITY"),
      activity: getOptionalEnv("AZDO_FIELD_ACTIVITY"),
      processPhase: getOptionalEnv("AZDO_FIELD_PROCESS_PHASE"),
      valueArea: getOptionalEnv("AZDO_FIELD_VALUE_AREA"),
      systemInfo: getOptionalEnv("AZDO_FIELD_SYSTEM_INFO"),
      areaPath: "System.AreaPath",
      iterationPath: "System.IterationPath",
      tags: "System.Tags"
    },
    defaults: {
      areaPath: getOptionalEnv("AZDO_DEFAULT_AREA_PATH"),
      iterationPath: getOptionalEnv("AZDO_DEFAULT_ITERATION_PATH"),
      tags: getOptionalEnv("AZDO_DEFAULT_TAGS")
    }
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
  return `[${payload.titleTag}] ${payload.titleText}`;
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
  const systemInfoText = createSystemInfoText(payload);
  const stepsText = payload.steps.length > 0
    ? ["Steps:", ...payload.steps.map((step, index) => `${index + 1}. ${step}`)].join("\n")
    : undefined;
  const videoNames = payload.attachments
    .filter((file) => file.type.startsWith("video/"))
    .map((file) => file.name);
  const attachmentsText = payload.attachments.length > 0
    ? ["Arquivos selecionados:", ...payload.attachments.map((file) => `- ${file.name} (${file.type || "file"})`)].join("\n")
    : undefined;

  const sections = [
    payload.description ? `Description:\n${payload.description}` : undefined,
    `Epic ID: ${payload.epicId}`,
    `Feature ID: ${payload.featureId}`,
    payload.parentId ? `Parent ID: ${payload.parentId}` : undefined,
    `Nome: ${payload.requesterName}`,
    `Made By: ${payload.madeBy}`,
    payload.priority ? `Priority: ${payload.priority}` : undefined,
    payload.severity ? `Severity: ${payload.severity}` : undefined,
    payload.activity ? `Activity: ${payload.activity}` : undefined,
    payload.processPhase ? `Process Phase: ${payload.processPhase}` : undefined,
    payload.valueArea ? `Value Area: ${payload.valueArea}` : undefined,
    systemInfoText ? `System Info:\n${systemInfoText}` : undefined,
    stepsText,
    videoNames.length > 0 ? `Segue ${videoNames.join(", ")}` : undefined,
    payload.acceptanceCriteria ? `Acceptance Criteria:\n${payload.acceptanceCriteria}` : undefined,
    attachmentsText
  ].filter(Boolean);

  return sections.join("\n\n");
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
  const title = createTitle(payload);
  const description = createDescription(payload);
  const systemInfoText = createSystemInfoText(payload);
  const stepsText = payload.steps.map((step, index) => `${index + 1}. ${step}`).join("\n");

  addOperation(operations, azure.fields.title, title);
  addOperation(operations, azure.fields.description, description);
  addOperation(operations, azure.fields.acceptanceCriteria, payload.acceptanceCriteria);
  addOperation(operations, azure.fields.reproSteps, stepsText);
  addOperation(operations, azure.fields.requesterName, payload.requesterName);
  addOperation(operations, azure.fields.madeBy, payload.madeBy);
  addOperation(operations, azure.fields.priority, payload.priority);
  addOperation(operations, azure.fields.severity, payload.severity);
  addOperation(operations, azure.fields.activity, payload.activity);
  addOperation(operations, azure.fields.processPhase, payload.processPhase);
  addOperation(operations, azure.fields.valueArea, payload.valueArea);
  addOperation(operations, azure.fields.systemInfo, systemInfoText);
  addOperation(operations, azure.fields.areaPath, azure.defaults.areaPath);
  addOperation(operations, azure.fields.iterationPath, azure.defaults.iterationPath);
  addOperation(operations, azure.fields.tags, azure.defaults.tags);

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
    throw new Error(`Azure DevOps request failed (${response.status}): ${responseText}`);
  }

  return JSON.parse(responseText) as {
    id: number;
    url: string;
    _links?: {
      html?: {
        href: string;
      };
    };
    fields?: Record<string, unknown>;
  };
}

export async function getAzureRelationTypes() {
  return azureOrgRequest<{ value: Array<{ referenceName: string; name: string }> }>(
    "/_apis/wit/workitemrelationtypes?api-version=7.1"
  );
}
