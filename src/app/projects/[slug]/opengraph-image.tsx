import { ImageResponse } from "next/og";
import { getProjectBySlug } from "@/lib/data";
import { getSiteHostname } from "@/lib/site-url";

export const runtime = "edge";
export const alt = "Project Case Study | T V Ajay";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const fontData = await fetch(
    new URL("../../../assets/fonts/NotoSans-Regular.ttf", import.meta.url)
  ).then((res) => res.arrayBuffer());

  const project = await getProjectBySlug(params.slug);

  const title = project?.title || "Case Study";
  const tagline =
    project?.tagline ||
    project?.description ||
    "Engineering and Architecture Case Study";
  const status =
    project?.status === "live"
      ? "Live Production"
      : project?.status === "completed"
      ? "Completed"
      : "In Development";

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
        {/* Subtle ambient cyan glow */}
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

        {/* Top Header */}
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
            <span style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff" }}>
              T V Ajay // Projects
            </span>
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
            {status.toUpperCase()}
          </div>
        </div>

        {/* Main Project Details */}
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
              fontSize: "56px",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.15,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: "22px",
              color: "#94a3b8",
              lineHeight: 1.45,
            }}
          >
            {tagline}
          </div>
        </div>

        {/* Bottom Bar */}
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
              gap: "12px",
              fontSize: "15px",
              color: "#64748b",
            }}
          >
            <span>Case Study</span>
            <span>•</span>
            <span>Architectural Breakdown</span>
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
