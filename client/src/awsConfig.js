import { getApiUrl } from "./utils/apiUrl.js";

let cachedConfig = null;
let configPromise = null;

function normaliseDomain(domain) {
  if (!domain) return undefined;
  return domain.replace(/^https?:\/\//i, "");
}

async function requestConfigFromApi() {
  const apiUrl = getApiUrl();

  let response;
  try {
    response = await fetch(`${apiUrl}/config`, {
      headers: {
        "cache-control": "no-cache"
      }
    });
  } catch (error) {
    throw new Error(
      `Failed to contact backend at ${apiUrl}/config. ${error?.message || "Network request failed."}`
    );
  }
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to load AWS configuration from API.");
  }

  const data = await response.json();
  const { region, userPoolId, userPoolClientId, userPoolClientSecret, domain } = data;

  if (!region || !userPoolId || !userPoolClientId) {
    throw new Error("Incomplete Cognito configuration received from API.");
  }

  const authConfig = {
    region,
    userPoolId,
    userPoolWebClientId: userPoolClientId,
    mandatorySignIn: true
  };

  if (userPoolClientSecret) {
    authConfig.clientSecret = userPoolClientSecret;
  }

  const normalisedDomain = normaliseDomain(domain);
  if (normalisedDomain) {
    authConfig.oauth = {
      domain: normalisedDomain,
      scope: ["email", "openid", "profile"],
      redirectSignIn: window.location.origin,
      redirectSignOut: window.location.origin,
      responseType: "code"
    };
  }

  return { Auth: authConfig };
}

export async function getAwsConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (!configPromise) {
    configPromise = requestConfigFromApi()
      .then((config) => {
        cachedConfig = config;
        return config;
      })
      .catch((error) => {
        configPromise = null;
        throw error;
      });
  }

  return configPromise;
}
