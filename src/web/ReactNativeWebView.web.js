import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { View } from "react-native";

// Веб-реализация WebView: рендерит iframe с переданным HTML и пробрасывает
// сообщения между страницей и приложением (как window.ReactNativeWebView.postMessage).
function injectBridge(html) {
  if (!html) return html;
  const bridge = `<script>
(function () {
  window.ReactNativeWebView = {
    postMessage: function (data) {
      window.parent.postMessage(data, '*');
    }
  };
})();
</script>`;
  const idx = html.indexOf("<head>");
  if (idx === -1) return html;
  return html.slice(0, idx + 6) + bridge + html.slice(idx + 6);
}

const ReactNativeWebView = forwardRef(function ReactNativeWebView(
  { source, onMessage, onLoadEnd, style, ...rest },
  ref
) {
  const iframeRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  const onLoadEndRef = useRef(onLoadEnd);
  onMessageRef.current = onMessage;
  onLoadEndRef.current = onLoadEnd;

  useEffect(() => {
    const handler = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = typeof event.data === "string" ? event.data : String(event.data || "");
      onMessageRef.current?.({ nativeEvent: { data } });
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      postMessage: (data) => {
        iframeRef.current?.contentWindow?.postMessage(String(data), "*");
      },
      reload: () => {},
      stopLoading: () => {},
    }),
    []
  );

  const html = source?.html ? injectBridge(source.html) : "";

  return (
    <View style={[{ flex: 1 }, style]}>
      <iframe
        ref={iframeRef}
        srcDoc={html}
        onLoad={() => onLoadEndRef.current?.()}
        title="webview"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </View>
  );
});

export { ReactNativeWebView as WebView };
export default ReactNativeWebView;
