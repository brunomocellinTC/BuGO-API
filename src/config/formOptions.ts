export type WorkItemKind = "bug" | "issue" | "task";

export type FieldOption = {
  value: string;
  label: string;
};

export type FormFieldConfig = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "steps" | "media" | "systemInfo";
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  options?: FieldOption[];
};

export type FormConfig = {
  title: string;
  description: string;
  basePath: string;
  kinds: Array<{
    id: WorkItemKind;
    label: string;
    accent: string;
    workItemType: string;
  }>;
  titleTags: FieldOption[];
  people: FieldOption[];
  browsers: FieldOption[];
  desktopPlatforms: FieldOption[];
  mobilePlatforms: FieldOption[];
  bugFields: FormFieldConfig[];
  issueFields: FormFieldConfig[];
  taskFields: FormFieldConfig[];
};

export const formConfig: FormConfig = {
  title: "BuGO",
  description: "Abra Bugs, Issues e Tasks com destino sincronizado no Azure DevOps.",
  basePath: "ti-testingcompany / Inovacao",
  kinds: [
    {
      id: "bug",
      label: "Bug",
      accent: "red",
      workItemType: "Bug"
    },
    {
      id: "issue",
      label: "Issue",
      accent: "blue",
      workItemType: "Issue"
    },
    {
      id: "task",
      label: "Task",
      accent: "amber",
      workItemType: "Task"
    }
  ],
  titleTags: [
    { value: "", label: "" },
  ],
  people: [
    { value: "Bruno Mocellin", label: "Bruno Mocellin" },
    { value: "Willism Demi Pres", label: "Willism Demi Pres" },
    { value: "Joilson de Oliveira Telles", label: "Joilson de Oliveira Telles" },
    { value: "QA Team", label: "QA Team" }
  ],
  browsers: [
    { value: "Chrome", label: "Chrome" },
    { value: "Edge", label: "Edge" },
    { value: "Firefox", label: "Firefox" },
    { value: "Safari", label: "Safari" },
    { value: "Opera GX", label: "Opera GX" },
    { value: "Brave", label: "Brave" }
  ],
  desktopPlatforms: [
    { value: "Windows", label: "Windows" },
    { value: "Mac", label: "Mac" },
    { value: "Linux", label: "Linux" }
  ],
  mobilePlatforms: [
    { value: "Android", label: "Android" },
    { value: "iOS", label: "iOS" }
  ],
  bugFields: [
    {
      id: "madeBy",
      label: "Made By",
      type: "select",
      required: true,
      defaultValue: "Interno",
      options: [
        { value: "Interno", label: "Interno" },
        { value: "QA", label: "QA" },
        { value: "Suporte", label: "Suporte" }
      ]
    },
    {
      id: "description",
      label: "Description",
      type: "textarea",
      required: true,
      placeholder: "Descreva o problema e o impacto."
    },
    {
      id: "steps",
      label: "Steps",
      type: "steps"
    },
    {
      id: "systemInfo",
      label: "System Info",
      type: "systemInfo"
    },
    {
      id: "priority",
      label: "Priority",
      type: "select",
      defaultValue: "2",
      options: [
        { value: "1", label: "1" },
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4", label: "4" }
      ]
    },
    {
      id: "severity",
      label: "Severity",
      type: "select",
      defaultValue: "3 - Medium",
      options: [
        { value: "1 - Critical", label: "1 - Critical" },
        { value: "2 - High", label: "2 - High" },
        { value: "3 - Medium", label: "3 - Medium" },
        { value: "4 - Low", label: "4 - Low" }
      ]
    },
    {
      id: "activity",
      label: "Activity",
      type: "select",
      defaultValue: "Testing",
      options: [
        { value: "Development", label: "Development" },
        { value: "Testing", label: "Testing" },
        { value: "Design", label: "Design" },
        { value: "Analysis", label: "Analysis" }
      ]
    },
    {
      id: "processPhase",
      label: "Process Phase",
      type: "select",
      defaultValue: "Staging",
      options: [
        { value: "Development", label: "Development" },
        { value: "Staging", label: "Staging" },
        { value: "Production", label: "Production" }
      ]
    },
    {
      id: "requesterName",
      label: "Nome",
      type: "select",
      required: true,
      options: [
        { value: "Bruno Mocellin", label: "Bruno Mocellin" },
        { value: "Willism Demi Pres", label: "Willism Demi Pres" },
        { value: "Joilson de Oliveira Telles", label: "Joilson de Oliveira Telles" },
        { value: "QA Team", label: "QA Team" }
      ]
    },
    {
      id: "media",
      label: "Anexos, imagens e videos",
      type: "media"
    }
  ],
  issueFields: [
    {
      id: "madeBy",
      label: "Made By",
      type: "select",
      required: true,
      defaultValue: "Interno",
      options: [
        { value: "Interno", label: "Interno" },
        { value: "QA", label: "QA" },
        { value: "Suporte", label: "Suporte" }
      ]
    },
    {
      id: "description",
      label: "Description",
      type: "textarea",
      required: true,
      placeholder: "Descreva a necessidade ou melhoria."
    },
    {
      id: "acceptanceCriteria",
      label: "Acceptance Criteria",
      type: "textarea",
      placeholder: "Defina os criterios de aceite."
    },
    {
      id: "priority",
      label: "Priority",
      type: "select",
      defaultValue: "2",
      options: [
        { value: "1", label: "1" },
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4", label: "4" }
      ]
    },
    {
      id: "valueArea",
      label: "Value Area",
      type: "select",
      defaultValue: "Business",
      options: [
        { value: "Business", label: "Business" },
        { value: "Architectural", label: "Architectural" }
      ]
    },
    {
      id: "requesterName",
      label: "Nome",
      type: "select",
      required: true,
      options: [
        { value: "Bruno Mocellin", label: "Bruno Mocellin" },
        { value: "Willism Demi Pres", label: "Willism Demi Pres" },
        { value: "Joilson de Oliveira Telles", label: "Joilson de Oliveira Telles" },
        { value: "QA Team", label: "QA Team" }
      ]
    },
    {
      id: "media",
      label: "Anexos, imagens e videos",
      type: "media"
    }
  ],
  taskFields: [
    {
      id: "madeBy",
      label: "Made By",
      type: "select",
      required: true,
      defaultValue: "Interno",
      options: [
        { value: "Interno", label: "Interno" },
        { value: "QA", label: "QA" },
        { value: "Suporte", label: "Suporte" }
      ]
    },
    {
      id: "description",
      label: "Description",
      type: "textarea",
      required: true,
      placeholder: "Descreva a task e o objetivo."
    },
    {
      id: "priority",
      label: "Priority",
      type: "select",
      defaultValue: "2",
      options: [
        { value: "1", label: "1" },
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4", label: "4" }
      ]
    },
    {
      id: "activity",
      label: "Activity",
      type: "select",
      defaultValue: "Development",
      options: [
        { value: "Development", label: "Development" },
        { value: "Testing", label: "Testing" },
        { value: "Design", label: "Design" },
        { value: "Analysis", label: "Analysis" }
      ]
    },
    {
      id: "requesterName",
      label: "Nome",
      type: "select",
      required: true,
      options: [
        { value: "Bruno Mocellin", label: "Bruno Mocellin" },
        { value: "Willism Demi Pres", label: "Willism Demi Pres" },
        { value: "Joilson de Oliveira Telles", label: "Joilson de Oliveira Telles" },
        { value: "QA Team", label: "QA Team" }
      ]
    },
    {
      id: "media",
      label: "Anexos, imagens e videos",
      type: "media"
    }
  ]
};

export function createDefaultValues() {
  return [...formConfig.bugFields, ...formConfig.issueFields, ...formConfig.taskFields].reduce<Record<string, string>>(
    (accumulator, field) => {
      if (accumulator[field.id] === undefined) {
        accumulator[field.id] = field.defaultValue ?? "";
      }

      return accumulator;
    },
    {
      titleTag: formConfig.titleTags[0]?.value ?? "",
      titleText: "",
      epicId: "",
      featureId: "",
      parentId: ""
    }
  );
}
