var nopt = require('nopt'),
    os = require('os'),
    props = require('./lib/properties'),
    compileHandler = require('./lib/compile').compileHandler,
    express = require('express'),
    child_process = require('child_process'),
    http = require('http'),
    Promise = require('promise');
var File = require('./lib/file.js');

//*******begin 配置文件初始化-------------------------------------------------------------
//用于启动时 指定根目录和配置文件--env "" --rootDir ""
var opts = nopt({
    'env': [String],
    'rootDir': [String]
});

var propHierarchy = [
    'defaults',
    opts.env || 'dev',
    os.hostname()];

var rootDir = opts.rootDir || '.';

props.initialize(rootDir + '/config', propHierarchy);
//*******end of 配置文件初始化


var port = props.get('IDE-for-oj', 'port', 10000);
var staticMaxAgeMs = props.get('IDE-for-oj', 'staticMaxAgeMs', 0);


//*******配置页面属性选项OPTIONS-----------------------------------------------------------
//get /client-options.js的时候调用，，生成cilent-option.js文件，，定义一个全局变量OPTIONS
function clientOptionsHandler(compilers, fileSources) {
    //fileSources用于以后扩展，如果是从文件载入代码则有用
    //name 为sources源的类型，是文件还是浏览器，urlpart为文件存放位置，
    var sources = {name: "Browser", urlpart: "browser"};
    var options = {
        GCC_defaultCompiler: props.get('IDE-for-oj', 'GCC_defaultCompiler', ''),
        java_defaultCompiler: props.get('IDE-for-oj', 'java_defaultCompiler', ''),
        windowLocalPrefix: props.get("IDE-for-oj", "windowLocalPrefix","IDE-for-oj"),
        defaultSource: props.get('IDE-for-oj', 'defaultSource', ''),
        compilers: compilers,
        language: props.get("IDE-for-oj", "defaultLanguage"),
        compileOptions: props.get("IDE-for-oj", "options"),
        sources: sources,
        codeFile: ""
    };
    var text = "var OPTIONS = " + JSON.stringify(options) + ";";
    return function getClientOptions(req, res) {
        res.set('Content-Type', 'application/javascript');
        res.set('Cache-Control', 'public, max-age=' + staticMaxAgeMs);
        res.end(text);
    };
}


//******begin 初始化编译器-----------------------------------------------------------------
//获取远程编译器
function retryPromise(promiseFunc, name, maxFails, retryMs) {
    return new Promise(function (resolve, reject) {
        var fails = 0;
        function doit() {
            var promise = promiseFunc();
            promise.then(function (arg) {
                resolve(arg);
            }, function (e) {
                fails++;
                if (fails < maxFails) {
                    console.log("Failed " + name + " : " + e + ", retrying");
                    setTimeout(doit, retryMs);
                } else {
                    console.log("Too many retries for " + name + " : " + e);
                    reject(e);
                }
            });
        }
        doit();
    });
}

//读取编译器配置信息 
function configuredCompilers() {
    //从配置文件读取编译器
    var exes = props.get("IDE-for-oj", "compilers", "/usr/bin/g++").split(":");
    // name就是编译器路径
    return Promise.all(exes.map(function (name) {
        var type = "GCC";
        if(name.match("java")){
            type = "java";
        }
        //接着获取本地的编译器
        var base = "compiler." + name;
        //如果是在配置文件里有配置编译器的exe属性，则在配置中获得，，否则为空
        var exe = props.get("IDE-for-oj", base + ".exe", "");
        if (!exe) {
            return Promise.resolve({id: name, exe: name, name: name, type: type});
        }
        return Promise.resolve({
            id: name,
            exe: exe,
            name: props.get("IDE-for-oj", base + ".name", name),
            type: type,
            alias: props.get("IDE-for-oj", base + ".alias"),
            //获得版本的命令参数  eg：--version
            versionFlag: props.get("IDE-for-oj", base + ".versionFlag"),
        });
    }));
}

