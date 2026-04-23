// Admin portal hybrid data layer.
// Live: educator_profiles + vetting_documents + user_roles (via Supabase queries in routes).
// Mocked here: extended application metadata, history, reviewer activity, audit log.
//
// Designed so the same TeacherApplication shape can be hydrated from either the
// real DB row or a synthetic seed — keeping the UI uniform.

export type AppStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_more_info"
  | "qualified"
  | "rejected"
  | "suspended";

export type DocStatus = "pending" | "approved" | "rejected" | "expiring";

export type DocType =
  | "government_id"
  | "good_conduct"
  | "credential"
  | "reference"
  | "other";

export interface MockDocument {
  id: string;
  type: DocType;
  status: DocStatus;
  uploaded_at: string;
  expires_at?: string;
  review_notes?: string;
  filename: string;
}

export interface MockTimelineEvent {
  id: string;
  at: string;
  actor: string;
  kind:
    | "submitted"
    | "doc_uploaded"
    | "assigned"
    | "status_change"
    | "doc_approved"
    | "doc_rejected"
    | "note"
    | "decision";
  detail: string;
}

export interface TeacherApplication {
  id: string;
  source: "live" | "mock";
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  subjects: string[];
  grade_levels: string[];
  philosophy: string;
  years_experience: number;
  biography: string;
  location: string;
  timezone: string;
  availability: string;
  references_count: number;
  status: AppStatus;
  qualification_score: number;
  assigned_reviewer: string;
  marketplace_visible: boolean;
  risk_flag: null | "duplicate_email" | "expired_doc" | "stale_submission" | "low_confidence";
  submitted_at: string;
  updated_at: string;
  documents: MockDocument[];
  timeline: MockTimelineEvent[];
  reviewer_confidence: 0 | 1 | 2 | 3 | 4 | 5;
}

// --- Deterministic random utilities -------------------------------------------------

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SUBJECTS = [
  "Mathematics",
  "Latin",
  "Classical Studies",
  "English Literature",
  "Greek",
  "Rhetoric",
  "Philosophy",
  "Science",
  "Music Theory",
  "Art History",
  "History",
  "Test Prep",
];
const GRADES = ["Pre-K", "Elementary", "Middle School", "High School"];
const REVIEWERS = ["A. Petropoulos", "M. Octavia", "J. Aurelius", "C. Helena", "Unassigned"];
const FIRST = [
  "Helena", "Marcus", "Cassia", "Theron", "Livia", "Octavian", "Phaedra", "Lysander",
  "Drusilla", "Atticus", "Calliope", "Demetrius", "Eirene", "Felix", "Galatea", "Hadrian",
  "Iola", "Junia", "Kallias", "Lucretia", "Magnus", "Niobe", "Orestes", "Penelope",
  "Quintus", "Rhea", "Septimus", "Thalia", "Ursinus", "Valeria", "Xander", "Ysolde",
  "Zenobia", "Anthea", "Brutus", "Cyrene", "Damaris", "Evander", "Faustus", "Helia",
];
const LAST = [
  "Aurelius", "Cato", "Marius", "Domitia", "Severa", "Tiberia", "Linus", "Galba",
  "Cornelius", "Vibius", "Sabinus", "Quirinus", "Octavia", "Plinius", "Rufus", "Sabina",
  "Tacitus", "Ulpia", "Varro", "Wolfram", "Xanthos", "Yannos", "Zoticus", "Antonius",
];
const CITIES = [
  "Athens, GA", "Boston, MA", "Charleston, SC", "Denver, CO", "Eugene, OR",
  "Florence, KY", "Geneva, IL", "Houston, TX", "Ithaca, NY", "Jacksonville, FL",
  "Knoxville, TN", "Lexington, KY", "Madison, WI", "Naperville, IL", "Olympia, WA",
  "Portland, ME", "Quincy, MA", "Richmond, VA", "Salem, OR", "Tampa, FL",
];

const TIMEZONES = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"];
const PHILOSOPHIES = [
  "Socratic dialogue precedes mastery; inquiry forms character.",
  "Latin and logic anchor every subject; rigor is reverence.",
  "The trivium is a lifelong rhythm: grammar, dialectic, rhetoric.",
  "Beauty teaches as surely as proof; both belong in the lesson.",
  "We read whole books, slowly, until they speak back.",
  "Memorization is not a cage — it is the loom we weave thought upon.",
];
const BIOS = [
  "A decade of classical instruction in Latin and rhetoric, with parents reporting marked progress in writing within a single term.",
  "Cambridge-trained mathematician turned tutor; loves coaxing reluctant arithmeticians toward joyful proofs.",
  "Former museum educator, now leading small literature seminars rooted in primary sources.",
  "Choral musician and theory tutor; teaches solfège alongside ear-training and composition.",
  "Studied under classical homeschooling pioneers; coaches families on long-arc curricula.",
];

