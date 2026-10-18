import { ImageResponse } from "next/og";
import { getSiteSettings } from "@/lib/data";
import { getSiteHostname } from "@/lib/site-url";

export const runtime = "edge";
export const alt = "T V Ajay | Portfolio";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const fontData = await fetch(
    new URL("../assets/fonts/NotoSans-Regular.ttf", import.meta.url)
  ).then((res) => res.arrayBuffer());

  const settings = await getSiteSettings();

  const name = settings?.name || "T V Ajay";
  const title = settings?.title || "Computer Science Engineering Student";
  const headline = settings?.headline || "T V Ajay";
  const subtitle =
    settings?.subtitle ||
    "Computer Science Engineering student who enjoys building practical projects with AI, learning new technologies, and turning ideas into working solutions.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 80px",
          backgroundColor: "#0c0d14",
          color: "#f1f5f9",
          fontFamily: "NotoSans",
          position: "relative",
        }}
      >
        {/* Ambient cyan glow */}
        <div
          style={{
            position: "absolute",
            top: "-150px",
            right: "-150px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "rgba(0, 240, 255, 0.08)",
          }}
        />

        {/* Top Header: Monogram Logo & Role Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#161722",
                border: "1px solid rgba(0, 240, 255, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#00f0ff",
                fontSize: "22px",
                fontWeight: 700,
              }}
            >
              TV
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff" }}>
                {name}
              </span>
              <span style={{ fontSize: "14px", color: "#94a3b8" }}>
                {title}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "6px 14px",
              borderRadius: "20px",
              background: "rgba(0, 240, 255, 0.1)",
              border: "1px solid rgba(0, 240, 255, 0.3)",
              color: "#00f0ff",
              fontSize: "14px",
              letterSpacing: "1px",
            }}
          >
            PORTFOLIO // 2026
          </div>
        </div>

        {/* Main Content Body */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            maxWidth: "960px",
          }}
        >
          <div
            style={{
              fontSize: "52px",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.15,
            }}
          >
            {headline}
          </div>
          <div
            style={{
              fontSize: "22px",
              color: "#94a3b8",
              lineHeight: 1.45,
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* Bottom Bar: Tech Stack & Domain */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            paddingTop: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              fontSize: "15px",
              color: "#64748b",
            }}
          >
            <span>Next.js</span>
            <span>•</span>
            <span>TypeScript</span>
            <span>•</span>
            <span>Supabase</span>
            <span>•</span>
            <span>AI Systems</span>
          </div>

          <div
            style={{
              fontSize: "16px",
              color: "#00f0ff",
              fontWeight: 600,
            }}
          >
            {getSiteHostname()}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "NotoSans",
          data: fontData,
          style: "normal",
          weight: 400,
        },
      ],
    }
  );
}
