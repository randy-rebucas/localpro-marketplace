import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const W = 1200;
const H = 630;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title       = searchParams.get("title")       ?? "Hire Trusted Local Service Professionals";
  const description = searchParams.get("description") ?? "Post jobs · Get quotes · Pay securely with escrow";
  const tag         = searchParams.get("tag")         ?? "";   // e.g. "Open Job", "Category", etc.

  // Load logo from filesystem (works in both dev and prod on Vercel)
  const logoData   = await readFile(path.join(process.cwd(), "public/logo-text.jpg"));
  const logoBase64 = `data:image/jpeg;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow circles */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "rgba(37,99,235,0.12)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -100,
            width: 380,
            height: 380,
            borderRadius: "50%",
            background: "rgba(37,99,235,0.09)",
            display: "flex",
          }}
        />

        {/* Optional tag badge */}
        {tag && (
          <div
            style={{
              display: "flex",
              background: "rgba(37,99,235,0.25)",
              border: "1px solid rgba(96,165,250,0.4)",
              borderRadius: 999,
              padding: "8px 24px",
              marginBottom: 28,
              color: "#93c5fd",
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {tag}
          </div>
        )}

        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoBase64}
          alt="LocalPro"
          width={380}
          height={120}
          style={{ objectFit: "contain", marginBottom: 36 }}
        />

        {/* Title */}
        <div
          style={{
            display: "flex",
            color: "#f1f5f9",
            fontSize: title.length > 50 ? 36 : 44,
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.25,
            maxWidth: 900,
            marginBottom: 20,
          }}
        >
          {title}
        </div>

        {/* Description */}
        <div
          style={{
            display: "flex",
            color: "#94a3b8",
            fontSize: 24,
            fontWeight: 400,
            textAlign: "center",
            maxWidth: 780,
            marginBottom: 40,
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>

        {/* Divider + URL */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 64,
              height: 3,
              borderRadius: 2,
              background: "linear-gradient(90deg, #1d4ed8, #2563eb)",
              display: "flex",
            }}
          />
          <div
            style={{
              color: "rgba(96,165,250,0.9)",
              fontSize: 22,
              fontWeight: 500,
              display: "flex",
            }}
          >
            www.localpro.asia
          </div>
        </div>

        {/* Bottom accent strip */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "linear-gradient(90deg, #1d4ed8, #2563eb)",
            display: "flex",
          }}
        />
      </div>
    ),
    { width: W, height: H }
  );
}
