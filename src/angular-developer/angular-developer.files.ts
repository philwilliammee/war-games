import indexContent from "./angular-developer-files/index.ts?raw";
import tsconfigContent from "./angular-developer-files/tsconfig.json?raw";
import packageContent from "./angular-developer-files/package.json?raw";
import distIndexContent from "./angular-developer-files/dist/client/browser/index.html?raw";
import appComponentContent from "./angular-developer-files/src/app/app.component.ts?raw";
import appConfigContent from "./angular-developer-files/src/app/app.config.ts?raw";
import mainContent from "./angular-developer-files/src/main.ts?raw";
import stylesContent from "./angular-developer-files/src/styles.scss?raw";
import angularContent from "./angular-developer-files/angular.json?raw";
import tsconfigAppContent from "./angular-developer-files/tsconfig.app.json?raw";

export const files = {
  "index.ts": {
    file: {
      contents: indexContent,
    },
  },
  "tsconfig.json": {
    file: {
      contents: tsconfigContent,
    },
  },
  "package.json": {
    file: {
      contents: packageContent,
    },
  },
  dist: {
    directory: {
      client: {
        directory: {
          browser: {
            directory: {
              "index.html": {
                file: {
                  contents: distIndexContent, // Corrected to distIndexContent
                },
              },
            },
          },
        },
      },
    },
  },
  src: {
    directory: {
      app: {
        directory: {
          "app.component.ts": {
            file: {
              contents: appComponentContent,
            },
          },
          "app.config.ts": {
            file: {
              contents: appConfigContent,
            },
          },
        },
      },
      "main.ts": {
        file: {
          contents: mainContent,
        },
      },
      "index.html": {
        file: {
          contents: distIndexContent, // Corrected to distIndexContent
        },
      },
      "styles.scss": {
        file: {
          contents: stylesContent,
        },
      },
    },
  },
  "angular.json": {
    file: {
      contents: angularContent,
    },
  },
  "tsconfig.app.json": {
    file: {
      contents: tsconfigAppContent,
    },
  },
};
