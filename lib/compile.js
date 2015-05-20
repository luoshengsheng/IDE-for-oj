// post 请求编译处理 

var props = require('./properties'),
    child_process = require('child_process'),
    //设置临时文件
    temp = require('temp'),
    path = require('path'),
    httpProxy = require('http-proxy'),
    // LRU是近期最少使用算法
    LRU = require('lru-cache'),
    fs = require('fs-extra'),
    Promise = require('promise'),
    Queue = require('promise-queue');

Queue.configure(Promise);
temp.track();

function Compile(compilers) {
    this.compilersById = {};
    var self = this;
    //获取编译器
    compilers.forEach(function (compiler) {
        self.compilersById[compiler.id] = compiler;
    });
    //操作option白名单，黑名单
    this.okOptions = new RegExp(props.get('IDE-for-oj', 'whitelistRe', '.*'));
    this.badOptions = new RegExp(props.get('IDE-for-oj', 'blacklistRe'));
    //缓存，，一个缓存对象,删除最近最少使用的物品。
    this.cache = LRU({
        max: props.get('IDE-for-oj', 'cacheMb',"200") * 1024 * 1024,
        length: function (n) {
            return n.length;
        }
    });
    this.cacheHits = 0;
    this.cacheMisses = 0;
    //设置promise队列
    this.compileQueue = new Queue(props.get("IDE-for-oj", "maxConcurrentCompiles", 1), Infinity);
}
//创建一个临时目录，并返回目录路径
Compile.prototype.newTempDir = function () {
    return new Promise(function (resolve, reject) {
        temp.mkdir('IDE-for-oj-compiler', function (err, dirPath) {
            if (err)
                reject("Unable to open temp file: " + err);
            else
                resolve(dirPath);
        });
    });
};
// Promise.donodeify(function),,接收一个普通node回调方式的函数，返回一个以promise方式运行的函数
Compile.prototype.writeFile = Promise.denodeify(fs.writeFile);
Compile.prototype.readFile = Promise.denodeify(fs.readFile);

//返回文件信息包含size，nlink，uid，gid，dev，rdev，ino，atime，mtime，ctime
Compile.prototype.stat = Promise.denodeify(fs.stat);

