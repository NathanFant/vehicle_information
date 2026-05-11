import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { lookupVin, VehicleReport, RiskFlag, Recall, HistoryEvent } from "../api";

export function Report() {
  const { vin } = useParams<{ vin: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [report, setReport] = useState<VehicleReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const price: string | undefined = (location.state as { price?: string } | null)?.price;

  useEffect(() => {
    if (!vin) return;
    setLoading(true);
    setError(null);
    lookupVin(vin)
      .then(setReport)
      .catch(err => setError(err instanceof Error ? err.message : "Lookup failed."))
      .finally(() => setLoading(false));
  }, [vin]);

  if (loading) {
    return (
      <div style={s.centered}>
        <div style={s.spinner} />
        <div style={s.loadingText}>Querying data sources…</div>
        <div style={s.loadingSubtext}>NHTSA · MarketCheck · CARFAX · NMVTIS</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.centered}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠</div>
        <div style={s.errorTitle}>Lookup Failed</div>
        <div style={s.errorMsg}>{error}</div>
        <button style={s.retryBtn} onClick={() => vin && lookupVin(vin).then(setReport).catch(err => setError(err.message))}>
          Retry
        </button>
        <Link to="/" style={s.backLink}>← Back to search</Link>
      </div>
    );
  }

  if (!report) return null;

  const highRisk = report.risk_flags.filter(f => f.severity === "high").length;
  const id = report.identity;
  const vehicleLabel = id
    ? [id.year?.value, id.make?.value, id.model?.value].filter(Boolean).join(" ")
    : report.vin;

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <button style={s.backBtn} onClick={() => navigate(-1)}>← Back</button>
          <div>
            <div style={s.headerVehicle}>{vehicleLabel}</div>
            <div style={s.headerVin}>{report.vin}</div>
          </div>
        </div>

        {/* Purchase price badge */}
        {price && (
          <div style={s.priceBadge}>
            <span style={s.priceBadgeLabel}>Asking price</span>
            <span style={s.priceBadgeValue}>${Number(price).toLocaleString()}</span>
          </div>
        )}

        {/* Summary banner */}
        <div style={{ ...s.card, borderLeft: `4px solid ${highRisk > 0 ? "var(--warning)" : "var(--primary)"}` }}>
          <p style={s.summaryText}>{report.buyer_summary}</p>
          <p style={s.generatedAt}>
            Report generated {new Date(report.generated_at).toLocaleString()}
          </p>
        </div>

        {/* Confidence gauge */}
        <ConfidenceGauge score={report.confidence_score} />

        {/* Vehicle identity */}
        {id && <IdentityCard identity={id} />}

        {/* Risk flags */}
        {report.risk_flags.length > 0 && <FlagsCard flags={report.risk_flags} />}

        {/* Recalls */}
        <RecallsCard recalls={report.recalls} openCount={report.open_recall_count} />

        {/* Timeline */}
        {report.events.length > 0 && <Timeline events={report.events} />}

        {/* Coverage */}
        <CoverageCard
          gaps={report.data_gaps}
          queried={report.sources_queried}
          available={report.sources_available}
          coverageMap={report.coverage_map}
        />

        <p style={s.legal}>
          This report reflects available reported data only. It is not an endorsement of vehicle condition.
          Private repairs, unreported incidents, and dealer-only records are not visible to this system.
          Always perform a pre-purchase inspection by a qualified mechanic.
        </p>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function ConfidenceGauge({ score }: { score: number }) {
  const color = score >= 70 ? "var(--success)" : score >= 40 ? "var(--warning)" : "var(--danger)";
  const label = score >= 70 ? "Good" : score >= 40 ? "Moderate" : "Low";
  return (
    <div style={s.card}>
      <div style={s.cardRow}>
        <div style={s.cardTitle}>Data Confidence</div>
        <div style={{ color, fontWeight: 700, fontSize: 18 }}>{score}/100</div>
      </div>
      <div style={s.gaugeTrack}>
        <div style={{ ...s.gaugeFill, width: `${score}%`, background: color }} />
      </div>
      <div style={{ color, fontSize: 12, fontWeight: 600, marginTop: 6 }}>{label} confidence</div>
      <p style={s.gaugeNote}>
        Score reflects completeness of available data sources. Higher = more data cross-referenced.
      </p>
    </div>
  );
}

function IdentityCard({ identity: id }: { identity: NonNullable<VehicleReport["identity"]> }) {
  const rows: [string, string | null | undefined][] = [
    ["Year", id.year?.value],
    ["Make", id.make?.value],
    ["Model", id.model?.value],
    ["Trim", id.trim?.value],
    ["Body", id.body_style?.value],
    ["Engine", id.engine?.value],
    ["Transmission", id.transmission?.value],
    ["Drive", id.drive_type?.value],
    ["Plant", id.plant_country?.value],
  ];
  return (
    <div style={s.card}>
      <div style={s.cardTitle}>Vehicle Identity</div>
      <table style={s.specTable}>
        <tbody>
          {rows.filter(([, v]) => v).map(([label, value]) => (
            <tr key={label}>
              <td style={s.specLabel}>{label}</td>
              <td style={s.specValue}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={s.vinRow}>
        <span style={s.specLabel}>VIN</span>
        <span style={{ ...s.specValue, fontFamily: "monospace", letterSpacing: 1 }}>{id.vin}</span>
      </div>
    </div>
  );
}

function FlagsCard({ flags }: { flags: RiskFlag[] }) {
  const severityColor = (s: string) =>
    s === "high" ? "var(--danger)" : s === "medium" ? "var(--warning)" : "var(--text-muted)";
  return (
    <div style={s.card}>
      <div style={s.cardTitle}>Risk Flags</div>
      {flags.map((f, i) => (
        <div
          key={i}
          style={{
            ...s.flagRow,
            borderLeft: `3px solid ${severityColor(f.severity)}`,
          }}
        >
          <div style={s.cardRow}>
            <span style={{ color: severityColor(f.severity), fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
              {f.severity}
            </span>
            <span style={s.flagSource}>{f.source}</span>
          </div>
          <div style={s.flagTitle}>{f.flag}</div>
          <div style={s.flagDetail}>{f.detail}</div>
        </div>
      ))}
    </div>
  );
}

function RecallsCard({ recalls, openCount }: { recalls: Recall[]; openCount: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={s.card}>
      <div style={s.cardRow}>
        <div style={s.cardTitle}>Safety Recalls ({recalls.length})</div>
        {openCount > 0 && (
          <span style={s.openBadge}>{openCount} open</span>
        )}
      </div>
      {recalls.length === 0 ? (
        <p style={s.emptyNote}>No recalls found for this vehicle.</p>
      ) : (
        <>
          {(expanded ? recalls : recalls.slice(0, 2)).map((r, i) => (
            <div key={i} style={s.recallRow}>
              <div style={s.cardRow}>
                <span style={s.recallCampaign}>{r.campaign_number}</span>
                <span style={{ ...s.recallStatus, color: r.status === "open" ? "var(--danger)" : "var(--success)" }}>
                  {r.status}
                </span>
              </div>
              <div style={s.recallComponent}>{r.component}</div>
              <div style={s.recallSummary}>{r.summary}</div>
              {r.remedy && <div style={s.recallRemedy}>Remedy: {r.remedy}</div>}
            </div>
          ))}
          {recalls.length > 2 && (
            <button style={s.showMoreBtn} onClick={() => setExpanded(!expanded)}>
              {expanded ? "Show less" : `Show ${recalls.length - 2} more`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Timeline({ events }: { events: HistoryEvent[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? events : events.slice(0, 5);
  return (
    <div style={s.card}>
      <div style={s.cardTitle}>History Timeline ({events.length} events)</div>
      {visible.map((ev, i) => (
        <div key={i} style={s.timelineRow}>
          <div style={s.timelineDot} />
          <div style={s.timelineContent}>
            <div style={s.timelineHeader}>
              <span style={s.timelineType}>{ev.event_type.replace(/_/g, " ")}</span>
              {ev.date && <span style={s.timelineDate}>{ev.date}</span>}
            </div>
            <div style={s.timelineDesc}>{ev.description}</div>
            {(ev.location || ev.odometer) && (
              <div style={s.timelineMeta}>
                {ev.location && <span>{ev.location}</span>}
                {ev.odometer && <span>{ev.odometer.toLocaleString()} mi</span>}
              </div>
            )}
            <div style={s.timelineSource}>{ev.source}</div>
          </div>
        </div>
      ))}
      {events.length > 5 && (
        <button style={s.showMoreBtn} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less" : `Show ${events.length - 5} more`}
        </button>
      )}
    </div>
  );
}

function CoverageCard({
  gaps, queried, coverageMap,
}: {
  gaps: string[];
  queried: string[];
  available: string[];
  coverageMap: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const dots = Object.entries(coverageMap);
  return (
    <div style={s.card}>
      <div style={s.cardRow}>
        <div style={s.cardTitle}>Data Coverage</div>
        <button style={s.expandBtn} onClick={() => setExpanded(!expanded)}>
          {expanded ? "▲" : "▼"}
        </button>
      </div>
      <div style={s.dotRow}>
        {dots.map(([key, val]) => {
          const ok = !val.startsWith("not_available");
          return (
            <div key={key} style={{ ...s.dot, background: ok ? "var(--success)" : "var(--border)" }}>
              <span style={s.dotLabel}>{key.replace(/_/g, " ")}</span>
            </div>
          );
        })}
      </div>
      {expanded && (
        <>
          {gaps.length > 0 && (
            <div>
              <div style={s.subTitle}>Gaps</div>
              {gaps.map((g, i) => (
                <div key={i} style={s.gapRow}>• {g}</div>
              ))}
            </div>
          )}
          <div>
            <div style={s.subTitle}>Sources queried</div>
            <div style={s.sourceList}>{queried.join(" · ")}</div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Styles ── */

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "var(--bg)",
    display: "flex",
    justifyContent: "center",
    padding: "16px 16px 48px",
  },
  container: { width: "100%", maxWidth: 640 },
  centered: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg)",
    padding: 32,
    gap: 12,
  },
  spinner: {
    width: 40,
    height: 40,
    border: "3px solid var(--border)",
    borderTop: "3px solid var(--primary)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { color: "var(--text-primary)", fontSize: 16, fontWeight: 600 },
  loadingSubtext: { color: "var(--text-muted)", fontSize: 12, letterSpacing: 0.5 },
  errorTitle: { color: "var(--text-primary)", fontSize: 18, fontWeight: 700 },
  errorMsg: { color: "var(--text-secondary)", fontSize: 14, textAlign: "center", maxWidth: 340 },
  retryBtn: {
    background: "var(--primary)", color: "#fff", borderRadius: 10,
    padding: "10px 24px", fontSize: 14, fontWeight: 600, marginTop: 8,
  },
  backLink: { color: "var(--primary)", fontSize: 13, marginTop: 4 },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  backBtn: {
    background: "var(--surface)",
    color: "var(--primary)",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  headerVehicle: { color: "var(--text-primary)", fontSize: 18, fontWeight: 700 },
  headerVin: { color: "var(--text-muted)", fontSize: 12, fontFamily: "monospace", marginTop: 2 },
  priceBadge: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "var(--surface)",
    borderRadius: 10,
    padding: "10px 16px",
    marginBottom: 12,
    border: "1px solid var(--border)",
  },
  priceBadgeLabel: { color: "var(--text-muted)", fontSize: 12 },
  priceBadgeValue: { color: "var(--text-primary)", fontSize: 16, fontWeight: 700 },
  card: {
    background: "var(--surface)",
    borderRadius: 14,
    padding: "16px 18px",
    marginBottom: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  cardTitle: { color: "var(--text-primary)", fontSize: 14, fontWeight: 700 },
  cardRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  summaryText: { color: "var(--text-primary)", fontSize: 14, lineHeight: 1.6 },
  generatedAt: { color: "var(--text-muted)", fontSize: 11 },
  gaugeTrack: {
    height: 8,
    background: "var(--surface-elevated)",
    borderRadius: 4,
    overflow: "hidden",
  },
  gaugeFill: { height: "100%", borderRadius: 4, transition: "width 0.5s ease" },
  gaugeNote: { color: "var(--text-muted)", fontSize: 11, lineHeight: 1.5 },
  specTable: { width: "100%", borderCollapse: "collapse" },
  specLabel: {
    color: "var(--text-muted)",
    fontSize: 12,
    paddingRight: 16,
    paddingBottom: 6,
    whiteSpace: "nowrap",
    verticalAlign: "top",
    width: 120,
  },
  specValue: { color: "var(--text-primary)", fontSize: 13, paddingBottom: 6 },
  vinRow: {
    display: "flex",
    gap: 16,
    paddingTop: 8,
    borderTop: "1px solid var(--border)",
  },
  flagRow: {
    background: "var(--surface-elevated)",
    borderRadius: 8,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  flagSource: { color: "var(--text-muted)", fontSize: 11 },
  flagTitle: { color: "var(--text-primary)", fontSize: 13, fontWeight: 600 },
  flagDetail: { color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.5 },
  openBadge: {
    background: "rgba(239,68,68,0.15)",
    color: "var(--danger)",
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 700,
  },
  recallRow: {
    borderBottom: "1px solid var(--border)",
    paddingBottom: 12,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  recallCampaign: { color: "var(--text-muted)", fontSize: 11, fontFamily: "monospace" },
  recallStatus: { fontSize: 11, fontWeight: 700, textTransform: "uppercase" },
  recallComponent: { color: "var(--text-primary)", fontSize: 13, fontWeight: 600 },
  recallSummary: { color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.5 },
  recallRemedy: { color: "var(--success)", fontSize: 11 },
  emptyNote: { color: "var(--text-muted)", fontSize: 13 },
  showMoreBtn: {
    background: "transparent",
    color: "var(--primary)",
    fontSize: 13,
    fontWeight: 600,
    textAlign: "left",
    padding: "4px 0",
    marginTop: 4,
  },
  timelineRow: {
    display: "flex",
    gap: 12,
    paddingBottom: 12,
    borderBottom: "1px solid var(--border)",
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "var(--primary)",
    marginTop: 5,
    flexShrink: 0,
  },
  timelineContent: { display: "flex", flexDirection: "column", gap: 3, flex: 1 },
  timelineHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  timelineType: {
    color: "var(--text-primary)",
    fontSize: 13,
    fontWeight: 600,
    textTransform: "capitalize",
  },
  timelineDate: { color: "var(--text-muted)", fontSize: 11 },
  timelineDesc: { color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.5 },
  timelineMeta: { display: "flex", gap: 12, color: "var(--text-muted)", fontSize: 11 },
  timelineSource: { color: "var(--primary)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  dotRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  dot: {
    borderRadius: 6,
    padding: "4px 10px",
    display: "flex",
    alignItems: "center",
  },
  dotLabel: { color: "#fff", fontSize: 11, fontWeight: 600, textTransform: "capitalize" },
  expandBtn: {
    background: "transparent",
    color: "var(--text-muted)",
    fontSize: 12,
    padding: "2px 6px",
  },
  subTitle: {
    color: "var(--text-muted)",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  gapRow: { color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.8 },
  sourceList: { color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.6 },
  legal: {
    color: "var(--text-muted)",
    fontSize: 11,
    lineHeight: 1.6,
    textAlign: "center",
    padding: "8px 16px",
    fontStyle: "italic",
    marginTop: 4,
  },
};
