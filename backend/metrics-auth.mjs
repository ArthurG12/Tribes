export function parseMetricsAdminEmails(value = process.env.METRICS_ADMIN_EMAILS ?? "") {
  return new Set(
    value
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isMetricsAdmin(email, allowedEmails = parseMetricsAdminEmails()) {
  return typeof email === "string" && allowedEmails.has(email.trim().toLowerCase());
}
