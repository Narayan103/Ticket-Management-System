// One-off demo-data generator: creates realistic-looking sample tickets so the Tickets list
// and Analytics dashboard have something to show. Not part of the regular seed.ts flow (which
// only bootstraps the admin account) — run manually with `bun prisma/seed-demo-tickets.ts`.
import { db } from "../db";
import { Role } from "../types/role";

const TICKET_COUNT = 80;

const CUSTOMER_NAMES = [
  "Priya Sharma", "Rahul Verma", "Ananya Iyer", "Vikram Nair", "Sara Fernandes",
  "Karan Mehta", "Divya Reddy", "Arjun Kapoor", "Neha Joshi", "Rohan Gupta",
  "Ishita Malhotra", "Aditya Rao", "Meera Pillai", "Sameer Khan", "Pooja Desai",
  "Vivek Bhatt", "Tanvi Shah", "Nikhil Chawla", "Riya Sen", "Aman Tiwari",
  "Kavya Menon", "Suresh Pillai", "Anjali Kulkarni", "Yash Agarwal", "Simran Kaur",
];

type CategoryTemplate = { category: "GENERAL_QUESTION" | "TECHNICAL_QUESTION" | "REFUND_REQUEST" | null; subject: string; body: string };

const TEMPLATES: CategoryTemplate[] = [
  { category: "GENERAL_QUESTION", subject: "Question about my subscription plan", body: "Hi, I wanted to check what's included in my current plan and whether I can upgrade mid-cycle." },
  { category: "GENERAL_QUESTION", subject: "How do I change my account email?", body: "I recently changed jobs and need to update the email address on my account. What's the process?" },
  { category: "GENERAL_QUESTION", subject: "Where can I find my invoices?", body: "I need last month's invoice for expense reporting but can't find a billing history page." },
  { category: "GENERAL_QUESTION", subject: "Is there a mobile app available?", body: "Just curious if there's a mobile app, or if the web version is the only option for now." },
  { category: "TECHNICAL_QUESTION", subject: "Getting a 500 error when uploading files", body: "Every time I try to upload a file larger than 10MB I get a server error. Is this a known issue?" },
  { category: "TECHNICAL_QUESTION", subject: "Dashboard not loading in Safari", body: "The dashboard is stuck on a loading spinner in Safari but works fine in Chrome. Any fix?" },
  { category: "TECHNICAL_QUESTION", subject: "API returning stale data", body: "Our integration is pulling data via the API but it seems to be a few hours out of date consistently." },
  { category: "TECHNICAL_QUESTION", subject: "Can't reset my password", body: "The password reset email never arrives, even after multiple attempts and checking spam." },
  { category: "TECHNICAL_QUESTION", subject: "Two-factor authentication not working", body: "I set up 2FA last week and now the codes from my authenticator app are being rejected." },
  { category: "REFUND_REQUEST", subject: "Requesting a refund for duplicate charge", body: "I was charged twice for this month's subscription. Could you refund the duplicate charge?" },
  { category: "REFUND_REQUEST", subject: "Refund for unused annual plan", body: "I upgraded to the annual plan by mistake and would like a refund since I only need the monthly one." },
  { category: "REFUND_REQUEST", subject: "Cancelled but still got billed", body: "I cancelled my subscription two weeks ago but was billed again this cycle. Please refund." },
  { category: null, subject: "Quick question", body: "Not sure who to ask, but does this tool support exporting data to CSV?" },
  { category: null, subject: "Feedback on the new interface", body: "The new layout looks great, just wanted to pass along some positive feedback!" },
];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const STATUSES = ["OPEN", "RESOLVED", "CLOSED"] as const;

function randomOf<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

const agents = await db.authUser.findMany({
  where: { role: Role.AGENT, deletedAt: null },
  select: { id: true },
});

const tickets = Array.from({ length: TICKET_COUNT }, () => {
  const template = randomOf(TEMPLATES);
  const customerName = randomOf(CUSTOMER_NAMES);
  const fromEmail = `${customerName.toLowerCase().replace(/\s+/g, ".")}.${Math.floor(Math.random() * 1000)}@example.com`;

  const createdAt = daysAgo(Math.random() * 30);
  const status = randomOf(STATUSES);
  const isResolvedLike = status === "RESOLVED" || status === "CLOSED";
  const resolvedAt = isResolvedLike
    ? new Date(createdAt.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000)
    : null;
  const updatedAt = resolvedAt ?? new Date(createdAt.getTime() + Math.random() * 12 * 60 * 60 * 1000);

  // ~25% unassigned even when agents exist, matching a realistic assignment backlog.
  const assignedToId = agents.length > 0 && Math.random() > 0.25 ? randomOf(agents).id : null;

  return {
    subject: template.subject,
    body: template.body,
    fromEmail,
    fromName: customerName,
    category: template.category,
    priority: randomOf(PRIORITIES),
    status,
    assignedToId,
    createdAt,
    updatedAt,
    resolvedAt,
  };
});

await db.ticket.createMany({ data: tickets });

console.log(`Seeded ${tickets.length} demo tickets (${agents.length} agent(s) available for assignment).`);
process.exit(0);
