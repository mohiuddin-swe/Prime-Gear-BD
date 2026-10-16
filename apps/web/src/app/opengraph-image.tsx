import { ImageResponse } from "next/og";

export const alt = "Prime Gear BD: Gear up, level up";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Default share card (home and any page without its own image). next/og can't use tokens, so the brand colors are literal here.
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        color: "white",
        background: "radial-gradient(60% 80% at 15% 0%, #1a56db 0%, #0b1220 70%)",
      }}
    >
      <div style={{ fontSize: 96, fontWeight: 800 }}>PRIME GEAR BD</div>
      <div style={{ fontSize: 40, color: "#22d3ee", letterSpacing: 8, marginTop: 16 }}>
        GEAR UP · LEVEL UP
      </div>
      <div style={{ fontSize: 32, marginTop: 40, color: "#cbd5e1" }}>
        Smart home, LED lighting and gadgets in Bangladesh
      </div>
    </div>,
    size,
  );
}
