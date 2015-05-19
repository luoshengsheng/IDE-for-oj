
var fs = require('fs');

var properties = {};

var hierarchy = [];

function findProps(base, elem) {
    var name = base + '.' + elem;
    return properties[name];
}

function debug(string) {
    //console.log("prop: " + string);
}
//配置文件命名
//从配置文件读取配置
function get(base, property, defaultValue) {
    var result = defaultValue;
    var source = 'default';
    hierarchy.forEach(function (elem) {
        var propertyMap = findProps(base, elem);
        if (propertyMap && property in propertyMap) {
            debug(base + '.' + property + ': overriding ' + source + ' value (' + result + ') with ' + propertyMap[property]);
            result = propertyMap[property];
            source = elem;
        }
    });
    debug(base + '.' + property + ': returning ' + result + ' (from ' + source + ')');
    return result;
}

function toProperty(prop) {
    if (prop == 'true' || prop == 'yes') return true;
    if (prop == 'false' || prop == 'no') return false;
    if (prop.match(/^[0-9]+$/)) return parseInt(prop);
    if (prop.match(/^[0-9]*\.[0-9]+$/)) return parseFloat(prop);
    return prop;
}

function parseProperties(blob, name) {
    var props = {};
    blob.split('\n').forEach(function (line, index) {
        line = line.replace(/#.*/, '').trim();
        if (!line) return;
        var split = line.match(/([^=]+)=(.*)/);
        if (!split) {
            console.log("Bad line: " + line + " in " + name + ":" + (index + 1));
            return;
        }
        props[split[1].trim()] = toProperty(split[2].trim());
        debug(split[1].trim() + " = " + split[2].trim());
    });
    return props;
}

function initialize(directory, hier) {
    if (hier === null) throw new Error('Must supply a hierarchy array');
    console.log("Reading properties from " + directory + " with hierarchy " + hier);
    hierarchy = hier;
    var endsWith = /\.properties$/;
    var propertyFiles = fs.readdirSync(directory).filter(function (filename) {
        return filename.match(endsWith);
    });
    properties = {};
    propertyFiles.forEach(function (file) {
        var baseName = file.replace(endsWith, '');
        file = directory + '/' + file;
        debug('Reading config from ' + file);
        properties[baseName] = parseProperties(fs.readFileSync(file, 'utf-8'), file);
    });
}

module.exports = {
    get: get,
    initialize: initialize
};
