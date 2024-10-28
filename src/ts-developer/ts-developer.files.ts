// ts-developer/ts-developer.files.ts
export const files = {
  "index.ts": {
    file: {
      contents: /*typescript*/ `
import express from 'express';
import path from 'path-browserify';

const app = express();
const port = 3111;

// Serve static files from Angular's dist folder
const distPath = path.join(process.cwd(),  'dist', 'client', 'browser');
app.use(express.static(distPath));

// Serve index.html for all routes (Angular's single-page application fallback)
app.all('/*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log("Server is live at http://localhost:" + port);
});
`,
    },
  },
  "tsconfig.json": {
    file: {
      contents: `
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "NodeNext",
    "target": "ESNext",
    "lib": ["dom", "esnext"],
    "strict": true
  }
}`,
    },
  },
  "package.json": {
    file: {
      contents: `
{
  "name": "ts-server",
  "type": "module",
  "dependencies": {
    "express": "latest",
    "nodemon": "latest",
    "path-browserify": "latest",
    "tsx": "latest",
    "@angular-devkit/build-angular": "^18.1.2",
    "@angular/cli": "^18.1.2",
    "@angular/compiler-cli": "^18.1.0",
    "typescript": "~5.5.2",
    "@angular/animations": "^18.1.0",
    "@angular/common": "^18.1.0",
    "@angular/compiler": "^18.1.0",
    "@angular/core": "^18.1.0",
    "@angular/forms": "^18.1.0",
    "@angular/platform-browser": "^18.1.0",
    "@angular/platform-browser-dynamic": "^18.1.0",
    "@angular/router": "^18.1.0",
    "@angular/material": "^18.1.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0",
    "zone.js": "~0.14.3"
  },
  "scripts": {
    "start": "nodemon --watch './' --ext ts,html,scss,js --ignore 'node_modules/**' --delay 1 --exec 'tsx index.ts'",
    "build": "ng build",
    "watch": "ng build --watch --configuration development"
  }
}`,
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
                  contents: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Angular Client</title>
</head>
<body>
<h1>Welcome to Angular Client</h1>
  <app-root></app-root>
</body>
</html>
`,
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
              contents: /*typescript*/ `
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  template: \`
    <h1>Welcome to {{title}}!</h1>
  \`,
  styles: [],
})

export class AppComponent {
  title = 'client';
}
                `,
            },
          },
          "app.config.ts": {
            file: {
              contents: /*typescript*/ `
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    importProvidersFrom(BrowserAnimationsModule)
  ]
};
`,
            },
          },
        },
      },

      "main.ts": {
        file: {
          contents: /*typescript*/ `
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

          `,
        },
      },
      "index.html": {
        file: {
          contents: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Angular Client</title>
</head>
<body>
  <app-root></app-root>
</body>
</html>
`,
        },
      },
      "styles.scss": {
        file: {
          contents: `
  @use '@angular/material' as mat;

  @include mat.core();
  $client-theme: mat.define-theme((
    color: (
      theme-type: light,
      primary: mat.$azure-palette,
      tertiary: mat.$blue-palette,
    ),
    density: (
      scale: 0,
    )
  ));

  :root {
    @include mat.all-component-themes($client-theme);
  }

  html, body { height: 100%; }
  body { margin: 0; font-family: Verdana, Geneva, Tahoma, sans-serif }
  h1, h2, h3, h4, h5, h6 { font-family: Georgia, serif }
`,
        },
      },
    },
  },
  "angular.json": {
    file: {
      contents: `
      {
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "client": {
      "projectType": "application",
      "schematics": {
        "@schematics/angular:component": {
          "inlineTemplate": true,
          "inlineStyle": true,
          "style": "scss",
          "skipTests": true
        },
        "@schematics/angular:class": {
          "skipTests": true
        },
        "@schematics/angular:directive": {
          "skipTests": true
        },
        "@schematics/angular:guard": {
          "skipTests": true
        },
        "@schematics/angular:interceptor": {
          "skipTests": true
        },
        "@schematics/angular:pipe": {
          "skipTests": true
        },
        "@schematics/angular:resolver": {
          "skipTests": true
        },
        "@schematics/angular:service": {
          "skipTests": true
        }
      },
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:application",
          "options": {
            "outputPath": "dist/client",
            "index": "src/index.html",
            "browser": "src/main.ts",
            "polyfills": [
              "zone.js"
            ],
            "tsConfig": "tsconfig.app.json",
            "inlineStyleLanguage": "scss",
            "assets": [
              {
                "glob": "**/*",
                "input": "public"
              }
            ],
            "styles": [
              "src/styles.scss"
            ],
            "scripts": []
          },
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "500kB",
                  "maximumError": "1MB"
                },
                {
                  "type": "anyComponentStyle",
                  "maximumWarning": "2kB",
                  "maximumError": "4kB"
                }
              ],
              "outputHashing": "all"
            },
            "development": {
              "optimization": false,
              "extractLicenses": false,
              "sourceMap": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "configurations": {
            "production": {
              "buildTarget": "client:build:production"
            },
            "development": {
              "buildTarget": "client:build:development"
            }
          },
          "defaultConfiguration": "development"
        },
        "extract-i18n": {
          "builder": "@angular-devkit/build-angular:extract-i18n"
        }
      }
    }
  },
  "cli": {
    "analytics": false
  }
}
`,
    },
  },
  "tsconfig.app.json": {
    file: {
      contents: `
{
  "compileOnSave": false,
  "compilerOptions": {
    "outDir": "./dist/out-tsc",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "sourceMap": true,
    "declaration": false,
    "experimentalDecorators": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "module": "ES2022",
    "lib": [
      "ES2022",
      "dom"
    ]
  },
}
`,
    },
  },
};