// --- Mock generation -------------------------------------------------

const STATUS_DISTRIBUTION: AppStatus[] = [
  "qualified", "qualified", "qualified", "qualified", "qualified", "qualified", "qualified", "qualified", "qualified", "qualified",
  "qualified", "qualified", "qualified",
  "submitted", "submitted", "submitted", "submitted",
  "under_review", "under_review", "under_review", "under_review", "under_review",
  "needs_more_info", "needs_more_info", "needs_more_info",
  "rejected", "rejected", "rejected", "rejected",
  "suspended", "suspended",
];

function buildMockTeacher(i: number): TeacherApplication {
  const rand = mulberry32(1000 + i);
  const status = STATUS_DISTRIBUTION[i % STATUS_DISTRIBUTION.length];
  const fname = FIRST[Math.floor(rand() * FIRST.length)];
  const lname = LAST[Math.floor(rand() * LAST.length)];
  const subjectsCount = 1 + Math.floor(rand() * 3);
  const subjects = Array.from(new Set(Array.from({ length: subjectsCount }, () => SUBJECTS[Math.floor(rand() * SUBJECTS.length)])));
  const gradesCount = 1 + Math.floor(rand() * 3);
  const grades = Array.from(new Set(Array.from({ length: gradesCount }, () => GRADES[Math.floor(rand() * GRADES.length)])));
  const yearsExp = Math.floor(rand() * 22) + 1;
  const reviewer = status === "submitted" ? "Unassigned" : REVIEWERS[Math.floor(rand() * (REVIEWERS.length - 1))];

  // Submitted between 1 and 120 days ago
  const submittedDaysAgo = 1 + Math.floor(rand() * 120);
  const submittedAt = new Date(Date.now() - submittedDaysAgo * 86400000);

  // Documents
  const idStatus: DocStatus = status === "qualified" ? "approved" : status === "needs_more_info" ? (rand() > 0.5 ? "pending" : "rejected") : status === "rejected" ? (rand() > 0.5 ? "rejected" : "approved") : rand() > 0.4 ? "approved" : "pending";
  const conductStatus: DocStatus = status === "qualified" ? "approved" : status === "rejected" ? "rejected" : rand() > 0.5 ? "approved" : "pending";
  const credentialStatus: DocStatus = status === "qualified" ? (rand() > 0.85 ? "expiring" : "approved") : rand() > 0.45 ? "approved" : "pending";

  const hasReferences = rand() > 0.4;
  const documents: MockDocument[] = [
    {
      id: `${i}-id`,
      type: "government_id",
      status: idStatus,
      uploaded_at: new Date(submittedAt.getTime() + 1 * 86400000).toISOString(),
      filename: "government-id.pdf",
      review_notes: idStatus === "rejected" ? "Photo blurred along the lower edge — please resubmit." : undefined,
    },
    {
      id: `${i}-conduct`,
      type: "good_conduct",
      status: conductStatus,
      uploaded_at: new Date(submittedAt.getTime() + 2 * 86400000).toISOString(),
      expires_at: new Date(Date.now() + (rand() > 0.85 ? 18 : 240) * 86400000).toISOString(),
      filename: "certificate-of-good-conduct.pdf",
    },
    {
      id: `${i}-cred`,
      type: "credential",
      status: credentialStatus,
      uploaded_at: new Date(submittedAt.getTime() + 3 * 86400000).toISOString(),
      filename: "teaching-credential.pdf",
    },
  ];
  if (hasReferences) {
    documents.push({
      id: `${i}-ref`,
      type: "reference",
      status: "approved",
      uploaded_at: new Date(submittedAt.getTime() + 4 * 86400000).toISOString(),
      filename: "references.pdf",
    });
  }

  // Score
  const score = computeScore({
    idApproved: idStatus === "approved",
    conductApproved: conductStatus === "approved",
    credentialApproved: credentialStatus === "approved" || credentialStatus === "expiring",
    yearsExp,
    subjectsCount: subjects.length,
    hasReferences,
    reviewerConfidence: status === "qualified" ? 5 : status === "rejected" ? 1 : 3,
  });

  // Risk flag
  let risk: TeacherApplication["risk_flag"] = null;
  if (i % 13 === 0 && status !== "qualified") risk = "duplicate_email";
  else if (documents.some((d) => d.status === "expiring")) risk = "expired_doc";
  else if (status === "submitted" && submittedDaysAgo > 14) risk = "stale_submission";
  else if (status === "rejected" && rand() > 0.6) risk = "low_confidence";

  // Timeline
  const timeline: MockTimelineEvent[] = [
    {
      id: `${i}-t-sub`,
      at: submittedAt.toISOString(),
      actor: `${fname} ${lname}`,
      kind: "submitted",
      detail: "Application submitted via public sign-up.",
    },
    ...documents.map((d, idx) => ({
      id: `${i}-t-doc-${idx}`,
      at: d.uploaded_at,
      actor: `${fname} ${lname}`,
      kind: "doc_uploaded" as const,
      detail: `Uploaded ${labelForDoc(d.type)}.`,
    })),
  ];
  if (reviewer !== "Unassigned") {
    timeline.push({
      id: `${i}-t-assign`,
      at: new Date(submittedAt.getTime() + 5 * 86400000).toISOString(),
      actor: "System",
      kind: "assigned",
      detail: `Reviewer ${reviewer} assigned.`,
    });
  }
  if (status === "qualified") {
    timeline.push({
      id: `${i}-t-decision`,
      at: new Date(submittedAt.getTime() + (10 + Math.floor(rand() * 6)) * 86400000).toISOString(),
      actor: reviewer,
      kind: "decision",
      detail: "Approved as Qualified — laurel wreath granted.",
    });
  } else if (status === "rejected") {
    timeline.push({
      id: `${i}-t-decision`,
      at: new Date(submittedAt.getTime() + (8 + Math.floor(rand() * 5)) * 86400000).toISOString(),
      actor: reviewer,
      kind: "decision",
      detail: "Rejected — credentials could not be verified.",
    });
  }
  timeline.sort((a, b) => +new Date(b.at) - +new Date(a.at));

  return {
    id: `mock-${i}`,
    source: "mock",
    full_name: `${fname} ${lname}`,
    email: `${fname.toLowerCase()}.${lname.toLowerCase()}@homeschooled.example`,
    phone: `+1 (555) ${String(100 + i).padStart(3, "0")}-${String(2000 + i * 7).slice(-4)}`,
    avatar_url: null,
    subjects,
    grade_levels: grades,
    philosophy: PHILOSOPHIES[i % PHILOSOPHIES.length],
    years_experience: yearsExp,
    biography: BIOS[i % BIOS.length],
    location: CITIES[i % CITIES.length],
    timezone: TIMEZONES[i % TIMEZONES.length],
    availability: ["Weekday mornings", "Weekday afternoons", "Evenings", "Saturday seminars"][i % 4],
    references_count: hasReferences ? 2 + (i % 2) : 0,
    status,
    qualification_score: score,
    assigned_reviewer: reviewer,
    marketplace_visible: status === "qualified",
    risk_flag: risk,
    submitted_at: submittedAt.toISOString(),
    updated_at: new Date(submittedAt.getTime() + 7 * 86400000).toISOString(),
    documents,
    timeline,
    reviewer_confidence: status === "qualified" ? 5 : status === "rejected" ? 1 : status === "needs_more_info" ? 2 : 3,
  };
}

