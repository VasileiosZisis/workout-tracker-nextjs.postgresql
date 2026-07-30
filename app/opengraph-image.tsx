import { ImageResponse } from "next/og";

export const alt = "Workout Trackr — log workouts and measure progress";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: "linear-gradient(135deg, #07090f 0%, #0a1220 55%, #11102a 100%)",
          color: "#f4f7fb",
          fontFamily: "sans-serif",
          padding: "72px 80px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -100,
            width: 500,
            height: 500,
            border: "90px solid rgba(96, 165, 250, 0.12)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -210,
            left: 420,
            width: 440,
            height: 440,
            border: "80px solid rgba(167, 139, 250, 0.1)",
            borderRadius: "50%",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              color: "#8d96a8",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            Personal training log
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 650,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  fontSize: 78,
                  fontWeight: 800,
                  letterSpacing: -5,
                  lineHeight: 1,
                }}
              >
                <span>Workout</span>
                <span style={{ color: "#60a5fa" }}>Trackr</span>
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 34,
                  color: "#b9c2d3",
                  fontSize: 38,
                  fontWeight: 500,
                  letterSpacing: -1,
                  lineHeight: 1.25,
                }}
              >
                Log workouts. Measure progress.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-around",
                width: 300,
                height: 250,
                border: "1px solid #30384d",
                borderRadius: 28,
                background: "rgba(16, 21, 32, 0.78)",
                padding: "42px 34px 34px",
              }}
            >
              {[52, 86, 112, 148].map((height, index) => (
                <div
                  key={height}
                  style={{
                    width: 38,
                    height,
                    borderRadius: 12,
                    background:
                      index === 3
                        ? "linear-gradient(180deg, #a78bfa 0%, #60a5fa 100%)"
                        : "linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)",
                    opacity: 0.66 + index * 0.1,
                  }}
                />
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              color: "#8d96a8",
              fontSize: 21,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            WEIGHTLIFTING&nbsp;&nbsp;·&nbsp;&nbsp;PACE&nbsp;&nbsp;·&nbsp;&nbsp;PROGRESS
          </div>
        </div>
      </div>
    ),
    size,
  );
}
