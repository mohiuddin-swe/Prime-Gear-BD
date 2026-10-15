import next from "eslint-config-next";
import base from "../../eslint.config.mjs";

const config = [...base, ...next];
export default config;