export function labelForDoc(t: DocType): string {
  switch (t) {
    case "government_id": return "Government ID";
    case "good_conduct": return "Certificate of Good Conduct";
    case "credential": return "Degree / Teaching Credential";
    case "reference": return "References";
    default: return "Other";
  }
}

export function labelForStatus(s: AppStatus): string {
  return {
    draft: "Draft",
    submitted: "Submitted",
    under_review: "Under Review",
    needs_more_info: "Needs Info",
    qualified: "Qualified",
    rejected: "Rejected",
    suspended: "Suspended",
  }[s];
}

export interface ScoreInput {
  idApproved: boolean;
  conductApproved: boolean;
  credentialApproved: boolean;
  yearsExp: number;
  subjectsCount: number;
  hasReferences: boolean;
  reviewerConfidence: number; // 0..5
}

export function computeScore(s: ScoreInput): number {
  let score = 0;
  if (s.idApproved) score += 25;
  if (s.conductApproved) score += 25;
  if (s.credentialApproved) score += 20;
  if (s.yearsExp >= 2) score += 10;
  else if (s.yearsExp >= 1) score += 5;
  if (s.subjectsCount >= 1) score += 10;
  if (s.hasReferences) score += 5;
  score += Math.min(5, s.reviewerConfidence);
  return Math.min(100, score);
}

