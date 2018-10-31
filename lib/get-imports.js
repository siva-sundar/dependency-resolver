
/* eslint-env node */

const j = require('jscodeshift');
const fs = require('fs');
const stripBom = require('strip-bom');
const path = require('path');

const { getAllFileNames } = require('./utils');
const { getDefineStatementMatcher  } = require('./utils/ast-matcher');
const plugins = require('./plugins');
const getHelpers = require('./utils/helpers');
const resolveDepedents = require('./utils/resolve-dependents');

const defineStatementMatcher = getDefineStatementMatcher();

module.exports = class GetImports {

  constructor({ projectRoot, inputFilePath, templatePathMap }) {
    this.externalModules = new Set();
    this.projectRoot = projectRoot;
    this.inputFilePath = path.join(projectRoot, inputFilePath);
    this.templatePathMap= templatePathMap;
    this.loadPlugins();
  }

  loadPlugins() {
    this.plugins = Object.keys(plugins).map(name => ({ name, plugin: plugins[name] }));
  }

  runPlugins({ nodePath, projectRoot, projectNameSpace, fileName, util, templatePathMap }) {
    let imports = [];

    this.plugins.forEach((row) => {
      imports = row.plugin({
        imports,
        nodePath,
        projectRoot,
        projectNameSpace,
        fileName,
        util,
        templatePathMap
      });
    });

    return imports;
  }

  getImports({ ast, util, files }) {
    let { projectRoot, templatePathMap } = this;

    ast.paths()[0].getValueProperty('program').body.forEach((node) => {
      if (j.match(node, defineStatementMatcher)) {
        let nodePath = j(node.expression).paths()[0];
        let [fileNode] = nodePath.getValueProperty('arguments');
        let fileName = fileNode.value;
        let [projectNameSpace] = fileName.split('/');
        let fileInstance = util.findFile(fileName);

        let imports = this.runPlugins({
          nodePath,
          projectRoot,
          projectNameSpace,
          fileName,
          util,
          templatePathMap
        });

        Object.assign(fileInstance, {
          imports,
          content: j(nodePath).toSource()
        });
      }
    });

    return files;
  }

  resolveDepedents({ files, util }) {
    return resolveDepedents({ files, util });
  }

  getAllFilesWithDepedencyImports() {
    let fileContent = stripBom(fs.readFileSync(this.inputFilePath, { encoding: 'utf8' }));
    let ast = j(fileContent);
    let files = getAllFileNames(ast);
    let util = getHelpers(files);

    return this.getImports({ files, ast, util });
  }
}
