const express = require('express')
const chalk = require('chalk')
const glob = require('glob')
const parseXml = require('xml2js').parseString
const async = require('async')
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

const getContexts = (path) => {

  return new Promise((fulfill, reject) => {
    
    let _path = path + '/src/main/resources/descriptor.xml'; 

    if (existsSync(_path)) {
      _readFile(_path)
      .then((file) => {

        parseXml(file, (err, result) => {

          if(err) {
            reject(err);              
          }
  
          if(!!result && !!result.settings && !!result.settings.resources) {
            var contexts = [];
            result.settings.resources.map((_resource) => {
              if(!!_resource.resource) {                  
                _resource.resource.map((res) => {
                  if(!!res['$'] && !!res['$']['local-context']) {
                    if(res['$']['local-context'] === '/scripts') {
                      var _contex = res['$']['web-context'];
                      var contextName = _contex.substring(
                        _contex.lastIndexOf('/modules/'), 
                        _contex.lastIndexOf('/scripts'));
                        
                      contexts.push(contextName);  
                    }
                  } 
                });                  
              }
            });
            fulfill(contexts);
          } else {
            fulfill([]);
          }   
        });             
      });  
    } else {
      fulfill([]);
    }
  });  
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

    async.eachSeries(files, function iterate(f, callback) {      
      if (isDirectory(f)) {
        getContexts(f)
          .then((contexts) => {
            if(contexts.length > 0) {
              apps.push({
                name: path.basename(f),
                type: getFileType(f),
                contexts
              });
            }           
            callback();
          });                  
      } else {
        callback();
      }
    }, function done() {
      _saveFile(JSON.stringify(apps), 'apps.json')
      fulfill();
    });      
  });
}

const createAppContext = (app, _app) => {

  if(!!_app.contexts) {
    _app.contexts.map((c) => {
      const subApp = express() // the sub app
  
      subApp.use(express.static(process.env.ALGARCRM_WORKSPACE  + `/source/${_app.type}/${_app.name}/target/webapp`));
      
      console.log(chalk.blue(`Creating app context /crm/resources${c}`));

      app.use(`/crm/resources${c}`, subApp);
    });
  }  
}
  
module.exports.create = (app, callback) => {
    if (existsSync('apps.json')) {
        _readFile('apps.json')
        .then((file) => {
            apps = JSON.parse(file);       
            apps.map((_app) => {            
            createAppContext(app, _app);
            });
            callback();
        });
    } else {
        callback();
    }
};