export function scoreBreakdown(s: ScoreInput) {
  return [
    { label: "Government ID verified", earned: s.idApproved ? 25 : 0, max: 25, passed: s.idApproved },
    { label: "Certificate of good conduct verified", earned: s.conductApproved ? 25 : 0, max: 25, passed: s.conductApproved },
    { label: "Degree / credential verified", earned: s.credentialApproved ? 20 : 0, max: 20, passed: s.credentialApproved },
    { label: "Experience entered and sufficient", earned: s.yearsExp >= 2 ? 10 : s.yearsExp >= 1 ? 5 : 0, max: 10, passed: s.yearsExp >= 2 },
    { label: "Subject expertise mapped", earned: s.subjectsCount >= 1 ? 10 : 0, max: 10, passed: s.subjectsCount >= 1 },
    { label: "References provided", earned: s.hasReferences ? 5 : 0, max: 5, passed: s.hasReferences },
    { label: "Reviewer confidence check", earned: Math.min(5, s.reviewerConfidence), max: 5, passed: s.reviewerConfidence >= 3 },
  ];
}

export const QUALIFICATION_THRESHOLD = 85;

// 35 mock teachers (we'll merge with live ones to reach 40+)
export const MOCK_TEACHERS: TeacherApplication[] = Array.from({ length: 35 }, (_, i) => buildMockTeacher(i));

// --- Aggregations for the dashboard -------------------------------------------------

export interface DashboardKPIs {
  totalApplications: number;
  pendingReview: number;
  underReview: number;
  qualified: number;
  rejected: number;
  suspended: number;
  qualificationRate: number; // 0..100
  avgReviewDays: number;
  missingDocs: number;
  expiringSoon: number;
}

export function buildKPIs(t: TeacherApplication[]): DashboardKPIs {
  const total = t.length;
  const pending = t.filter((x) => x.status === "submitted").length;
  const under = t.filter((x) => x.status === "under_review").length;
  const qualified = t.filter((x) => x.status === "qualified").length;
  const rejected = t.filter((x) => x.status === "rejected").length;
  const suspended = t.filter((x) => x.status === "suspended").length;
  const decided = t.filter((x) => x.status === "qualified" || x.status === "rejected").length;
  const qualRate = decided > 0 ? Math.round((qualified / decided) * 100) : 0;
  const reviewDays = t
    .filter((x) => x.status === "qualified" || x.status === "rejected")
    .map((x) => Math.max(1, Math.round((+new Date(x.updated_at) - +new Date(x.submitted_at)) / 86400000)));
  const avgDays = reviewDays.length ? Math.round(reviewDays.reduce((a, b) => a + b, 0) / reviewDays.length) : 0;
  const missing = t.filter((x) => x.documents.some((d) => d.status === "pending")).length;
  const expiring = t.filter((x) => x.documents.some((d) => d.status === "expiring")).length;

  return {
    totalApplications: total,
    pendingReview: pending,
    underReview: under,
    qualified,
    rejected,
    suspended,
    qualificationRate: qualRate,
    avgReviewDays: avgDays,
    missingDocs: missing,
    expiringSoon: expiring,
  };
}

// Bucket teachers by week for time series
export function applicationsOverTime(t: TeacherApplication[], days: number) {
  const buckets = new Map<string, number>();
  const now = Date.now();
  const stepDays = days <= 30 ? 1 : days <= 90 ? 7 : 30;
  for (let d = days; d >= 0; d -= stepDays) {
    const date = new Date(now - d * 86400000);
    buckets.set(bucketKey(date, stepDays), 0);
  }
  for (const teacher of t) {
    const sub = new Date(teacher.submitted_at);
    if ((now - +sub) / 86400000 > days) continue;
    const k = bucketKey(sub, stepDays);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([label, count]) => ({ label, count }));
}

