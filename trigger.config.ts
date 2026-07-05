import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_pbcsmtpokuwcgpjcetxn", 
  dirs: ["trigger"],
  runtime: "node",
  maxDuration: 3600,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      randomize: true,
    },
  },
});
