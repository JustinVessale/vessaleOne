import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Amplify } from "aws-amplify";
import { parseAmplifyConfig } from "aws-amplify/utils";

// For Gen2, the configuration is automatically injected into window.aws_exports
declare const aws_exports: any;
const amplifyConfig = parseAmplifyConfig(aws_exports);

// Configure Amplify with REST API endpoints
Amplify.configure({
  ...amplifyConfig,
  API: {
    ...amplifyConfig.API,
    REST: {
      'payment-api': aws_exports.custom?.API?.['payment-api']
    }
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
