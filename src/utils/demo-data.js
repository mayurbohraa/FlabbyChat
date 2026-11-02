import { dateKey } from "./calendar.js";

// Fictional local fixtures only: no provider calls, real people or remote files.
const people = {
  alex: "Alex Morgan",
  ethan: "Ethan Brooks",
  olivia: "Olivia Parker",
  sophie: "Sophie Bennett",
};

function day(now, offset) {
  const date = new Date(now);
  date.setDate(date.getDate() + offset);
  return dateKey(date);
}

// A complete one-page PDF keeps preview/download available without a network.
function briefPdf(title) {
  const content = `BT /F1 22 Tf 50 740 Td (${title.replace(/\.pdf$/, "")}) Tj /F1 12 Tf 0 -35 Td (A fictional workspace for exploring the demo.) Tj 0 -25 Td (Goal: plan the work, review ideas and share progress.) Tj 0 -25 Td (Next steps: agree on tasks, prepare materials and review together.) Tj 0 -25 Td (All people, messages and project details are sample data.) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => String(offset).padStart(10, "0") + " 00000 n \n")
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return { url: "data:application/pdf;base64," + btoa(pdf), size: pdf.length };
}

const colorStudy = {
  url: "data:image/png;base64,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",
  size: 1791,
};

function file(id, name, folderId, createdBy, now) {
  return {
    id,
    name,
    folderId,
    createdBy,
    createdAt: now - 86400000,
    kind: "pdf",
    ...briefPdf(name),
  };
}

function members(ids, now) {
  return Object.fromEntries(
    ids.map((id) => [
      id,
      {
        id,
        name: people[id],
        status: "active",
        joinedAt: now - 604800000,
      },
    ]),
  );
}

export function sampleWorkspace(now) {
  const task = (
    id,
    title,
    assignee,
    status,
    offset,
    priority,
    workspaceId,
  ) => ({
    id,
    title,
    assignee,
    status,
    due: day(now, offset),
    priority,
    workspaceId,
    description:
      "Review the brief, complete the work and share an update with the team.",
    createdBy: "alex",
    createdAt: now - 172800000,
    updatedAt: now - 3600000,
  });
  const event = (id, title, offset, time, workspaceId) => ({
    id,
    title,
    date: day(now, offset),
    time,
    workspaceId,
    description:
      "Review progress, discuss open questions and agree on next steps.",
    createdBy: "olivia",
    createdAt: now - 86400000,
  });
  return {
    teams: {
      harbor: {
        id: "harbor",
        name: "Harbor Studio",
        owner: "alex",
        createdAt: now - 604800000,
        members: members(["alex", "ethan", "olivia"], now),
        workspaces: {
          website: {
            id: "website",
            name: "Website refresh",
            description:
              "A friendly new website for a fictional creative studio.",
            createdBy: "alex",
            createdAt: now - 604800000,
          },
          launch: {
            id: "launch",
            name: "Launch planning",
            description: "Prepare content and coordinate the release.",
            createdBy: "alex",
            createdAt: now - 432000000,
          },
        },
        tasks: {
          outline: task(
            "outline",
            "Review the homepage outline",
            "alex",
            "To do",
            0,
            "High",
            "website",
          ),
          prototype: task(
            "prototype",
            "Build the contact form",
            "ethan",
            "In progress",
            2,
            "Medium",
            "website",
          ),
          copy: task(
            "copy",
            "Write the welcome copy",
            "olivia",
            "Done",
            -1,
            "Medium",
            "website",
          ),
          mobile: task(
            "mobile",
            "Check the mobile layout",
            "alex",
            "In progress",
            1,
            "High",
            "website",
          ),
          checklist: task(
            "checklist",
            "Prepare the launch checklist",
            "alex",
            "To do",
            4,
            "Low",
            "launch",
          ),
        },
        events: {
          review: event("review", "Design review", 0, "15:00", "website"),
          planning: event("planning", "Launch planning", 3, "10:30", "launch"),
          handoff: event("handoff", "Content handoff", 7, "14:00", "website"),
        },
        topics: {
          ideas: {
            id: "ideas",
            title: "What should the homepage highlight?",
            body: "I suggest a short introduction, recent work and one clear contact action. What would you add?",
            workspaceId: "website",
            createdBy: "olivia",
            name: people.olivia,
            createdAt: now - 7200000,
            replies: {
              response: {
                id: "response",
                text: "A small customer story would give it a personal touch.",
                name: people.ethan,
                createdBy: "ethan",
                createdAt: now - 5400000,
              },
              agreement: {
                id: "agreement",
                text: "Agreed. I will include that in the next outline.",
                name: people.alex,
                createdBy: "alex",
                createdAt: now - 3600000,
              },
            },
          },
          release: {
            id: "release",
            title: "Release checklist",
            body: "Please add your final checks here before the launch review.",
            workspaceId: "launch",
            createdBy: "alex",
            name: people.alex,
            createdAt: now - 86400000,
          },
        },
        folders: {
          briefs: {
            id: "briefs",
            name: "Project briefs",
            createdAt: now - 604800000,
            createdBy: "alex",
          },
        },
        files: {
          studioBrief: file(
            "studioBrief",
            "Studio project brief.pdf",
            "briefs",
            "olivia",
            now,
          ),
        },
      },
      meadow: {
        id: "meadow",
        name: "Meadow Collective",
        owner: "sophie",
        createdAt: now - 432000000,
        members: members(["alex", "sophie", "ethan"], now),
        workspaces: {
          workshop: {
            id: "workshop",
            name: "Community workshop",
            description: "Plan a fictional weekend design workshop.",
            createdBy: "sophie",
            createdAt: now - 432000000,
          },
        },
        tasks: {
          agenda: task(
            "agenda",
            "Draft the workshop agenda",
            "sophie",
            "Done",
            -2,
            "Medium",
            "workshop",
          ),
          materials: task(
            "materials",
            "Prepare the activity notes",
            "alex",
            "To do",
            5,
            "Medium",
            "workshop",
          ),
          registration: task(
            "registration",
            "Test the registration page",
            "ethan",
            "In progress",
            3,
            "High",
            "workshop",
          ),
        },
        events: {
          workshop: event(
            "workshop",
            "Workshop rehearsal",
            5,
            "11:00",
            "workshop",
          ),
        },
        topics: {
          supplies: {
            id: "supplies",
            title: "Workshop materials",
            body: "The activity notes are ready for review. Please share any ideas for the opening session.",
            workspaceId: "workshop",
            createdBy: "sophie",
            name: people.sophie,
            createdAt: now - 18000000,
          },
        },
        folders: {
          planning: {
            id: "planning",
            name: "Planning",
            createdBy: "sophie",
            createdAt: now - 432000000,
          },
        },
        files: {
          workshopBrief: file(
            "workshopBrief",
            "Workshop planning brief.pdf",
            "planning",
            "sophie",
            now,
          ),
        },
      },
    },
    library: {
      folders: {
        notes: {
          id: "notes",
          name: "My notes",
          createdBy: "alex",
          createdAt: now - 172800000,
        },
        references: {
          id: "references",
          name: "References",
          createdBy: "alex",
          createdAt: now - 86400000,
        },
      },
      files: {
        palette: {
          id: "palette",
          name: "Color study.png",
          folderId: "references",
          kind: "image",
          createdBy: "alex",
          createdAt: now - 86400000,
          ...colorStudy,
        },
        personalBrief: file(
          "personalBrief",
          "My project notes.pdf",
          "notes",
          "alex",
          now,
        ),
        referenceBrief: file(
          "referenceBrief",
          "Reference brief.pdf",
          "references",
          "alex",
          now,
        ),
      },
    },
    preferences: {
      favorites: { project: true },
      lastRead: {},
      notificationRead: {},
      settings: {
        chatLayout: "bubbles",
        timeFormat: "12",
        callSound: false,
        browserNotifications: false,
      },
    },
    // Other fictional people stay offline; the demo never simulates live users.
    presence: {},
  };
}

export function sampleMessages(now) {
  const message = (id, channel, userId, text, minutes, extra = {}) => ({
    id,
    channel,
    userId,
    name: people[userId],
    text,
    createdAt: now - minutes * 60000,
    ...extra,
  });
  return {
    paletteShare: message(
      "paletteShare",
      "project",
      "alex",
      "A few colors to explore for the studio website.",
      28,
      { attachment: { name: "Color study.png", kind: "image", ...colorStudy } },
    ),
    projectUpdate: message(
      "projectUpdate",
      "project",
      "olivia",
      "The first content draft is ready. Could someone review the introduction?",
      50,
    ),
    projectReply: message(
      "projectReply",
      "project",
      "alex",
      "I will take a look before the design review.",
      40,
    ),
    briefShare: message(
      "briefShare",
      "project",
      "ethan",
      "Here is the brief for reference.",
      30,
      { attachment: file("chatBrief", "Website brief.pdf", "", "ethan", now) },
    ),
    directHello: message(
      "directHello",
      "dm-alex--ethan",
      "ethan",
      "Hi Alex! The contact form is ready for a quick review.",
      25,
      { recipient: "alex" },
    ),
    directReply: message(
      "directReply",
      "dm-alex--ethan",
      "alex",
      "Thanks, Ethan. I will check the mobile view too.",
      20,
      { recipient: "ethan" },
    ),
    sampleCall: message(
      "sampleCall",
      "dm-alex--ethan",
      "ethan",
      "Voice call · completed",
      15,
      {
        recipient: "alex",
        kind: "call",
        call: {
          id: "sampleCall",
          caller: "ethan",
          receiver: "alex",
          callerName: people.ethan,
          receiverName: people.alex,
          video: false,
          outcome: "completed",
          createdAt: now - 900000,
          connectedAt: now - 890000,
          endedAt: now - 710000,
          duration: 180,
        },
      },
    ),
    oliviaNote: message(
      "oliviaNote",
      "dm-alex--olivia",
      "olivia",
      "I added the project brief to the team library. Let me know if anything is missing.",
      35,
      { recipient: "alex" },
    ),
    sophieNote: message(
      "sophieNote",
      "dm-alex--sophie",
      "sophie",
      "Would you like to review the workshop agenda this week?",
      45,
      { recipient: "alex" },
    ),
  };
}
