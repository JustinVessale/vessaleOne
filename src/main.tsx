import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import { parseAmplifyConfig } from "aws-amplify/utils";

const amplifyConfig = parseAmplifyConfig(outputs);

// Configure Amplify with REST API endpoints
Amplify.configure({
  ...amplifyConfig,
  API: {
    ...amplifyConfig.API,
    REST: {
      'payment-api': (outputs as any).custom?.API?.['payment-api']
    }
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
