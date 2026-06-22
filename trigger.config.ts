import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID!,
  dirs: ["./triggers"],
  maxDuration: 3600,
});
