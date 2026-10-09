const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export type SafeUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  referralCode: string;
};

export type AuthResponse = {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
};

export type DictionaryEntry = {
  id: string;
  wordTr: string;
  wordTarget: string;
  variant: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  exampleTr: string | null;
  exampleTarget: string | null;
  notes: string | null;
};

export type Category = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  _count?: { lessons: number };
  lessons?: Lesson[];
};

export type Lesson = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  level: string;
  videoUrl: string | null;
  coverUrl: string | null;
  category?: { id: string; title: string; slug: string };
  media?: { id: string; type: string; url: string; title: string | null }[];
};

export type ForumAuthor = { id: string; displayName: string };

export type ForumTopic = {
  id: string;
  title: string;
  slug: string;
  entryCount: number;
  lastEntryAt: string | null;
  createdAt: string;
  author?: ForumAuthor;
  _count?: { entries: number };
  entries?: ForumEntry[];
};

export type ForumEntry = {
  id: string;
  body: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  author: ForumAuthor;
  topic?: { id: string; title: string; slug: string };
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { message?: string | string[] }).message ||
      "İstek başarısız oldu";
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }
  return data as T;
}

export const api = {
  health: () => request<{ ok: boolean }>("/health"),
  register: (body: {
    email: string;
    password: string;
    displayName: string;
    referralCode?: string;
  }) => request<AuthResponse>("/auth/register", { method: "POST", body }),
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body }),
  me: (token: string) =>
    request<SafeUser>("/auth/me", { token }),
  dictionary: (q?: string) =>
    request<{ total: number; items: DictionaryEntry[] }>(
      `/dictionary${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    ),
  dictionaryAiExplain: (q: string, variant?: string) =>
    request<{
      source: "ai" | "dictionary";
      query: string;
      matches: DictionaryEntry[];
      explanation: string;
    }>(
      `/dictionary/ai/explain?q=${encodeURIComponent(q)}${
        variant ? `&variant=${encodeURIComponent(variant)}` : ""
      }`,
    ),
  categories: () => request<Category[]>("/categories"),
  category: (slug: string) => request<Category>(`/categories/${slug}`),
  lessons: (q?: string) =>
    request<{ total: number; items: Lesson[] }>(
      `/lessons${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    ),
  lesson: (slug: string) => request<Lesson>(`/lessons/${slug}`),
  search: (q: string) =>
    request<{
      dictionary: { total: number; items: DictionaryEntry[] };
      lessons: { total: number; items: Lesson[] };
      forum: { total: number; items: ForumTopic[] };
    }>(`/search?q=${encodeURIComponent(q)}`),
  forumTopics: (q?: string) =>
    request<{ total: number; items: ForumTopic[] }>(
      `/forum/topics${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    ),
  forumFeed: () => request<ForumEntry[]>("/forum/feed"),
  forumTopic: (slug: string) =>
    request<ForumTopic>(`/forum/topics/${slug}`),
  createForumTopic: (
    token: string,
    body: { title: string; body: string },
  ) =>
    request<ForumTopic>("/forum/topics", {
      method: "POST",
      token,
      body,
    }),
  addForumEntry: (token: string, slug: string, body: string) =>
    request<ForumEntry>(`/forum/topics/${slug}/entries`, {
      method: "POST",
      token,
      body: { body },
    }),
  voteForumEntry: (token: string, id: string, value: 1 | -1) =>
    request<ForumEntry>(`/forum/entries/${id}/vote`, {
      method: "POST",
      token,
      body: { value },
    }),
  reportForumEntry: (token: string, id: string, reason: string) =>
    request<{ id: string }>(`/forum/entries/${id}/report`, {
      method: "POST",
      token,
      body: { reason },
    }),
  hideForumEntry: (token: string, id: string) =>
    request<ForumEntry>(`/forum/entries/${id}/hide`, {
      method: "PATCH",
      token,
    }),
  forumReports: (token: string) =>
    request<
      {
        id: string;
        reason: string;
        entry: ForumEntry & { topic: { title: string; slug: string } };
      }[]
    >("/forum/reports", { token }),
  resolveForumReport: (token: string, id: string) =>
    request<{ id: string }>(`/forum/reports/${id}/resolve`, {
      method: "PATCH",
      token,
    }),
  adminDashboard: (token: string) =>
    request<{
      users: {
        total: number;
        pending: number;
        active: number;
        suspended: number;
      };
      phase: string;
    }>("/admin/dashboard", { token }),
  adminUsers: (token: string) =>
    request<{ total: number; items: SafeUser[] }>("/admin/users", { token }),
  updateUserStatus: (
    token: string,
    id: string,
    status: string,
  ) =>
    request<SafeUser>(`/admin/users/${id}/status`, {
      method: "PATCH",
      token,
      body: { status },
    }),
  createDictionary: (
    token: string,
    body: {
      wordTr: string;
      wordTarget: string;
      variant?: string;
      partOfSpeech?: string;
      exampleTr?: string;
      exampleTarget?: string;
      notes?: string;
    },
  ) =>
    request<DictionaryEntry>("/dictionary", {
      method: "POST",
      token,
      body,
    }),
  createCategory: (
    token: string,
    body: { title: string; slug: string; description?: string },
  ) =>
    request<Category>("/admin/categories", {
      method: "POST",
      token,
      body,
    }),
  createLesson: (
    token: string,
    body: {
      title: string;
      slug: string;
      categoryId: string;
      summary?: string;
      content?: string;
      level?: string;
      published?: boolean;
    },
  ) =>
    request<Lesson>("/admin/lessons", {
      method: "POST",
      token,
      body,
    }),
  adminCategories: (token: string) =>
    request<Category[]>("/admin/categories", { token }),
  calendarEvents: (token: string) =>
    request<CalendarEvent[]>("/calendar/events", { token }),
  calendarEvent: (id: string, token?: string | null) =>
    request<CalendarEvent & { enrolled?: boolean }>(`/calendar/events/${id}`, {
      token,
    }),
  myCalendar: (token: string) =>
    request<{ id: string; event: CalendarEvent }[]>("/calendar/mine", {
      token,
    }),
  enrollEvent: (token: string, id: string) =>
    request<{ id: string }>(`/calendar/events/${id}/enroll`, {
      method: "POST",
      token,
    }),
  unenrollEvent: (token: string, id: string) =>
    request<{ message: string }>(`/calendar/events/${id}/enroll`, {
      method: "DELETE",
      token,
    }),
  createCalendarEvent: (
    token: string,
    body: {
      title: string;
      description?: string;
      startAt: string;
      endAt: string;
      meetUrl?: string;
      level?: string;
      capacity?: number;
      published?: boolean;
    },
  ) =>
    request<CalendarEvent>("/calendar/admin/events", {
      method: "POST",
      token,
      body,
    }),
  adminCalendarEvents: (token: string) =>
    request<CalendarEvent[]>("/calendar/admin/events", { token }),
  runReminders: (token: string) =>
    request<{ sent: number }>("/calendar/admin/reminders/run", {
      method: "POST",
      token,
    }),
  plans: () => request<Plan[]>("/payments/plans"),
  mySubscription: (token: string) =>
    request<Subscription | null>("/payments/me", { token }),
  subscribe: (
    token: string,
    body: { planCode: string; referralCode?: string },
  ) =>
    request<{ subscription: Subscription; payment: Payment }>(
      "/payments/subscribe",
      { method: "POST", token, body },
    ),
  submitPayment: (
    token: string,
    paymentId: string,
    body: { receiptUrl?: string; note?: string },
  ) =>
    request<Payment>(`/payments/payments/${paymentId}/submit`, {
      method: "PATCH",
      token,
      body,
    }),
  pendingPayments: (token: string) =>
    request<PendingPayment[]>("/payments/admin/pending", { token }),
  reviewPayment: (
    token: string,
    id: string,
    body: { decision: "APPROVED" | "REJECTED"; rejectReason?: string },
  ) =>
    request<Payment>(`/payments/admin/payments/${id}/review`, {
      method: "PATCH",
      token,
      body,
    }),
  runPaymentReminders: (token: string) =>
    request<{ sent: number }>("/payments/admin/reminders/run", {
      method: "POST",
      token,
    }),
  aiUsage: (token: string) =>
    request<AiUsage>("/ai/usage", { token }),
  aiChat: (
    token: string,
    body: {
      message: string;
      conversationId?: string;
      mode?: "GENERAL" | "LESSON";
      level?: string;
      variant?: string;
      lessonId?: string;
      lessonContext?: string;
    },
  ) =>
    request<{
      conversationId: string;
      reply: string;
      usage: AiUsage;
    }>("/ai/chat", { method: "POST", token, body }),
  aiConversations: (token: string) =>
    request<
      {
        id: string;
        title: string | null;
        mode: string;
        level: string;
        variant: string;
        updatedAt: string;
      }[]
    >("/ai/conversations", { token }),
  gameQuiz: (opts: GameRequestOpts = {}) =>
    request<GameQuizResponse>(`/games/quiz?${gameQuery(opts)}`),
  gameFlashcards: (opts: GameRequestOpts = {}) =>
    request<GameFlashResponse>(`/games/flashcards?${gameQuery(opts)}`),
  gameMatch: (opts: GameRequestOpts = {}) =>
    request<GameMatchResponse>(`/games/match?${gameQuery(opts)}`),
  gameLeaderboard: (gameType?: string) =>
    request<LeaderboardRow[]>(
      `/games/leaderboard${gameType ? `?gameType=${gameType}` : ""}`,
    ),
  groups: () => request<ClassGroupSummary[]>("/groups"),
  myGroups: (token: string) =>
    request<ClassGroupSummary[]>("/groups/mine", { token }),
  group: (slug: string, token?: string | null) =>
    request<ClassGroupDetail>(`/groups/${slug}`, {
      token: token || undefined,
    }),
  createGroup: (
    token: string,
    body: {
      name: string;
      description?: string;
      level?: string;
      periodLabel?: string;
      published?: boolean;
    },
  ) =>
    request<ClassGroupSummary>("/groups", { method: "POST", token, body }),
  addGroupMaterial: (
    token: string,
    groupId: string,
    body: {
      type: "NOTE" | "VIDEO" | "RECORDING" | "LINK" | "FILE";
      title: string;
      body?: string;
      url?: string;
    },
  ) =>
    request<GroupMaterial>(`/groups/${groupId}/materials`, {
      method: "POST",
      token,
      body,
    }),
  addGroupMember: (token: string, groupId: string, email: string) =>
    request(`/groups/${groupId}/members`, {
      method: "POST",
      token,
      body: { email },
    }),
  removeGroupMaterial: (token: string, materialId: string) =>
    request(`/groups/materials/${materialId}`, {
      method: "DELETE",
      token,
    }),
  meDashboard: (token: string) =>
    request<MemberDashboard>("/me/dashboard", { token }),
  createHomework: (
    token: string,
    body: {
      groupId: string;
      title: string;
      description?: string;
      attachmentUrl?: string;
      attachmentName?: string;
      dueAt?: string;
    },
  ) => request("/homework", { method: "POST", token, body }),
  groupHomeworks: (token: string, groupId: string) =>
    request<HomeworkItem[]>(`/homework/group/${groupId}`, { token }),
  homeworkInbox: (token: string) =>
    request<HomeworkItem[]>("/homework/inbox", { token }),
  submitHomework: (
    token: string,
    id: string,
    body: { done?: boolean; note?: string; fileUrl?: string },
  ) =>
    request(`/homework/${id}/submit`, { method: "POST", token, body }),
  selfTestStart: (token: string, level?: string) =>
    request<{
      level: string;
      source: string;
      questions: Omit<QuizQuestion, "answer">[];
      answerKey: { id: string; answer: string }[];
    }>("/self-test/start", { method: "POST", token, body: { level } }),
  selfTestSubmit: (
    token: string,
    body: {
      level?: string;
      answers: { id: string; chosen: string; correctAnswer: string }[];
    },
  ) =>
    request<{
      score: number;
      total: number;
      summary: string;
      teacher?: { displayName: string } | null;
    }>("/self-test/submit", { method: "POST", token, body }),
  selfTestInbox: (token: string) =>
    request<
      {
        id: string;
        score: number;
        total: number;
        summary: string;
        level: string;
        createdAt: string;
        student: { displayName: string; email: string };
      }[]
    >("/self-test/inbox", { token }),
  saveGameScore: (
    token: string,
    body: {
      gameType: "QUIZ" | "FLASHCARD" | "MATCH";
      score: number;
      total: number;
      durationSec: number;
    },
  ) =>
    request<{ id: string }>("/games/scores", {
      method: "POST",
      token,
      body,
    }),
};

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  meetUrl: string | null;
  calendarUrl: string | null;
  level: string | null;
  capacity: number;
  published: boolean;
  teacher?: { id: string; displayName: string } | null;
  _count?: { enrollments: number };
  enrolled?: boolean;
};

export type Plan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  interval: string;
  durationMonths: number;
  priceTry: number;
  discountPercent: number;
  referralBonusDays: number;
};

export type Payment = {
  id: string;
  amountTry: number;
  status: string;
  receiptUrl: string | null;
  note: string | null;
  rejectReason?: string | null;
};

export type Subscription = {
  id: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  bonusDaysApplied: number;
  referralCodeUsed: string | null;
  plan: Plan;
  payments?: Payment[];
};

export type PendingPayment = Payment & {
  user: { id: string; email: string; displayName: string };
  subscription: { id: string; plan: Plan };
};

export type AiUsage = {
  day: string;
  used: number;
  limit: number;
  remaining: number;
  provider: string;
};

export type GameRequestOpts = {
  count?: number;
  level?: string;
  variant?: string;
  topic?: string;
  source?: "ai" | "dictionary" | "auto";
};

function gameQuery(opts: GameRequestOpts) {
  const q = new URLSearchParams();
  q.set("count", String(opts.count ?? 8));
  if (opts.level) q.set("level", opts.level);
  if (opts.variant) q.set("variant", opts.variant);
  if (opts.topic) q.set("topic", opts.topic);
  if (opts.source) q.set("source", opts.source);
  return q.toString();
}

export type QuizQuestion = {
  id: string;
  prompt: string;
  direction: string;
  choices: string[];
  answer: string;
  hint: string | null;
};

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  variant: string;
  exampleTr: string | null;
  exampleTarget: string | null;
};

export type MatchRound = {
  pairs: { id: string; tr: string; target: string }[];
  left: { id: string; label: string }[];
  right: { id: string; label: string }[];
};

export type GameQuizResponse = {
  source: "ai" | "dictionary";
  items: QuizQuestion[];
};

export type GameFlashResponse = {
  source: "ai" | "dictionary";
  items: Flashcard[];
};

export type GameMatchResponse = MatchRound & {
  source: "ai" | "dictionary";
};

export type LeaderboardRow = {
  id: string;
  gameType: string;
  score: number;
  total: number;
  percent: number;
  durationSec: number;
  user: { id: string; displayName: string };
};

export type ClassGroupSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  level: string;
  periodLabel: string | null;
  published: boolean;
  teacher?: { id: string; displayName: string } | null;
  _count?: { members: number; materials: number };
};

export type GroupMaterial = {
  id: string;
  type: "NOTE" | "VIDEO" | "RECORDING" | "LINK" | "FILE";
  title: string;
  body: string | null;
  url: string | null;
  sortOrder: number;
  published: boolean;
  createdAt: string;
};

export type ClassGroupDetail = ClassGroupSummary & {
  materials: GroupMaterial[];
  members?: {
    id: string;
    user: { id: string; displayName: string; email: string };
  }[];
  isMember?: boolean;
  canManage?: boolean;
  locked?: boolean;
};

export type HomeworkItem = {
  id: string;
  title: string;
  description: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  dueAt: string | null;
  group?: { name: string; slug: string };
  mySubmission?: {
    done: boolean;
    note: string | null;
    fileUrl: string | null;
  } | null;
  submissions?: {
    done: boolean;
    fileUrl: string | null;
    user: { displayName: string; email: string };
  }[];
};

export type MemberDashboard = {
  user: SafeUser;
  subscription: Subscription | null;
  groups: {
    id: string;
    name: string;
    slug: string;
    periodLabel: string | null;
    completedAt: string | null;
  }[];
  lessonsAttended: number;
  nextLesson: CalendarEvent | null;
  pendingHomeworks: HomeworkItem[];
  upcomingPayment: Payment | null;
  completedCourses: { id: string; name: string; slug: string }[];
  alerts: {
    nextLesson: {
      title: string;
      startAt: string;
      meetUrl: string | null;
      groupName?: string;
    } | null;
    pendingHomeworkCount: number;
    pendingHomeworks: {
      id: string;
      title: string;
      dueAt: string | null;
      groupName: string;
      groupSlug: string;
    }[];
  };
};
