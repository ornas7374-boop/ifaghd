import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setConcurrency(2);
Config.setPixelFormat("yuv420p");
Config.setCodec("h264");
Config.setOverwriteOutput(true);

// Point Remotion at the pre-installed Chromium in this sandbox
// (remotion.media is not on the network allowlist, so auto-download fails).
if (process.env.CHROMIUM_EXECUTABLE_PATH) {
  Config.setBrowserExecutable(process.env.CHROMIUM_EXECUTABLE_PATH);
}
