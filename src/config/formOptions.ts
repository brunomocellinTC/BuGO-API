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

const peopleOptions: FieldOption[] = [
  { value: "Ana Carolina Rodrigues da Rocha", label: "Ana Carolina Rodrigues da Rocha" },
  { value: "Bruno Martins da Cruz", label: "Bruno Martins da Cruz" },
  { value: "Bruno Mocellin", label: "Bruno Mocellin" },
  { value: "Cristiano Baumgartner", label: "Cristiano Baumgartner" },
  { value: "Diego Alves Vianna", label: "Diego Alves Vianna" },
  { value: "Jaqueline Ferst", label: "Jaqueline Ferst" },
  { value: "Joana Faller", label: "Joana Faller" },
  { value: "Joilson de Oliveira Telles", label: "Joilson de Oliveira Telles" },
  { value: "Jonathan Klauck", label: "Jonathan Klauck" },
  { value: "Keila Soeiro", label: "Keila Soeiro" },
  { value: "Lilian Beatriz Jochims", label: "Lilian Beatriz Jochims" },
  { value: "Luana Kunrath", label: "Luana Kunrath" },
  { value: "Lucas Ricardo Graeff", label: "Lucas Ricardo Graeff" },
  { value: "Mateus Arthur da Silva de Freitas", label: "Mateus Arthur da Silva de Freitas" },
  { value: "Matheus Montoanelli de Souza", label: "Matheus Montoanelli de Souza" },
  { value: "Matheus Winck Maisonette Duarte", label: "Matheus Winck Maisonette Duarte" },
  { value: "Rafael Geroldi Teixeira", label: "Rafael Geroldi Teixeira" },
  { value: "Vinicius Coelho", label: "Vinicius Coelho" },
  { value: "Wellington Antunes Voltz", label: "Wellington Antunes Voltz" },
  { value: "William Deivid Pires", label: "William Deivid Pires" },
];

export const formConfig: FormConfig = {
  title: "BuGO",
  description: "Abra Bugs, Issues e Tasks com destino sincronizado no Azure DevOps.",
  basePath: "ti-testingcompany/Inovação",
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

  people: peopleOptions,
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
      id: "sendBy",
      label: "Enviado por",
      type: "select",
      options: peopleOptions
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
        { value: "Deployment", label: "Deployment" },
        { value: "Design", label: "Design" },
        { value: "Development", label: "Development" },
        { value: "Documentation", label: "Documentation" },
        { value: "Requirements", label: "Requirements" },
        { value: "Testing", label: "Testing" },
      ]
    },
    {
      id: "processPhase",
      label: "Process Phase",
      type: "select",
      defaultValue: "Staging",
      options: [
        { value: "Develop", label: "Develop" },
        { value: "Production", label: "Production" },
        { value: "Staging", label: "Staging" },
        { value: "Test", label: "Test" },
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
      id: "sendBy",
      label: "Enviado por",
      type: "select",
      options: peopleOptions
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
      id: "media",
      label: "Anexos, imagens e videos",
      type: "media"
    }
  ],
  taskFields: [
    {
      id: "sendBy",
      label: "Enviado por",
      type: "select",
      options: peopleOptions
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
      defaultValue: "Develop",
      options: [
        { value: "Develop", label: "Develop" },
        { value: "Production", label: "Production" },
        { value: "Staging", label: "Staging" },
        { value: "Test", label: "Test" }
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
