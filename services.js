const express = require('express')
const chalk = require('chalk')
const glob = require('glob')
const {
  lstatSync,
  readFile,
  existsSync,
  writeFileSync
} = require('fs')
const path = require('path')
const isDirectory = source => lstatSync(source).isDirectory()

const getFileType =  (f) => {
    let type = '';
    if (f.indexOf('/plugins/') > -1) {
      type = 'plugins'
    } else {
      type = 'modules'
    }
  
    return type
}
  
const _readFile = (filename, enc) => {
    return new Promise(function (fulfill, reject) {
        readFile(filename, !!enc ? enc : 'utf8', function (err, res) {
        if (err) reject(err)
        else fulfill(res)
        });
    });
};

const _saveFile = (file, filePath) => {

    try {

        writeFileSync(filePath, file, 'utf8');
        chalk.green(`The file [ ${filePath} ] was saved!`);
    } catch (err) {
        return chalk.red(err);
    }
}

module.exports.update = (fulfill, reject) => {
    chalk.green('Creating apps ...');
    glob(process.env.ALGARCRM_WORKSPACE + '/**/source/*(modules|plugins)/*', {}, function (err, files) {
      if (!!err) {
        chalk.red('Error in create apps.');
        reject(err);
        return;
      }
      const apps = [];
      files.map((f) => {
        if (isDirectory(f)) {
          apps.push({
            name: path.basename(f),
            type: getFileType(f)
          });
        }
      });
      _saveFile(JSON.stringify(apps), 'apps.json')
      fulfill();
    });
}

const createAppContext = (app, _app) => {

    const subApp = express() // the sub app
  
    subApp.use(express.static(process.env.ALGARCRM_WORKSPACE  + `/source/${_app.type}/${_app.name}/target/webapp`));
  
    app.use(`/crm/resources/${_app.type}/${_app.name}`, subApp);
  
}
  
module.exports.create = (app, callback) => {
    if (existsSync('apps.json')) {
        _readFile('apps.json')
        .then((file) => {
            apps = JSON.parse(file);       
            apps.map((_app) => {
            console.log(chalk.blue(`Creating app context ${_app.type}/${_app.name}`));
            createAppContext(app, _app);
            });
            callback();
        });
    } else {
        callback();
    }
};