// 获取每个编译器信息，每一个compilerInfo都有id，exe，name----这里获得版本号和支持的option
function getCompilerInfo(compilerInfo) {
    if (Array.isArray(compilerInfo)) {
        return Promise.resolve(compilerInfo);
    }
    return new Promise(function (resolve) {
        var compiler = compilerInfo.exe;
        var versionFlag = compilerInfo.versionFlag || '--version';
        var optionsFlag = ' --target-help';
        if(compilerInfo.type == "java"){
            versionFlag = '-version';
            optionsFlag = ' -help';
        }
        //执行命令获取版本号
        child_process.exec(compiler + ' ' + versionFlag, function (err, output) {
            if (err) return resolve(null);
            //版本信息在第一行
            var version = output.split('\n')[0];
            //获得编译器支持的参数选项
            child_process.exec(compiler + optionsFlag, function (err, output) {
                var options = {};
                if (!err) {
                    var splitness = /--?[-a-zA-Z]+( ?[-a-zA-Z]+)/;
                    output.split('\n').forEach(function (line) {
                        var match = line.match(splitness);
                        if (!match) return;
                        options[match[0]] = true;
                    });
                }
                compilerInfo.version = version;
                compilerInfo.supportedOpts = options;
                resolve(compilerInfo);
            });
        });
    });
}

function findCompilers() {
    //configuredCompilers函数返回一个promise  还返回每个编译器信息{id，exe，name}数组
    return configuredCompilers()
        .then(function (compilers) {
            // 获取每个编译器信息
            return Promise.all(compilers.map(getCompilerInfo));
        })
        .then(function (compilers) {
            //apply原型fun.apply(thisarg,[array]);;apply函数扁平化数组，使数组成为一维的，然后传给fun函数做参数--》thisargfun([转化后的数组])
            compilers = Array.prototype.concat.apply([], compilers);
            //去掉空的
            compilers = compilers.filter(function (x) {
                return x !== null;
            });
            //排序
            compilers = compilers.sort(function (x, y) {
                return x.name < y.name ? -1 : x.name > y.name ? 1 : 0;
            });
            //显示每个编译器信息
            console.log("Compilers:id exe name type");
            compilers.forEach(function (c) {
                console.log(c.id + " : " + c.name + " : " + (c.exe || c.remote) + " : " + c.type);
            });
            return compilers;
        });
}
//*******end of 初始化编译器

//*******begin 启动服务器------------------------------------------------------------
//
findCompilers().then(function (compilers) {
    var webServer = express(),
    	setFavicon = require('serve-favicon'),
        setStatic = require('serve-static'),
        bodyParser = require('body-parser'),
        logger = require('morgan'),
        compression = require('compression');
        // ,restreamer = require('connect-restreamer');
    var path = require('path');
    var partials = require('express-partials');
    // view engine setup
    webServer.set('views', path.join(__dirname, 'views'));
    webServer.set('view engine', 'ejs');
    webServer.use(partials()); 

    var flash = require('connect-flash'); 
    var cookieParser = require('cookie-parser');
    webServer.use(cookieParser());
    //express4以后这样写
    //下面两句顺序颠倒了，会出现 Cannot read property 'Store' of undefined 问题
    var session = require('express-session');
    var MongoStore = require('connect-mongo')(session);
    var settings = require('./lib/DBsettings');
    
    webServer.use(flash());
    //session支持
    //如果secret的settings和DBsettings.js文件配置不一样就会出现`secret` option required for sessions错误
    webServer.use(session({
        secret: settings.cookieSecret,
        store: new MongoStore({
            db: settings.db,
            collection:'session'
        })  
    }));

    webServer
        .use(logger("combined"))
        .use(compression())
        //设置网站图标
        .use(setFavicon('static/favicon.ico'))
        //设置静态页面位置
        .use(setStatic('static', {maxAge: staticMaxAgeMs,'index': ['index.html', 'index.htm']}))
        // .use(restreamer())
        .use(bodyParser.json())
        .get('/client-options.js', clientOptionsHandler(compilers,null))
        .post('/compile', compileHandler(compilers));
    //不使用的话会无法解析req.body
    webServer.use(bodyParser.urlencoded({
        extended: false
    }));
    
    //路由控制
    var routes = require('./routes/index');
    var users = require('./routes/users');
    var test = require('./routes/test');
    //动态视图助手
    //这一段一定要在路由规划这前，，否则会出现user is not defined
    webServer.use(function(req, res, next){
      console.log("app.usr local" +req.session.user);
      console.log(req.headers);
      console.log(req.session);

      //res.locals变量的有效范围是一次请求响应循环
      res.locals.user = req.session.user;
      res.locals.post = req.session.post;
      var error = req.flash('error');
      res.locals.error = error.length ? error : null;
      var success = req.flash('success');
      res.locals.success = success.length ? success : null;
      next();
    });
    //路由规划
    webServer.use('/', routes);
    webServer.use('/users', users);
    webServer.use('/test', test);
    
    // GO!
    console.log("=======================================");
    console.log("Listening on "+port);
    console.log("=======================================");
    webServer.listen(port);
}).catch(function (err) {
    console.log("Error: " + err.stack);
});