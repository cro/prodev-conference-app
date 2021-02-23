import pkg from "swagger-ui-dist";
const { absolutePath } = pkg;
import fs from "fs";
import Router from "@koa/router";
import SwaggerParser from "swagger-parser";

export const router = new Router();

let api = null;

router.get("/api-docs.json", async (ctx) => {
  if (api === null) {
    api = await SwaggerParser.validate("./src/docs/openapi.yml");
  }
  ctx.body = api;
});

/** Swagger UI */

router.get("/swagger-ui-config.json", (ctx) => {
  ctx.response.body = {
    urls: [{ name: "api-doc", url: "/api-docs.json" }],
    displayOperationId: true,
    displayRequestDuration: true,
    showExtensions: true,
    defaultModelsExpandDepth: 0,
  };
});

const { readFileSync } = fs;

const filesInfo = {
  "/swagger-ui": "index.html",
  "/swagger-ui.css": "swagger-ui.css",
  "/swagger-ui-bundle.js": "swagger-ui-bundle.js",
  "/swagger-ui-standalone-preset.js": "swagger-ui-standalone-preset.js",
};

for (let k of Object.keys(filesInfo)) {
  let key = k;
  const path = `${absolutePath()}/${filesInfo[key]}`;
  let content = readFileSync(path, "utf-8");

  if (key === "/swagger-ui") {
    const oldSegment = /url: "(http|https):\/\/petstore\.swagger\.io\/v2\/swagger\.json",/;
    const newSegment = 'configUrl: "./swagger-ui-config.json",';
    content = content.replace(oldSegment, newSegment);
  }

  router.get(key, (ctx) => {
    if (key.endsWith(".js")) {
      ctx.type = "application/javascript";
    } else if (key.endsWith(".css")) {
      ctx.type = "text/css";
    } else {
      ctx.type = "text/html";
    }
    ctx.body = content;
  });
}
