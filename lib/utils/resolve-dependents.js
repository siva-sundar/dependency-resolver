const isFileResolvedAlready = function({ dependents, fileName }) {
  return dependents.find((fileInfo) => fileInfo.originalPath === fileName);
}

function getDepedents({ imports, dependents, util }) {
  imports.forEach((fileName) => {
    let fileInfo = util.findFile(fileName);

    if (!isFileResolvedAlready({ dependents, fileName })) {
      dependents.push(fileInfo);
      getDepedents({ imports: fileInfo.imports, dependents, util });
    }

  });
  return dependents;
}

module.exports = function resolveDepedents({ files,  util }) {
  files.forEach((file) => {
    let dependents = [];
    let fileInfo = util.findFile(file.originalPath);

    dependents.push(fileInfo);
    dependents = getDepedents({ imports: fileInfo.imports, dependents, util });
    fileInfo.dependents = dependents;
  });
  return files;
}
