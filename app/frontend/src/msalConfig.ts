import { Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
    auth: {
        clientId: "c4f9d68c-10c1-4722-bb75-9e67e8f8b7bd", // TODO: Replace with your Azure AD App Registration clientId
        authority: "https://login.microsoftonline.com/ba16567c-026d-478d-957e-68bdf3db5530", // Or your tenant-specific authority
        redirectUri: window.location.origin
    },
    cache: {
        cacheLocation: "localStorage",
        storeAuthStateInCookie: false
    }
};
