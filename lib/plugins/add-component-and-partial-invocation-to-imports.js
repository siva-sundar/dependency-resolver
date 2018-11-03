/* eslint-env node */
const fs = require('fs');
const j = require('jscodeshift');
const { preprocess } = require('@glimmer/syntax');
const stripBom = require('strip-bom');

const {
  getTemplateStringMatcher
} = require('../utils/ast-matcher');
const dotTransform = require('../glimmer-plugins/dot-transform');
const getPlugin = require('../glimmer-plugins/component-partial-ast-visitor');
const { isTemplate } = require('../utils');

module.exports = function addComponentAndPartialInvocationToImports({
  nodePath,
  imports,
  projectRoot,
  projectNameSpace,
  fileName,
  templatePathMap,
  util }) {

  if (!isTemplate(fileName)) {
    return imports;
  }

  let templateStringPath = j(nodePath).find(j.CallExpression, getTemplateStringMatcher());

  if (templateStringPath.length) {
    let partials = new Set();
    let components = new Set();
    templateStringPath = templateStringPath.find(j.Property, { key: { type: 'Literal', value: 'moduleName' } }).paths()[0];
    let templateString = templateStringPath.getValueProperty('value').value;
    let templatePath = templatePathMap[projectNameSpace];
    let filePath = templateString.replace(`${projectNameSpace}/`, `${templatePath}/`); // my-app/templates/loading.hbs => /Home/app/templates/loading.hbs

    let content = fs.readFileSync(filePath, { encoding: 'utf8' });

    preprocess(stripBom(content), {
      moduleName: filePath,
      rawSource: stripBom(content),
      plugins: {
        ast: [dotTransform, getPlugin({ projectRoot, components, partials, projectNameSpace, util })],
      },
    });

    // let compiledBlockNodePath = templateStringPath.find(j.Property, { key: { type: 'Literal', value: 'block' } });
    // let compiledBlock = JSON.parse(compiledBlockNodePath.getValueProperty('value').value);

    // let dynamicImports = parseStatements(compiledBlock.statements);
    // console.log(partials, components); //eslint-disable-line

    partials.forEach((importPath) => {
      let partialFile = util.resolveFilePath(importPath);

      if (partialFile) {
        imports.push(partialFile);
      }
    });

    components.forEach((importPath) => {
      let componentFile = util.resolveFilePath(importPath);

      if (componentFile) {
        imports.push(componentFile);
      }
    });
  }

  return imports;
}
