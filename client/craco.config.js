const path = require('path');

const sharedPath = path.resolve(__dirname, '../shared');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Remove ModuleScopePlugin to allow imports from shared/
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
        plugin => plugin.constructor.name !== 'ModuleScopePlugin'
      );

      // Add shared path to the main ts/jsx loader's include
      const oneOfRule = webpackConfig.module.rules.find(rule => rule.oneOf);
      if (oneOfRule) {
        const tsRule = oneOfRule.oneOf.find(rule =>
          rule.test && rule.test.toString().includes('ts') && rule.include
        );
        if (tsRule) {
          const origInclude = tsRule.include;
          tsRule.include = Array.isArray(origInclude)
            ? [...origInclude, sharedPath]
            : [origInclude, sharedPath];
        }
      }

      return webpackConfig;
    },
  },
};
