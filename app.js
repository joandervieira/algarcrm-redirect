const express = require('express')
const chalk = require('chalk')

const {
  update,
  create
} = require('./services')

//My proxy app
const app = express()

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
})

app.get('/update', function (req, res, next) {
  update(() => {
    res.send('Apps updated successfully!');
    next();
  }, () => {
    res.status(500).send('Error updating apps!');
    next();
  });
})

//Create apps context
create(app, () => {
  app.listen(5000, function () {
    console.log(chalk.blue('AlgarCRM proxy on port 5000'));
  });
});