Compile.prototype.getRemote = function (compiler) {
    var compilerInfo = this.compilersById[compiler];
    if (!compilerInfo) return false;
    if (compilerInfo.exe === null && compilerInfo.remote)
        return compilerInfo.remote;
    return false;
};
//----------------------重点函数--------------------------------------------------
//执行命令
Compile.prototype.runCompiler = function (compilerExe, options, language) {
    var okToCache = true;
    //spawn和exec   执行编译
    var child = child_process.spawn(
        compilerExe,
        options,
        {detached: true}
    );
    var stdout = "";
    var stderr = "";
    var compileTimeoutMs = props.get("IDE-for-oj", "GCC_compileTimeoutMs", 1000);
    if(language == "java"){
        compileTimeoutMs = props.get("IDE-for-oj", "java_compileTimeoutMs", 10000);
    }
    var timeout = setTimeout(function () {
        okToCache = false;
        child.kill();
        stderr += "\nKilled - processing time exceeded";
    }, compileTimeoutMs);

    child.stdout.on('data', function (data) {
        stdout += data;
    });

    child.stderr.on('data', function (data) {
        stderr += data;
    });
    if(stderr){
        stderr = "compile error：\n" + stderr;
    }
    return new Promise(function (resolve, reject) {
        child.on('error', function (e) {
            reject(e);
        });
        //code是状态码，，如果不为0，，则是失败的
        child.on('exit', function (code) {
            clearTimeout(timeout);
            resolve({code: code, stdout: stdout, stderr: stderr, okToCache: okToCache});
        });
        child.stdin.end();
    });
};
//运行代码
Compile.prototype.runningProgram = function (command, result){
    // child_process.exec(cmd,
    //                     function (err, stdout, stderr) {
    //                         console.log("运行完成！处理结果");
    //                         if (err)
    //                             result.running = 'running error: \n' + err + '';
    //                         result.stderr += stderr;
    //                         result.stdout += stdout;
    //                     });
    // return result;
}
//编译动作
Compile.prototype.compile = function (source, compiler, options, inputData, language) {
    var self = this;
    var optionsError = self.checkOptions(options);
    if (optionsError) return Promise.reject(optionsError);
    var sourceError = self.checkSource(source);
    if (sourceError) return Promise.reject(sourceError);

    var compilerInfo = self.compilersById[compiler];
    if (!compilerInfo) {
        return Promise.reject("Bad compiler " + compiler);
    }
    if (!source) {
        return Promise.resolve("no source ");
    }
    var key = compiler + " | " + source + " | " + options + " | '" + inputData+"'";
    var cached = self.cache.get(key);
    if (cached) {
        self.cacheHits++;
        self.cacheStats();
        return Promise.resolve(cached);
    }
    self.cacheMisses++;

    var tempFileAndDirPromise = Promise.resolve().then(function () {
        return self.newTempDir().then(function (dirPath) {
            var compileFilename = props.get("IDE-for-oj", "GCC_compileFilename","example.cpp");
            if (language == "java") {
                compileFilename = props.get("IDE-for-oj", "java_compileFilename","Test.java");
            };
            var inputFilename = path.join(dirPath, compileFilename);
            return self.writeFile(inputFilename, source).then(function () {
                return {inputFilename: inputFilename, dirPath: dirPath};
            });
        });
    });

    var compileToResultPromise = tempFileAndDirPromise.then(function (info) {
        var inputFilename = info.inputFilename;
        var dirPath = info.dirPath;
        //设置生成的文件名
        var outputFile = "output.o"
        if(language == "java"){
            outputFile = "Test.class";
        }
        var outputFilename = path.join(dirPath, outputFile);
        //---------------------------------------编译参数在这里配置----------------------------------------
        //生成编译参数
        options = options.concat(['-g', '-o', outputFilename]).concat([inputFilename]);
        if(language == "java"){
            options = [];
            options = options.concat(['-g']).concat([inputFilename]);
        }
        //---------------------------------------编译参数在这里配置----------------------------------------

        var compilerExe = compilerInfo.exe;
        //return 运行promise  
        return self.runCompiler(compilerExe, options, language).then(function (result) {
            //编译完成后，返回的信息补充
            result.dirPath = dirPath;
            if (result.code !== 0) {
                return result;
            }
            return self.stat(outputFilename).then(function (stat) {
                return new Promise(function (resolve) {
                    var outputDataPath = path.join(dirPath, "runningOutput.txt");
                    console.log("编译完成，运行!!")
                    //running
                    if(language == "java"){
                        console.log("运行设置");
                        var runningExe = compilerExe.substr(0,compilerExe.length-1);
                        var file = outputFilename.match(/(.*\/)(.*)/);
                        var runningFileName = props.get("IDE-for-oj", "java_compileFilename","Test.java");
                        runningFileName = runningFileName.substr(0,runningFileName.length-5);
                        var cmd = 'echo "' + inputData + '" | ' + runningExe +' ' + runningFileName + ' > "' + outputDataPath + '"';
                        console.log("命令：" + cmd);
                        child_process.exec(cmd,
                            {cwd:file[1]},
                            function (err, stdout, stderr) {
                                console.log("运行完成！处理结果");
                                self.readFile(outputDataPath).then(function(data){
                                    var data = data.toString("utf-8");
                                    console.log("命令：" + data);

                                    result.runningStdout = data;
                                    resolve(result);
                                });
                            });
                    }else{
                        console.log("运行设置");
                        // var cmd = 'echo "' + inputData + '" | "' + outputFilename + '"';
                        // if (!inputData) {
                        //     cmd = '"' + outputFilename + '"';
                        // };
                        // console.log("命令：" + cmd);
                        // resolve(runningProgram(cmd , result));
                        // child_process.exec(cmd,
                        // function (err, stdout, stderr) {
                        //     console.log("运行完成！处理结果");
                        //     if (err)
                        //         result.runningError = 'running error: \n' + err + '';
                        //     if(stderr){
                        //         stderr = "running error：\n" + stderr;
                        //     }
                        //     result.stderr += stderr;
                        //     result.stdout += stdout;
                        //     resolve(result);
                        // });
                        var cmd = 'echo "' + inputData + '" | "' + outputFilename + '" > "' + outputDataPath + '"';
                        console.log("命令：" + cmd);
                        child_process.exec(cmd,
                        function (err, stdout, stderr) {
                            console.log("运行完成！处理结果");
                            self.readFile(outputDataPath).then(function(data){
                                var data = data.toString("utf-8");
                                result.runningStdout = data;
                                resolve(result);
                            });
                        });
                    } 
                });
            }, function () {
                return result;
            });
        });
    });

    return self.compileQueue.add(function () {
        return compileToResultPromise.then(function (result) {
            if (result.dirPath) {
                fs.remove(result.dirPath);
                result.dirPath = undefined;
            }
            if (result.okToCache) {
                self.cache.set(key, result);
                self.cacheStats();
            }
            return result;
        });
    });
};

Compile.prototype.checkOptions = function (options) {
    var error = [];
    var self = this;
    options.forEach(function (option) {
        if (!option.match(self.okOptions) || option.match(self.badOptions)) {
            error.push(option);
        }
    });
    if (error.length > 0) return "Bad options: " + error.join(", ");
    return null;
};

Compile.prototype.checkSource = function (source) {
    var re = /^\s*#include(_next)?\s+["<"](\/|.*\.\.)/;
    var failed = [];
    source.split('\n').forEach(function (line, index) {
        if (line.match(re)) {
            failed.push("<stdin>:" + (index + 1) + ":1: no absolute or relative includes please");
        }
    });
    if (failed.length > 0) return failed.join("\n");
    return null;
};

Compile.prototype.cacheStats = function () {
    console.log("Cache stats: " + this.cacheHits + " hits, " + this.cacheMisses + " misses");
};



//编译请求处理主函数
function compileHandler(compilers) {
    var compileObj = new Compile(compilers);
    var proxy = httpProxy.createProxyServer({});

    return function compile(req, res, next) {
        var compiler = req.body.compiler;
        var language = req.body.language;
        console.log("compiler"+compiler+" : language:"+language);
        var remote = compileObj.getRemote(compiler);
        if (remote) {
            proxy.web(req, res, {target: remote}, function (e) {
                console.log("Proxy error: ", e);
                next(e);
            });
            return;
        }
        var source = req.body.source;
        var inputData = req.body.inputData;
        if (typeof(req.body.options) !== "string") {
            return next(new Error("Bad request"));
        }
        var options = req.body.options.split(' ').filter(function (x) {
            return x !== "";
        });
        compileObj.compile(source, compiler, options, inputData, language).then(
            //返回结果信息
            function (result) {
                res.set('Content-Type', 'application/json');
                res.end(JSON.stringify(result));
            },
            function (error) {
                console.log("Error: " + error.stack);
                if (typeof(error) !== "string") {
                    error = "compile error: " + error.toString();
                }
                res.end(JSON.stringify({code: -1, stderr: error}));
            }
        );
    };
}

module.exports = {
    compileHandler: compileHandler
};
