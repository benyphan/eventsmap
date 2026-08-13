import React from "react";
import { createRoot } from "react-dom/client";

let container = null;
let root = null;

function ensureRoot() {
  if (!container) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  }
  return root;
}

function renderDialog(title, message, buttons) {
  const r = ensureRoot();
  const close = () => r.render(null);
  const list = buttons && buttons.length ? buttons : [{ text: "OK" }];

  const btnStyle = (b) => ({
    flex: list.length > 1 ? 1 : "0 0 auto",
    minWidth: list.length > 1 ? 0 : 120,
    padding: "10px 16px",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 600,
    background: b.style === "cancel"
      ? "#f2f2f2"
      : b.style === "destructive"
      ? "#FF4458"
      : "#FF4458",
    color: b.style === "cancel" ? "#444" : "#fff",
  });

  r.render(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "-apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          maxWidth: 360,
          width: "100%",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
          textAlign: "center",
        }}
      >
        {title ? (
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{title}</div>
        ) : null}
        {message ? (
          <div
            style={{
              fontSize: 15,
              color: "#555",
              lineHeight: 1.45,
              marginBottom: 20,
              whiteSpace: "pre-wrap",
            }}
          >
            {message}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            flexDirection: list.length > 1 ? "row" : "column",
            gap: 10,
            justifyContent: "center",
          }}
        >
          {list.map((b, i) => (
            <button
              key={i}
              style={btnStyle(b)}
              onClick={() => {
                close();
                if (b.onPress) b.onPress();
              }}
            >
              {b.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function installWebAlert(Alert) {
  Alert.alert = (title, message, buttons) => renderDialog(title, message, buttons);
}
