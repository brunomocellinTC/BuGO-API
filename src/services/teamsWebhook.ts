type TeamsCardPayload = {
  title: string;

  workItemId: number;

  workItemType: string;

  workItemUrl: string;

  epicName: string;

  featureName: string;

  parentName: string;

  areaPath?: string;

  sendBy: string;

  createdUtc: string;
};

function getProfileImage(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=0D8ABC&color=fff`;
}

function getTypeVisual(type: string) {
  const normalized = type.toLowerCase();

  if (normalized === "bug") {
    return {
      icon: "🐞",
      label: "🐞 Bug"
    };
  }

  if (
    normalized === "issue" ||
    normalized === "pbi"
  ) {
    return {
      icon: "📘",
      label: "📘 PBI"
    };
  }

  if (normalized === "task") {
    return {
      icon: "📋",
      label: "📋 Task"
    };
  }

  return {
    icon: "📌",
    label: `📌 ${type}`
  };
}

function getAreaLabel(areaPath?: string) {
  if (!areaPath) {
    return "-";
  }

  const parts = areaPath
    .split("\\")
    .filter(Boolean);

  return parts[parts.length - 1] || "-";
}

export async function sendTeamsWorkItemCard(
  payload: TeamsCardPayload
) {
  const webhookUrl =
    process.env.TEAMS_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error(
      "TEAMS_WEBHOOK_URL não configurado"
    );
  }

  const typeVisual =
    getTypeVisual(
      payload.workItemType
    );

  const adaptiveCard = {
    type: "message",

    attachments: [
      {
        contentType:
          "application/vnd.microsoft.card.adaptive",

        content: {
          type: "AdaptiveCard",

          $schema:
            "http://adaptivecards.io/schemas/adaptive-card.json",

          version: "1.5",

          body: [
            {
              type: "TextBlock",

              text: payload.title,

              wrap: true,

              size: "Medium",

              weight: "Bolder",

              spacing: "Medium"
            },

            {
              type: "ColumnSet",

              spacing: "Medium",

              columns: [
                {
                  type: "Column",

                  width: "auto",

                  items: [
                    {
                      type: "Image",

                      url: getProfileImage(
                        payload.sendBy
                      ),

                      size: "Small",

                      style: "Person",

                      altText:
                        payload.sendBy
                    }
                  ]
                },

                {
                  type: "Column",

                  width: "stretch",

                  items: [
                    {
                      type: "TextBlock",

                      text:
                        payload.sendBy,

                      weight: "Bolder",

                      wrap: true
                    },

                    {
                      type: "TextBlock",

                      text: `Criado em ${new Date(
                        payload.createdUtc
                      ).toLocaleString(
                        "pt-BR"
                      )}`,

                      isSubtle: true,

                      spacing: "None",

                      wrap: true
                    }
                  ]
                }
              ]
            },

            {
              type: "FactSet",

              spacing: "Large",

              facts: [
                {
                  title: "ID",
                  value: `🆔 ${payload.workItemId}`
                },

                {
                  title: "Tipo",
                  value: typeVisual.label
                },

                {
                  title: "Epic",
                  value:
                    payload.epicName
                      ? `👑 ${payload.epicName}`
                      : "-"
                },

                {
                  title: "Feature",
                  value:
                    payload.featureName
                      ? `🏆 ${payload.featureName}`
                      : "-"
                },

                {
                  title: "Area",
                  value:
                    payload.areaPath
                      ? `📍${getAreaLabel(payload.areaPath)}`
                      : "-"
                }
              ]
            }
          ],

          actions: [
            {
              type:
                "Action.OpenUrl",

              title:
                "🔎 Abrir no Azure DevOps",

              url:
                payload.workItemUrl
            }
          ]
        }
      }
    ]
  };

  const response =
    await fetch(
      webhookUrl,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify(
          adaptiveCard
        )
      }
    );

  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Webhook Teams falhou (${response.status}): ${text}`
    );
  }
}
