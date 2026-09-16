#!/usr/bin/env node
import { startSiteServer, defaultPort } from "./site-server.mjs";

const { url } = await startSiteServer({ port: defaultPort });
console.log(`已在本机打开服务：${url}`);
console.log("按 Ctrl+C 结束。");
