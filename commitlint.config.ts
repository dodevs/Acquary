const Configuration = {
  extends: ["@commitlint/config-conventional"],
  ignores: [
    (message) => /^Bumps \[.+]\(.+\) from .+ to .+\\.$/m.test(message),
    (message) => /\#?\#\s?\[\d+\.\d+\.\d+\]/m.test(message),
  ],
  rules: {}
}

export default Configuration
