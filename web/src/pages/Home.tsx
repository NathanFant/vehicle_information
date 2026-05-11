import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { lookupPlate } from "../api";

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV",
  "WI","WY","DC",
];

const SAMPLE_VINS = [
  { vin: "WBA3B1G54FNT63618", label: "2015 BMW 320i" },
  { vin: "1HGBH41JXMN109186", label: "Honda Civic (demo)" },
  { vin: "2T1BURHE0JC027151", label: "Toyota Corolla (demo)" },
];

export function Home() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"vin" | "plate">("vin");
  const [vin, setVin] = useState("");
  const [state, setState] = useState("CA");
  const [plate, setPlate] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cleanVin = vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/gi, "");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "vin") {
      if (!cleanVin) { setError("Please enter a VIN."); return; }
      if (cleanVin.length !== 17) { setError(`VIN must be 17 characters (currently ${cleanVin.length}).`); return; }
      if (!VIN_RE.test(cleanVin)) { setError("VIN contains invalid characters (I, O, Q not allowed)."); return; }
      navigate(`/report/${cleanVin}`, { state: { price } });
    } else {
      const cleanPlate = plate.toUpperCase().trim();
      if (!cleanPlate) { setError("Please enter a license plate."); return; }
      setLoading(true);
      try {
        const { vin: resolvedVin } = await lookupPlate(state, cleanPlate);
        navigate(`/report/${resolvedVin}`, { state: { price } });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Plate lookup failed.");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* Hero */}
        <div style={s.hero}>
          <div style={s.heroIcon}>🔍</div>
          <h1 style={s.heroTitle}>Vehicle History Intelligence</h1>
          <p style={s.heroSubtitle}>
            Get the best-attainable history snapshot from NHTSA, MarketCheck, and more — in seconds.
          </p>
        </div>

        {/* Form card */}
        <form style={s.card} onSubmit={handleSubmit}>
          {/* Mode tabs */}
          <div style={s.tabs}>
            <button
              type="button"
              style={{ ...s.tab, ...(mode === "vin" ? s.tabActive : {}) }}
              onClick={() => { setMode("vin"); setError(null); }}
            >
              VIN
            </button>
            <button
              type="button"
              style={{ ...s.tab, ...(mode === "plate" ? s.tabActive : {}) }}
              onClick={() => { setMode("plate"); setError(null); }}
            >
              License Plate
            </button>
          </div>

          {mode === "vin" ? (
            <div style={s.field}>
              <label style={s.label}>Vehicle Identification Number</label>
              <input
                style={{ ...s.input, fontFamily: "monospace", letterSpacing: 2 }}
                value={cleanVin}
                onChange={e => { setVin(e.target.value); setError(null); }}
                placeholder="e.g. 1HGBH41JXMN109186"
                maxLength={17}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
              <div style={s.vinMeta}>
                <span style={{ ...s.charCount, ...(cleanVin.length === 17 ? s.charCountDone : {}) }}>
                  {cleanVin.length}/17
                </span>
                {cleanVin.length === 17 && VIN_RE.test(cleanVin) && (
                  <span style={s.validMark}>✓ Valid format</span>
                )}
              </div>
            </div>
          ) : (
            <div style={s.plateRow}>
              <div style={{ ...s.field, flex: "0 0 90px" }}>
                <label style={s.label}>State</label>
                <select
                  style={s.select}
                  value={state}
                  onChange={e => setState(e.target.value)}
                >
                  {US_STATES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <div style={{ ...s.field, flex: 1 }}>
                <label style={s.label}>License Plate</label>
                <input
                  style={{ ...s.input, fontFamily: "monospace", letterSpacing: 2 }}
                  value={plate}
                  onChange={e => { setPlate(e.target.value.toUpperCase()); setError(null); }}
                  placeholder="e.g. 7XYZ123"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {/* Purchase price */}
          <div style={s.field}>
            <label style={s.label}>Expected Purchase Price (optional)</label>
            <div style={s.priceWrap}>
              <span style={s.priceDollar}>$</span>
              <input
                style={{ ...s.input, paddingLeft: 28 }}
                type="number"
                min="0"
                step="100"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="e.g. 12500"
              />
            </div>
          </div>

          {error && <div style={s.errorMsg}>{error}</div>}

          <button
            type="submit"
            style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
            disabled={loading}
          >
            {loading ? "Looking up plate…" : "Run Vehicle Check"}
          </button>
        </form>

        {/* Sample VINs */}
        <div style={s.card}>
          <div style={s.sampleTitle}>Try a sample VIN</div>
          {SAMPLE_VINS.map(sv => (
            <button
              key={sv.vin}
              style={s.sampleRow}
              onClick={() => navigate(`/report/${sv.vin}`)}
            >
              <span style={s.sampleLabel}>{sv.label}</span>
              <span style={s.sampleVin}>{sv.vin}</span>
            </button>
          ))}
        </div>

        {/* Disclaimer */}
        <div style={s.disclaimer}>
          <div style={s.disclaimerTitle}>What this report covers</div>
          <p style={s.disclaimerText}>
            • Vehicle identity &amp; build configuration (NHTSA){"\n"}
            • Open &amp; resolved safety recalls (NHTSA){"\n"}
            • Listing &amp; ownership history (MarketCheck){"\n"}
            • Accident &amp; title history (CARFAX — when available){"\n"}
            • Title brand &amp; salvage status (NMVTIS — when available)
          </p>
          <p style={s.disclaimerNote}>
            No API provides complete service history. Private repairs and unreported events are not visible to any system. Always get a pre-purchase inspection.
          </p>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "var(--bg)",
    display: "flex",
    justifyContent: "center",
    padding: "24px 16px 48px",
  },
  container: {
    width: "100%",
    maxWidth: 560,
  },
  hero: {
    textAlign: "center",
    padding: "40px 0 28px",
  },
  heroIcon: { fontSize: 48, marginBottom: 12 },
  heroTitle: {
    color: "var(--text-primary)",
    fontSize: 26,
    fontWeight: 800,
    marginBottom: 10,
  },
  heroSubtitle: {
    color: "var(--text-secondary)",
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: 380,
    margin: "0 auto",
  },
  card: {
    background: "var(--surface)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  tabs: {
    display: "flex",
    gap: 8,
    background: "var(--surface-elevated)",
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    padding: "8px 0",
    borderRadius: 7,
    background: "transparent",
    color: "var(--text-muted)",
    fontSize: 13,
    fontWeight: 600,
    transition: "all 0.15s",
  },
  tabActive: {
    background: "var(--primary)",
    color: "#fff",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  plateRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-end",
  },
  label: {
    color: "var(--text-muted)",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    background: "var(--surface-elevated)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "12px 14px",
    color: "var(--text-primary)",
    fontSize: 15,
    width: "100%",
  },
  select: {
    background: "var(--surface-elevated)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "12px 10px",
    color: "var(--text-primary)",
    fontSize: 15,
    width: "100%",
    appearance: "auto",
  },
  vinMeta: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 2,
  },
  charCount: {
    color: "var(--text-muted)",
    fontSize: 11,
  },
  charCountDone: { color: "var(--success)" },
  validMark: { color: "var(--success)", fontSize: 11, fontWeight: 600 },
  priceWrap: { position: "relative" },
  priceDollar: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--text-muted)",
    fontSize: 15,
    pointerEvents: "none",
  },
  errorMsg: {
    background: "rgba(239,68,68,0.12)",
    border: "1px solid var(--danger)",
    borderRadius: 8,
    padding: "10px 14px",
    color: "var(--danger)",
    fontSize: 13,
  },
  btn: {
    background: "var(--primary)",
    color: "#fff",
    borderRadius: 10,
    padding: "14px 0",
    fontSize: 15,
    fontWeight: 700,
    width: "100%",
    transition: "background 0.15s",
  },
  btnDisabled: { opacity: 0.5 },
  sampleTitle: {
    color: "var(--text-muted)",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sampleRow: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
    padding: "10px 0",
    borderBottom: "1px solid var(--border)",
    background: "transparent",
    color: "inherit",
    width: "100%",
    textAlign: "left",
    cursor: "pointer",
  },
  sampleLabel: { color: "var(--text-primary)", fontSize: 13, fontWeight: 500 },
  sampleVin: { color: "var(--primary)", fontSize: 12, fontFamily: "monospace" },
  disclaimer: {
    background: "var(--surface-elevated)",
    borderRadius: 12,
    padding: 16,
    borderLeft: "3px solid var(--primary)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  disclaimerTitle: {
    color: "var(--text-primary)",
    fontSize: 13,
    fontWeight: 700,
  },
  disclaimerText: {
    color: "var(--text-secondary)",
    fontSize: 12,
    lineHeight: 1.8,
    whiteSpace: "pre-line",
  },
  disclaimerNote: {
    color: "var(--text-muted)",
    fontSize: 11,
    lineHeight: 1.6,
    fontStyle: "italic",
  },
};
