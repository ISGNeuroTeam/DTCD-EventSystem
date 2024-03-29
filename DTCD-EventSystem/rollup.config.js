import json from '@rollup/plugin-json';

import { version } from './package.json';
import babel from '@rollup/plugin-babel';

const watch = Boolean(process.env.ROLLUP_WATCH);

const pluginName = 'EventSystem';

const fileDest = watch
  ? `./../../DTCD/server/plugins/DTCD-${pluginName}_${version}/${pluginName}.js`
  : `./build/${pluginName}.js`;

const plugins = [babel({ babelHelpers: 'bundled' }), json()];

export default {
  input: './src/EventSystem.js',
  output: {
    file: fileDest,
    format: 'esm',
    sourcemap: false,
  },
  watch: {
    include: ['./*/**'],
  },
  plugins,
};
