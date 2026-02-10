import { createSupabaseServerClient } from "@/lib/supabaseClient";

export type ReportTargetType = "listing" | "user" | "message" | "thread";
export type ReportStatusType = "open" | "reviewing" | "resolved";

export type ReportWithContext = {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  details: string | null;
  status: ReportStatusType;
  moderator_notes: string | null;
  created_at: string;
  updated_at: string;
  reporter_name: string | null;
  /** User to warn/ban (listing seller, reported user, message sender, or thread participant) */
  subject_user_id: string | null;
  subject_user_name: string | null;
  /** Context preview for the reported target */
  context_preview: {
    type: ReportTargetType;
    title: string;
    href: string | null;
    subtitle: string | null;
  };
};

/**
 * Fetch open and reviewing reports for moderator panel.
 * Only moderators can call this (RLS enforces select on reports).
 */
export async function getModeratorReports(): Promise<ReportWithContext[]> {
  const supabase = await createSupabaseServerClient();

  const { data: reports, error: reportsErr } = await supabase
    .from("reports")
    .select("id, reporter_id, target_type, target_id, reason, details, status, moderator_notes, created_at, updated_at")
    .in("status", ["open", "reviewing"])
    .order("created_at", { ascending: false });

  if (reportsErr || !reports?.length) {
    return [];
  }

  const reporterIds = [...new Set(reports.map((r) => r.reporter_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", reporterIds);

  const reporterNames = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name?.trim() ?? null])
  );

  const listingIds = reports.filter((r) => r.target_type === "listing").map((r) => r.target_id);
  const userIds = reports.filter((r) => r.target_type === "user").map((r) => r.target_id);
  const messageIds = reports.filter((r) => r.target_type === "message").map((r) => r.target_id);
  const threadIds = reports.filter((r) => r.target_type === "thread").map((r) => r.target_id);

  const listingPreviews = new Map<string, { title: string; href: string }>();
  if (listingIds.length > 0) {
    const { data: listings } = await supabase
      .from("listings")
      .select("id, plant_name")
      .in("id", listingIds);
    for (const l of listings ?? []) {
      listingPreviews.set(l.id, {
        title: l.plant_name ?? "Inzerát",
        href: `/listing/${l.id}`,
      });
    }
  }

  const userPreviews = new Map<string, { title: string; href: string }>();
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    for (const u of users ?? []) {
      userPreviews.set(u.id, {
        title: u.display_name?.trim() ?? "Používateľ",
        href: `/profile/${u.id}`,
      });
    }
  }

  const messagePreviews = new Map<string, { title: string; href: string | null }>();
  if (messageIds.length > 0) {
    const { data: messages } = await supabase
      .from("messages")
      .select("id, body, thread_id")
      .in("id", messageIds);
    for (const m of messages ?? []) {
      const body = (m.body ?? "").slice(0, 60);
      messagePreviews.set(m.id, {
        title: body ? `Správa: ${body}${body.length >= 60 ? "…" : ""}` : "Správa",
        href: m.thread_id ? `/chat/${m.thread_id}` : null,
      });
    }
  }

  const threadPreviews = new Map<string, { title: string; href: string }>();
  if (threadIds.length > 0) {
    for (const tid of threadIds) {
      threadPreviews.set(tid, {
        title: "Konverzácia",
        href: `/chat/${tid}`,
      });
    }
  }

  const listingSellers = new Map<string, string>();
  if (listingIds.length > 0) {
    const { data: listData } = await supabase
      .from("listings")
      .select("id, seller_id")
      .in("id", listingIds);
    for (const l of listData ?? []) {
      if (l.seller_id) listingSellers.set(l.id, l.seller_id);
    }
  }

  const messageSenders = new Map<string, string>();
  if (messageIds.length > 0) {
    const { data: msgData } = await supabase
      .from("messages")
      .select("id, sender_id")
      .in("id", messageIds);
    for (const m of msgData ?? []) {
      if (m.sender_id) messageSenders.set(m.id, m.sender_id);
    }
  }

  const threadUser1 = new Map<string, string>();
  if (threadIds.length > 0) {
    const { data: threadData } = await supabase
      .from("threads")
      .select("id, user1_id")
      .in("id", threadIds);
    for (const t of threadData ?? []) {
      if (t.user1_id) threadUser1.set(t.id, t.user1_id);
    }
  }

  const subjectIds = new Set<string>();
  for (const r of reports) {
    if (r.target_type === "user") subjectIds.add(r.target_id);
    if (r.target_type === "listing") {
      const sid = listingSellers.get(r.target_id);
      if (sid) subjectIds.add(sid);
    }
    if (r.target_type === "message") {
      const sid = messageSenders.get(r.target_id);
      if (sid) subjectIds.add(sid);
    }
    if (r.target_type === "thread") {
      const uid = threadUser1.get(r.target_id);
      if (uid) subjectIds.add(uid);
    }
  }

  const subjectNames = new Map<string, string | null>();
  if (subjectIds.size > 0) {
    const { data: subjectProfiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", [...subjectIds]);
    for (const p of subjectProfiles ?? []) {
      subjectNames.set(p.id, p.display_name?.trim() ?? null);
    }
  }

  const getSubject = (r: (typeof reports)[0]) => {
    if (r.target_type === "user") return r.target_id;
    if (r.target_type === "listing") return listingSellers.get(r.target_id) ?? null;
    if (r.target_type === "message") return messageSenders.get(r.target_id) ?? null;
    if (r.target_type === "thread") return threadUser1.get(r.target_id) ?? null;
    return null;
  };

  return reports.map((r) => {
    const subjectId = getSubject(r);
    let context_preview: ReportWithContext["context_preview"] = {
      type: r.target_type as ReportTargetType,
      title: r.target_id.slice(0, 8) + "…",
      href: null,
      subtitle: null,
    };

    if (r.target_type === "listing") {
      const p = listingPreviews.get(r.target_id);
      if (p) {
        context_preview = { type: "listing", title: p.title, href: p.href, subtitle: "Inzerát" };
      }
    } else if (r.target_type === "user") {
      const p = userPreviews.get(r.target_id);
      if (p) {
        context_preview = { type: "user", title: p.title, href: p.href, subtitle: "Používateľ" };
      }
    } else if (r.target_type === "message") {
      const p = messagePreviews.get(r.target_id);
      if (p) {
        context_preview = { type: "message", title: p.title, href: p.href, subtitle: "Správa" };
      }
    } else if (r.target_type === "thread") {
      const p = threadPreviews.get(r.target_id);
      if (p) {
        context_preview = { type: "thread", title: p.title, href: p.href, subtitle: "Konverzácia" };
      }
    }

    return {
      id: r.id,
      reporter_id: r.reporter_id,
      target_type: r.target_type as ReportTargetType,
      target_id: r.target_id,
      reason: r.reason,
      details: r.details,
      status: r.status as ReportStatusType,
      moderator_notes: r.moderator_notes,
      created_at: r.created_at,
      updated_at: r.updated_at,
      reporter_name: reporterNames.get(r.reporter_id) ?? null,
      subject_user_id: subjectId,
      subject_user_name: subjectId ? subjectNames.get(subjectId) ?? null : null,
      context_preview,
    };
  });
}
