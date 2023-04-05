import {readFile, writeFile} from "fs/promises";
import {
  AuthenticationResult, ICachePlugin,
  Configuration,
  InteractiveRequest,
  LogLevel, NodeAuthOptions,
  PublicClientApplication,
  TokenCache,
  TokenCacheContext
} from "@azure/msal-node";
import {getEnvDir} from "./env";
import * as path from "path";

const cacheAccess = (env: string) => {
  const cacheFilePath = path.join(getEnvDir(env), '.cache.json');

  const before = async (cacheContext: TokenCacheContext) => {
    try {
      const cacheFile = await readFile(cacheFilePath, "utf-8");
      cacheContext.tokenCache.deserialize(cacheFile);
    } catch (err) {
      await writeFile(cacheFilePath, "");
      cacheContext.tokenCache.deserialize("");
    }
  }

  const after = async (cacheContext: TokenCacheContext) => {
    if (cacheContext.cacheHasChanged) {
      try {
        await writeFile(cacheFilePath, cacheContext.tokenCache.serialize());
      } catch (err) {
        console.error(err);
      }
    }
  }

  return {
    beforeCacheAccess: before,
    afterCacheAccess: after
  }
}
const msalConfig = (config: NodeAuthOptions, cachePlugin: ICachePlugin) => ({
  auth: config,
  cache: {
    cachePlugin
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message) {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Error,
    }
  }
} as Configuration);

export const GetToken = async (config: NodeAuthOptions, env: string) => {
  const pca: PublicClientApplication = new PublicClientApplication(msalConfig(config, cacheAccess(env)))
  const tokenCache: TokenCache = pca.getTokenCache();

  async function getAccount() {
    return await tokenCache.getAllAccounts();
  }

  const accounts = await getAccount();
  let result: AuthenticationResult | null;

  if (accounts.length > 0) {
    result = await pca.acquireTokenSilent({
      scopes: ["https://database.windows.net//.default"],
      account: accounts[0]
    });

    return result?.accessToken;
  }

  const interactiveRequest: InteractiveRequest = {
    scopes: ["https://database.windows.net//.default"],
    openBrowser: async (url) => {
      const opener = require('opener');
      opener(url);
    },
    successTemplate: `
            <html lang="HTML5">
                <head>
                    <title>Authentication Success</title>
                </head>
                <script>
                    setTimeout(() => {
                        window.close();
                    }, 1000);
                </script>
                <body>
                    <h1>Authentication Success</h1>
                    <p>This window will be closed now</p>
                </body>
            </html>
        `
  }

  result = await pca.acquireTokenInteractive(interactiveRequest);

  return result?.accessToken;

}
