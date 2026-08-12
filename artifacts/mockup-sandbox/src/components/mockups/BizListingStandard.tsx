import { useState } from "react";

const C = {
  brick: "#7B3022",
  honey: "#C8860A",
  honeyBg: "#FEF9EE",
  honeyBorder: "#E8C97A",
  mutedFg: "#7A7168",
  input: "#C4BDB5",
  bg: "#F8F6F0",
  paper: "#FAFAF9",
  ink: "#1C1814",
  inkSoft: "#5A534A",
} as const;

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: "9px",
  textTransform: "uppercase",
  letterSpacing: "0.13em",
  color: C.mutedFg,
  marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  height: "36px",
  width: "100%",
  border: `1px solid ${C.input}`,
  background: C.paper,
  padding: "0 12px",
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: "12px",
  outline: "none",
  color: C.ink,
};

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: "9px",
  textTransform: "uppercase",
  letterSpacing: "0.15em",
  color: C.brick,
};

const fieldLabel = (text: string, sub?: string) => (
  <span style={labelStyle}>
    {text}{sub && <span style={{ textTransform: "none", letterSpacing: "normal", opacity: 0.55, fontStyle: "italic" }}> {sub}</span>}
  </span>
);

export default function BizListingStandard() {
  const [category, setCategory] = useState("Home & Garden");
  const [phone, setPhone] = useState("770-555-0101");
  const [website, setWebsite] = useState("https://senoiahardware.example.com");
  const [address, setAddress] = useState("14 Main Street, Senoia GA 30276");
  const [hours, setHours] = useState("Mon–Fri  7am–6pm\nSat  8am–2pm\nSun  Closed");

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      {/* Editor chrome */}
      <div style={{ background: "#EDEBE4", borderBottom: `1px solid ${C.input}`, padding: "8px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: C.brick }}>
          Business Listing
        </span>
        <span style={{ width: "1px", height: "14px", background: C.input }} />
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "10px", color: C.mutedFg }}>
          Senoia Hardware &amp; Supply
        </span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "4px", background: "#E8E3DB", border: `1px solid ${C.input}`, padding: "2px 8px", fontSize: "9px", letterSpacing: "0.1em", fontFamily: "ui-monospace, SFMono-Regular, monospace", textTransform: "uppercase", color: C.inkSoft }}>
          Draft
        </span>
      </div>

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "28px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Content type indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.13em", color: C.mutedFg }}>Content Type</span>
          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "9px", padding: "2px 8px", border: `1px solid ${C.input}`, color: C.ink, letterSpacing: "0.05em" }}>Business Listing</span>
        </div>

        {/* Headline */}
        <label style={{ display: "block" }}>
          {fieldLabel("Business Name / Headline")}
          <input style={{ ...inputStyle, fontSize: "14px", height: "40px" }} defaultValue="Senoia Hardware & Supply" readOnly />
        </label>

        {/* Slug */}
        <label style={{ display: "block" }}>
          {fieldLabel("Slug")}
          <input style={inputStyle} defaultValue="senoia-hardware-supply" readOnly />
        </label>

        {/* SEO Description — IS shown for business listings */}
        <label style={{ display: "block" }}>
          {fieldLabel("SEO Description", "(optional · max 160 chars)")}
          <textarea
            style={{ width: "100%", border: `1px solid ${C.input}`, background: C.paper, padding: "10px 12px", fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "12px", outline: "none", resize: "vertical", lineHeight: "1.5", color: C.ink, minHeight: "60px" }}
            defaultValue="Your local hardware and supply store serving Senoia for over 30 years."
            readOnly
          />
        </label>

        {/* ✅ ABSENT: Standfirst, Pull Quote, Story Body — notice they are not here */}
        <div style={{ border: `1px dashed ${C.honeyBorder}`, padding: "10px 14px", background: "#FFFDF5", borderRadius: "2px" }}>
          <p style={{ margin: 0, fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: C.honey }}>
            ✓ Standfirst, Pull Quote &amp; Story Body are hidden for Business Listings
          </p>
        </div>

        {/* Business Listing block */}
        <div style={{ border: `1px solid ${C.honeyBorder}`, background: C.honeyBg, padding: "16px", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "2px" }}>
          {/* Header row with tier dropdown */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <p style={{ ...sectionLabelStyle, margin: 0 }}>Business Listing fields</p>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <span style={{ ...labelStyle, margin: 0 }}>Tier</span>
              <div style={{ position: "relative" }}>
                <select
                  style={{ height: "32px", appearance: "none", border: `1px solid ${C.input}`, background: C.paper, paddingLeft: "10px", paddingRight: "26px", fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: "12px", outline: "none", color: C.ink, cursor: "pointer" }}
                  value="standard"
                  onChange={() => {}}
                >
                  <option value="standard">Standard</option>
                  <option value="premium">★ Premium</option>
                </select>
                <svg style={{ position: "absolute", right: "7px", top: "10px", pointerEvents: "none", color: C.mutedFg }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </label>
          </div>

          {/* Standard fields grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <label style={{ display: "block" }}>
              {fieldLabel("Category")}
              <div style={{ position: "relative" }}>
                <select style={{ ...inputStyle, appearance: "none", paddingRight: "28px", cursor: "pointer" }} value={category} onChange={e => setCategory(e.target.value)}>
                  {["Home & Garden", "Dining & Drinks", "Health & Wellness", "Professional Services", "Golf Carts", "Churches", "Nonprofits"].map(c => <option key={c}>{c}</option>)}
                </select>
                <svg style={{ position: "absolute", right: "9px", top: "11px", pointerEvents: "none", color: C.mutedFg }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </label>
            <label style={{ display: "block" }}>
              {fieldLabel("Phone")}
              <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} />
            </label>
            <label style={{ display: "block" }}>
              {fieldLabel("Website")}
              <input style={inputStyle} value={website} onChange={e => setWebsite(e.target.value)} />
            </label>
            <label style={{ display: "block" }}>
              {fieldLabel("Facebook URL", "(optional)")}
              <input style={inputStyle} placeholder="https://facebook.com/yourbusiness" />
            </label>
            <label style={{ display: "block", gridColumn: "1 / -1" }}>
              {fieldLabel("Instagram URL", "(optional)")}
              <input style={inputStyle} placeholder="https://instagram.com/yourbusiness" />
            </label>
          </div>
          <label style={{ display: "block" }}>
            {fieldLabel("Street address")}
            <input style={inputStyle} value={address} onChange={e => setAddress(e.target.value)} />
          </label>
          <label style={{ display: "block" }}>
            {fieldLabel("Hours")}
            <textarea
              style={{ width: "100%", border: `1px solid ${C.input}`, background: C.paper, padding: "10px 12px", fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "12px", outline: "none", resize: "vertical", lineHeight: "1.4", color: C.ink, minHeight: "64px" }}
              value={hours}
              onChange={e => setHours(e.target.value)}
            />
          </label>

          {/* Premium section — ABSENT when Standard */}
          <div style={{ border: `1px dashed ${C.honeyBorder}`, padding: "10px 14px", background: "#FFFDF5", borderRadius: "2px" }}>
            <p style={{ margin: 0, fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: C.honey }}>
              ✓ Premium section (description + word counter) hidden — tier is Standard
            </p>
          </div>
        </div>

        {/* Cover photo — ABSENT for Standard business listing */}
        <div style={{ border: `1px dashed ${C.honeyBorder}`, padding: "10px 14px", background: "#FFFDF5", borderRadius: "2px" }}>
          <p style={{ margin: 0, fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: C.honey }}>
            ✓ Business Logo / Hero Image hidden — only shown for Premium tier
          </p>
        </div>

        {/* Gallery — ABSENT for Standard business listing */}
        <div style={{ border: `1px dashed ${C.honeyBorder}`, padding: "10px 14px", background: "#FFFDF5", borderRadius: "2px" }}>
          <p style={{ margin: 0, fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: C.honey }}>
            ✓ Gallery hidden — only shown for Premium tier
          </p>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: `1px solid ${C.input}`, paddingTop: "16px" }}>
          <button style={{ padding: "8px 18px", border: `1px solid ${C.input}`, background: C.paper, fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer", color: C.inkSoft }}>
            Save Draft
          </button>
          <button style={{ padding: "8px 18px", background: C.ink, border: "none", color: C.bg, fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer" }}>
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}
