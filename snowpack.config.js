// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    /* ... */
  },
  plugins: [
    ['@snowpack/plugin-typescript', {tsc: "tsc"}],
  ],
  packageOptions: {
    /* ... */
  },
  devOptions: {
    open: "chrome",
  },
  buildOptions: {
    out: "docs",
  },
};