function bucketKey(d: Date, stepDays: number) {
  if (stepDays === 1) return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (stepDays === 7) return `Wk of ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

export function qualificationRateOverTime(t: TeacherApplication[], days: number) {
  // Roll a 14-day window
  const points: { label: string; rate: number }[] = [];
  const stepDays = days <= 30 ? 2 : days <= 90 ? 7 : 30;
  const now = Date.now();
  for (let d = days; d >= 0; d -= stepDays) {
    const end = now - d * 86400000;
    const start = end - 28 * 86400000;
    const window = t.filter((x) => {
      const u = +new Date(x.updated_at);
      return u >= start && u <= end && (x.status === "qualified" || x.status === "rejected");
    });
    const q = window.filter((x) => x.status === "qualified").length;
    const rate = window.length ? Math.round((q / window.length) * 100) : 0;
    points.push({
      label: new Date(end).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      rate,
    });
  }
  return points;
}

export function statusDistribution(t: TeacherApplication[]) {
  const order: AppStatus[] = ["submitted", "under_review", "needs_more_info", "qualified", "rejected", "suspended"];
  return order.map((s) => ({ status: s, label: labelForStatus(s), value: t.filter((x) => x.status === s).length }));
}

export function rejectionReasons() {
  return [
    { reason: "Incomplete documents", count: 11 },
    { reason: "Failed background check", count: 6 },
    { reason: "Insufficient credentials", count: 5 },
    { reason: "Unverifiable identity", count: 3 },
    { reason: "Insufficient teaching experience", count: 4 },
    { reason: "Low reviewer confidence", count: 3 },
    { reason: "Duplicate / suspicious application", count: 2 },
  ];
}

export function teachersBySubject(t: TeacherApplication[]) {
  const counts = new Map<string, number>();
  SUBJECTS.forEach((s) => counts.set(s, 0));
  for (const teacher of t) {
    for (const subj of teacher.subjects) {
      counts.set(subj, (counts.get(subj) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries()).map(([subject, count]) => ({ subject, count })).sort((a, b) => b.count - a.count);
}

export function teachersByGradeBand(t: TeacherApplication[]) {
  return GRADES.map((g) => {
    const teachers = t.filter((x) => x.grade_levels.includes(g));
    return {
      grade: g,
      qualified: teachers.filter((x) => x.status === "qualified").length,
      pending: teachers.filter((x) => x.status !== "qualified").length,
    };
  });
}

export function reviewerActivity(t: TeacherApplication[]) {
  const counts = new Map<string, { approvals: number; rejections: number; info: number }>();
  for (const teacher of t) {
    if (teacher.assigned_reviewer === "Unassigned") continue;
    const cur = counts.get(teacher.assigned_reviewer) ?? { approvals: 0, rejections: 0, info: 0 };
    if (teacher.status === "qualified") cur.approvals += 1;
    else if (teacher.status === "rejected") cur.rejections += 1;
    else if (teacher.status === "needs_more_info") cur.info += 1;
    counts.set(teacher.assigned_reviewer, cur);
  }
  return Array.from(counts.entries()).map(([reviewer, c]) => ({ reviewer, ...c }));
}

export function documentHealth(t: TeacherApplication[]) {
  let approved = 0, pending = 0, rejected = 0, expiring = 0;
  for (const teacher of t) {
    for (const d of teacher.documents) {
      if (d.status === "approved") approved += 1;
      else if (d.status === "pending") pending += 1;
      else if (d.status === "rejected") rejected += 1;
      else if (d.status === "expiring") expiring += 1;
    }
  }
  return [
    { name: "Approved", value: approved },
    { name: "Pending", value: pending },
    { name: "Rejected", value: rejected },
    { name: "Expiring", value: expiring },
  ];
}

export function avgReviewTimeOverTime(days: number) {
  const out: { label: string; days: number }[] = [];
  const step = days <= 30 ? 2 : days <= 90 ? 7 : 30;
  const now = Date.now();
  for (let d = days; d >= 0; d -= step) {
    const date = new Date(now - d * 86400000);
    // synthesize a smooth-ish series 5-12 days
    const base = 8 + Math.sin(d / 8) * 2 + ((d * 13) % 5) * 0.4;
    out.push({
      label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      days: Math.max(3, Math.round(base * 10) / 10),
    });
  }
  return out;
}

export function funnelData(t: TeacherApplication[]) {
  const submitted = t.length;
  const underReview = t.filter((x) => ["under_review", "needs_more_info", "qualified", "rejected"].includes(x.status)).length;
  const needsInfo = t.filter((x) => ["needs_more_info", "qualified", "rejected"].includes(x.status)).length;
  const qualified = t.filter((x) => x.status === "qualified").length;
  const rejected = t.filter((x) => x.status === "rejected").length;
  return [
    { stage: "Submitted", count: submitted },
    { stage: "Under Review", count: underReview },
    { stage: "Needs Info", count: needsInfo },
    { stage: "Qualified", count: qualified },
    { stage: "Rejected", count: rejected },
  ];
}
