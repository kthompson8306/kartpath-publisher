import { useState } from "react";

const C = {
  brick: "#7B3022",
  honey: "#C8860A",
  honeyBg: "#FEF9EE",
  honeyBorder: "#E8C97A",
  pine: "#3D6B4F",
  pine2: "#5B8A6A",
  pineBg: "#F0F6F2",
  pineBorder: "#8BBD9E",
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

const DEMO_DESCRIPTION = `Nestled in the heart of historic downtown Senoia, The Painted Porch brings farm-fresh Southern cuisine to your table in a beautifully restored 1890s storefront. We source our produce weekly from Coweta County farms and our meat from two family ranches within 30 miles. Whether you are celebrating a special occasion or just want a quiet weekday lunch, our team takes pride in making every visit feel like a homecoming. Signature dishes include our cast-iron pork chop, shrimp and grits with Geechee Boy grits, and the seasonal cobbler that changes every Sunday. Reservations welcome — walk-ins always made to feel at home.`;

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default function BizListingPremium() {
  const [category] = useState("Dining & Drinks");
  const [phone] = useState("770-555-0202");
  const [website] = useState("https://paintedporch.example.com");
  const [address] = useState("6 Seavy Street, Senoia GA 30276");
  const [hours] = useState("Tue–Sun  11am–9pm\nMon  Closed");
  const [description, setDescription] = useState(DEMO_DESCRIPTION);

  const wc = wordCount(description);
  const wcColor = wc === 0 ? `${C.mutedFg}66` : wc >= 150 && wc <= 250 ? C.pine2 : wc > 250 ? C.honey : C.mutedFg;
  const wcMsg = wc === 0 ? null : wc >= 150 && wc <= 250
    ? <p style={{ margin: "4px 0 0", fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: "10px", color: C.pine2 }}>Good length — within the 150–250 word sweet spot.</p>
    : wc < 150
      ? <p style={{ margin: "4px 0 0", fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: "10px", color: C.mutedFg }}>A bit short — consider adding more to tell the full story.</p>
      : <p style={{ margin: "4px 0 0", fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: "10px", color: C.honey }}>Getting long — consider trimming to under 250 words.</p>;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      {/* Editor chrome */}
      <div style={{ background: "#EDEBE4", borderBottom: `1px solid ${C.input}`, padding: "8px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: C.brick }}>
          Business Listing
        </span>
        <span style={{ width: "1px", height: "14px", background: C.input }} />
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "10px", color: C.mutedFg }}>
          The Painted Porch
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
          <input style={{ ...inputStyle, fontSize: "14px", height: "40px" }} defaultValue="The Painted Porch" readOnly />
        </label>

        {/* Slug */}
        <label style={{ display: "block" }}>
          {fieldLabel("Slug")}
          <input style={inputStyle} defaultValue="the-painted-porch" readOnly />
        </label>

        {/* SEO Description */}
        <label style={{ display: "block" }}>
          {fieldLabel("SEO Description", "(optional · max 160 chars)")}
          <textarea
            style={{ width: "100%", border: `1px solid ${C.input}`, background: C.paper, padding: "10px 12px", fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "12px", outline: "none", resize: "vertical", lineHeight: "1.5", color: C.ink, minHeight: "60px" }}
            defaultValue="Farm-fresh Southern cuisine in a restored 1890s downtown Senoia storefront. Sourced locally, served warmly."
            readOnly
          />
        </label>

        {/* ✅ ABSENT: Standfirst, Pull Quote, Story Body */}
        <div style={{ border: `1px dashed ${C.honeyBorder}`, padding: "10px 14px", background: "#FFFDF5", borderRadius: "2px" }}>
          <p style={{ margin: 0, fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.12em", color: C.honey }}>
            ✓ Standfirst, Pull Quote &amp; Story Body hidden — not applicable to Business Listings
          </p>
        </div>

        {/* Business Listing block */}
        <div style={{ border: `1px solid ${C.honeyBorder}`, background: C.honeyBg, padding: "16px", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "2px" }}>
          {/* Header row with tier dropdown set to Premium */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <p style={{ ...sectionLabelStyle, margin: 0 }}>Business Listing fields</p>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <span style={{ ...labelStyle, margin: 0 }}>Tier</span>
              <div style={{ position: "relative" }}>
                <select
                  style={{ height: "32px", appearance: "none", border: `1px solid ${C.input}`, background: C.paper, paddingLeft: "10px", paddingRight: "26px", fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: "12px", outline: "none", color: C.ink, cursor: "pointer" }}
                  value="premium"
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
                <select style={{ ...inputStyle, appearance: "none", paddingRight: "28px", cursor: "pointer" }} value={category} onChange={() => {}}>
                  {["Home & Garden", "Dining & Drinks", "Health & Wellness", "Professional Services", "Golf Carts", "Churches", "Nonprofits"].map(c => <option key={c}>{c}</option>)}
                </select>
                <svg style={{ position: "absolute", right: "9px", top: "11px", pointerEvents: "none", color: C.mutedFg }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </label>
            <label style={{ display: "block" }}>
              {fieldLabel("Phone")}
              <input style={inputStyle} value={phone} readOnly />
            </label>
            <label style={{ display: "block" }}>
              {fieldLabel("Website")}
              <input style={inputStyle} value={website} readOnly />
            </label>
            <label style={{ display: "block" }}>
              {fieldLabel("Facebook URL", "(optional)")}
              <input style={inputStyle} defaultValue="https://facebook.com/paintedporch" readOnly />
            </label>
            <label style={{ display: "block", gridColumn: "1 / -1" }}>
              {fieldLabel("Instagram URL", "(optional)")}
              <input style={inputStyle} defaultValue="https://instagram.com/paintedporch" readOnly />
            </label>
          </div>
          <label style={{ display: "block" }}>
            {fieldLabel("Street address")}
            <input style={inputStyle} value={address} readOnly />
          </label>
          <label style={{ display: "block" }}>
            {fieldLabel("Hours")}
            <textarea
              style={{ width: "100%", border: `1px solid ${C.input}`, background: C.paper, padding: "10px 12px", fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "12px", outline: "none", resize: "vertical", lineHeight: "1.4", color: C.ink, minHeight: "52px" }}
              value={hours}
              readOnly
            />
          </label>

          {/* ★ Premium-only section — shown because tier = Premium */}
          <div style={{ border: `1px solid ${C.pineBorder}`, background: C.pineBg, padding: "14px", display: "flex", flexDirection: "column", gap: "12px", borderRadius: "2px" }}>
            <p style={{ margin: 0, fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: C.pine2 }}>
              ★ Premium features
            </p>
            <label style={{ display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                <span style={labelStyle}>
                  Business Description <span style={{ textTransform: "none", letterSpacing: "normal", opacity: 0.55, fontStyle: "italic" }}>(150–250 words recommended)</span>
                </span>
                <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "9px", color: wcColor, flexShrink: 0, tabularNums: true } as React.CSSProperties}>
                  {wc} words
                </span>
              </div>
              <textarea
                style={{ width: "100%", border: `1px solid ${C.input}`, background: C.paper, padding: "10px 12px", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "14px", outline: "none", resize: "vertical", lineHeight: "1.5", color: C.ink, minHeight: "168px" }}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
              {wcMsg}
            </label>
            <p style={{ margin: 0, fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: "10px", lineHeight: "1.6", color: `${C.mutedFg}AA` }}>
              Logo / hero image and gallery are managed in the sections below once the listing is saved.
            </p>
          </div>
        </div>

        {/* Business Logo / Hero Image — shown for Premium */}
        <div>
          <p style={{ ...labelStyle, marginBottom: "10px" }}>Business Logo / Hero Image</p>
          <div style={{ border: `2px dashed ${C.input}`, background: C.paper, padding: "32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.mutedFg} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
            <span style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: "11px", color: C.mutedFg }}>Upload logo or hero image</span>
            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "9px", color: `${C.mutedFg}88`, textTransform: "uppercase", letterSpacing: "0.1em" }}>JPG · PNG · WEBP · max 8 MB</span>
          </div>
        </div>

        {/* Gallery — shown for Premium */}
        <div style={{ border: `1px solid ${C.input}`, background: C.paper, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={labelStyle}>Gallery</span>
            <button style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: C.brick, background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}>+ Add Photo</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ aspectRatio: "1", background: `hsl(${160 + i * 15}, 12%, 88%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.mutedFg} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
              </div>
            ))}
            <div style={{ aspectRatio: "1", border: `2px dashed ${C.input}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.mutedFg} strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
          </div>
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
