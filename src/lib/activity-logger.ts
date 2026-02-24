import { supabase } from "./supabase";

/**
 * Fire-and-forget activity logger.
 * Never blocks the calling operation — logs are best-effort.
 */
export function logActivity(
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: Record<string, unknown> | null
): void {
  supabase.auth.getUser().then(({ data }) => {
    const userId = data.user?.id ?? null;
    supabase
      .from("activity_log")
      .insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId ?? null,
        details: details ?? null,
      })
      .then(({ error }) => {
        if (error) console.warn("[activity-log] Failed to log:", error.message);
      });
  });
}
