var moment = require('moment');
var colors = require('colors');

module.exports = function(){
    var args = [];
    for (var i = 0; i < arguments.length; ++i) args[i] = arguments[i];
    var ts = colors.cyan(moment().format('YYYY-MM-DD HH:mm:ss'));
    args.unshift(ts);
    console.log.apply(console, args);
}
