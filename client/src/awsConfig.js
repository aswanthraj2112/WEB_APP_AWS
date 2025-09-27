let cachedConfig = null;
let configPromise = null;

function normaliseDomain(domain) {
  if (!domain) return undefined;
  return domain.replace(/^https?:\/\//i, "");
}

async function requestConfigFromApi() {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    throw new Error("VITE_API_URL is not defined. Update your frontend environment configuration.");
  }

  const response = await fetch(`${apiUrl}/config`, {
    headers: {
      "cache-control": "no-cache"
    }
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to load AWS configuration from API.");
  }

  const data = await response.json();
  const { region, userPoolId, userPoolClientId, domain } = data;

  if (!region || !userPoolId || !userPoolClientId) {
    throw new Error("Incomplete Cognito configuration received from API.");
  }

  const authConfig = {
    region,
    userPoolId,
    userPoolWebClientId: userPoolClientId,
    mandatorySignIn: true
  };

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
