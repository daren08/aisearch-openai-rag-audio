import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { I18nextProvider } from "react-i18next";
import i18next from "./i18n/config";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "./msalConfig";

import App from "./App.tsx";
import "./index.css";

const msalInstance = new PublicClientApplication(msalConfig);

msalInstance.initialize().then(() => {
    createRoot(document.getElementById("root")!).render(
        <StrictMode>
            <MsalProvider instance={msalInstance}>
                <I18nextProvider i18n={i18next}>
                    <App />
                </I18nextProvider>
            </MsalProvider>
        </StrictMode>
    );
});
