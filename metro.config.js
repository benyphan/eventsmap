const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "react-native-webview") {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "src/web/ReactNativeWebView.web.js"),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
