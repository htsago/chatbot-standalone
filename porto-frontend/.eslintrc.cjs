module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  extends: ["eslint:recommended", "@vue/eslint-config-prettier"],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    "vue/multi-word-component-names": "off",
    "vue/no-reserved-component-names": "off",
    "no-unused-vars": "off",
    "no-constant-condition": "warn",
    "no-undef": "off",
  },
  overrides: [
    {
      files: ["*.vue"],
      extends: [
        "plugin:vue/vue3-essential",
        "eslint:recommended",
        "@vue/eslint-config-prettier",
      ],
      parser: "vue-eslint-parser",
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      rules: {
        "vue/multi-word-component-names": "off",
        "vue/no-reserved-component-names": "off",
        "no-undef": "off",
      },
    },
  ],
};
