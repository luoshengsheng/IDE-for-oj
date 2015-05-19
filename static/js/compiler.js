//找出错误信息：/tmp/compiler115219-5028-pxqbi8/example.cpp:5:21: error: ‘klkl’ was not declared in this scope
function parseLines(lines, callback) {
    console.log("编译错误信息："+lines);
    var re = /^\/tmp\/[^:]+:([0-9]+)(:([0-9]+))?:\s+(.*)/;
    $.each(lines.split('\n'), function (_, line) {
        line = line.trim();
        if (line !== "") {
            var match = line.match(re);
            if (match) {
                callback(parseInt(match[1]),parseInt(match[2]), match[4].trim());
            } else {
                callback(null, null ,line);
            }
        }
    });
}

function clearBackground(cm) {
    for (var i = 0; i < cm.lineCount(); ++i) {
        cm.removeLineClass(i, "background", null);
    }
}

const NumRainbowColours = 12;

function Compiler(domRoot, windowLocalPrefix, lang) {
    var compilersById = {};
    var compilersByAlias = {};
    var pendingTimeout = null;
    var editor = null;
    var lastRequest = null;
    // Horrible hack to avoid onChange doing anything on first starting, ie before we've set anything up.
    var ignoreChanges = true; 

    editor = ace.edit("editor");
    //设置事件监听
    editor.getSession().on("change", onTextChange);
    //设置keybinding 
    //调试
    editor.commands.bindKey("f9", function(editor) {
        requireCompile();
    }); 
     
    //获取localstorage变量值
    function getSetting(name) {
        return window.localStorage[windowLocalPrefix + "." + name];
    }

    function setSetting(name, value) {
        window.localStorage[windowLocalPrefix + "." + name] = value;
    }

    var codeText = getSetting('code');
    //如果code为空 ，，获得默认值
    if (!codeText) {
        codeText = getLanguageTemplate(lang);
    }
    function getLanguageTemplate(language){
        var template = '';
        switch(language.replace(/[^a-zA-Z]/g, 'C').toLowerCase())
        {
        case 'c':
            template = "templateC";
          break;
        case 'java':
            template = "templateJava";
          break;
        default:
            template = "templateCC";
        }
        return getSetting(template);
    }
    // if (codeText) editor.getSession().setValue(codeText);
    if (codeText) editor.getSession().setValue('//type your code here!');

    //编译器改变时 重新编译
    domRoot.find('.compilerSelect').change(onCompilerChange);
    //语言改变时 重新编译
    domRoot.find('.languageSelect').change(onLanguageChange);
    domRoot.find(".compileButton").click(requireCompile);
    //选项 程序改变了
    ignoreChanges = false;

    //返回错误信息的html节点
    function makeErrNode(text) {
        var clazz = "error";
        if (text.match(/^warning/)) clazz = "warning";
        if (text.match(/^note/)) clazz = "note";
        var node = $('<div class="' + clazz + ' inline-msg"><span class="icon">!!</span><span class="msg"></span></div>');
        node.find(".msg").text(text);
        return node[0];
    }
    //this function reference since the ace project
    /**
     * Moves the cursor to the specified line number, and also into the indiciated column.
     * @param {Number} lineNumber The line number to go to
     * @param {Number} column A column number to go to
     * @param {Boolean} animate If `true` animates scolling
     *
     **/
    gotoLine = function(editor,lineNumber, column, animate) {
        editor.selection.clearSelection();
        editor.session.unfold({row: lineNumber - 1, column: column || 0});
        editor.$blockScrolling += 1;
        // todo: find a way to automatically exit multiselect mode
        editor.exitMultiSelectMode && editor.exitMultiSelectMode();
        editor.moveCursorTo(lineNumber - 1, column || 0);
        editor.$blockScrolling -= 1;

        if (!editor.isRowFullyVisible(lineNumber - 1))
            editor.scrollToLine(lineNumber - 1, true, animate);
    };

    var errorWidgets = [];
    var warningWidgets = [];
    var noteWidgets = [];
    //当数据返回时，调用
    function onCompileResponse(request, data) {
        console.log(data);
        var stdout = data.stdout || "";
        var stderr = data.stderr || "";
        var runningStdout = data.runningStdout || "";

        console.log("data.stdout:"+data.stdout);
        console.log("data.stderr:"+data.stderr);

        if (!data.code === 0) {
            stderr += "\nCompilation failed";
        }
        stderr +="\n请检查input，代码是否正确！";
        //去掉原先的内容
        $('.compiler-output :gt(0)').remove();
        editor.getSession().clearAnnotations();

        //删除原先的gutter修饰
        for (var i = 0; i < errorWidgets.length; ++i)
            editor.getSession().removeGutterDecoration(errorWidgets[i]-1,"guttererror");
        for (var i = 0; i < warningWidgets.length; ++i)
            editor.getSession().removeGutterDecoration(errorWidgets[i]-1,"gutterwarning");
        for (var i = 0; i < noteWidgets.length; ++i)
            editor.getSession().removeGutterDecoration(errorWidgets[i]-1,"gutternote");
        errorWidgets.length = 0;
        var numLines = 0;
        //解析编译器返回信息
        if (runningStdout) {
            $('.compiler-output .template').clone().appendTo('.compiler-output').removeClass('template').text(stdout);
        }else if(stderr){
            var errHtmlArray = [];
            parseLines(stderr, function (lineNum, lineColumn,msg) {
                //最多处理输出信息50行
                // console.log("编译输出信息："+msg);
                if (numLines > 50) return;
                if (numLines === 50) {
                    lineNum = null;
                    msg = "Too many output lines...truncated";
                }
                numLines++;
                var elem = $('.result .compiler-output .template').clone().appendTo('.result .compiler-output').removeClass('template');
                var clazz = "error";
                if (lineNum) {
                    // console.log(msg);
                    if (msg.match(/^error|错误/)) {
                        errorWidgets.push(lineNum);
                        clazz = "error";
                    } 
                    else if (msg.match(/^warning|警告/)) {
                        clazz = "warning";
                        warningWidgets.push(lineNum);
                    }
                    else if (msg.match(/^note/)) {
                        noteWidgets.push(lineNum);
                        clazz = "note";
                    } 
                    var errHtml = "<div class=" + clazz + ' inline-msg"><span class="icon erroricon">!!</span><span class="msg">'+msg+'</span></div>';
                    var errHtmlNote ={row: lineNum-1, column: 0,html:errHtml, type:clazz};
                    errHtmlArray.push(errHtmlNote);
                    editor.getSession().addGutterDecoration(lineNum-1,"gutter"+clazz);
                    elem.html($('<a href="#">').append("第"+lineNum + "行 : " + msg)).click(function () {
                        //点击定位
                        gotoLine(editor,lineNum,lineColumn,true);
                        return false;
                    });
                } else {
                    elem.text(msg);
                }
            });
            //添加错误提示浮动框
            editor.getSession().setAnnotations(errHtmlArray);
        }else{
            $('.result .compiler-output .template').clone().appendTo('.result .compiler-output').removeClass('template').text("compile OK!");
        }
    }

    function onChange() {
        console.log("onChange");
        //标志是否更新
        if (ignoreChanges) return;  
        
        if (pendingTimeout) clearTimeout(pendingTimeout);
        pendingTimeout = setTimeout(function () {
            var data = {
                source: editor.getSession().getValue(),
                compiler: $('.compilerSelect').val(),
                language: $('.languageSelect').val(),
                inputData: $(".inputData").val(),
                options: '',
            };
            setSetting('compiler', data.compiler);
            setSetting('language', data.language);
            setSetting('compilerOptions', data.options);
            setSetting('inputData',data.inputData);
            var stringifiedReq = JSON.stringify(data);
            if (stringifiedReq == lastRequest) return;
            $('.result .compiler-output :visible').remove();
            var elem = $('.result .compiler-output .template').clone().appendTo('.result .compiler-output').removeClass('template');
            elem.text("compile ........");
            lastRequest = stringifiedReq;
            data.timestamp = new Date();
            $.ajax({
                type: 'POST',
                url: '/compile',
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: function (result) {
                    onCompileResponse(data, result);
                }
            });
        }, 750);
        setSetting('code', editor.getSession().getValue());
    }

    function setSource(code) {
        editor.getSession().setValue(code);
    }

    function getSource() {
        return editor.getSession().getValue();
    }

    //序列化状态
    function serialiseState() {
        var state = {
            sourcez: LZString.compressToBase64(editor.getSession().getValue()),
            compiler: $('.compilerSelect').val(),
            language: $('.languageSelect').val(),
            options: ""
        };
        return state;
    }
    //解序列化
    function deserialiseState(state) {
        if (state.hasOwnProperty('sourcez')) {
            editor.getSession().setValue(LZString.decompressFromBase64(state.sourcez));
        } else {
            editor.getSession().setValue(state.source);
        }
        state.compiler = mapCompiler(state.compiler);
        domRoot.find('.compilerSelect').val(state.compiler);

        // Somewhat hackily persist compiler into local storage else when the ajax response comes in
        // with the list of compilers it can splat over the deserialized version.
        // The whole serialize/hash/localStorage code is a mess! TODO(mg): fix
        setSetting('compiler', state.compiler);
        return true;
    }
    function onTextChange(){
        if ($("#sync-state").bootstrapSwitch("state")) {
            onChange();    
        }else{
            return;
        }
    }
    function onCompilerChange() {
        onChange();
        var compiler = compilersById[$('.compilerSelect').val()];
        if (compiler === undefined)
            return;
        //设置编译器版本
        $(".compilerVersion").text(compiler.name + " (" + compiler.version + ")");
    }

    function onLanguageChange() {
        var language = $('.languageSelect').val();
        domRoot.find(".language-name").text(language);
        editor.getSession().setMode("ace/mode/java");
        var defaultCompiler = OPTIONS.GCC_defaultCompiler;
        if(language == "java"){
            defaultCompiler = OPTIONS.java_defaultCompiler;
        }
        setCompilers(OPTIONS.compilers,defaultCompiler,language);
    }

    //请求运行
    function requireCompile(){
        onChange();
    }

    //检查是否有某个编译器
    function mapCompiler(compiler) {
        if (!compilersById[compiler]) {
            compiler = compilersByAlias[compiler];
            if (compiler) compiler = compiler.id;
        }
        return compiler;
    }

    //设置所有编译器器的信息，，将编译器放入compilersById和ByAlias数组里，还加入到select里边
    function setCompilers(compilers, defaultCompiler,language) {
        compilersById = {};
        compilersByAlias = {};
        var oldLanguage = getSetting('language');
        //如果语言不同先清空,设置当前编译器为默认编译器
        if (oldLanguage != language) {
            domRoot.find('.compilerSelect option').remove();
            setSetting("language",language);
            setSetting('compiler',defaultCompiler);
        };
        
        $.each(compilers, function (index, arg) {
            compilersById[arg.id] = arg;
            if (arg.alias) compilersByAlias[arg.alias] = arg;
            if(language == "java"){
                if (arg.exe.match("java")) {
                    domRoot.find('.compilerSelect').append($('<option value="'+arg.id+'">'+ arg.name + '</option>'));
                }
            }else{
                if (!arg.exe.match("java")) {
                    domRoot.find('.compilerSelect').append($('<option value="'+arg.id+'">'+ arg.name + '</option>'));
                }
            }
        });
        //获取当前编译器
        var compiler = getSetting('compiler');
        if (!compiler) compiler = defaultCompiler;
        console.log(compiler);
        compiler = mapCompiler(compiler);
        if (compiler) {
            domRoot.find('.compilerSelect').val(compiler);
            setSetting('compiler',compiler);
        }
        onCompilerChange();
    }

    function setEditorHeight(height) {
        const MinHeight = 100;
        if (height < MinHeight) height = MinHeight;
        editor.setSize(null, height);
    }

    return {
        serialiseState: serialiseState,
        deserialiseState: deserialiseState,
        setCompilers: setCompilers,
        getSource: getSource,
        setSource: setSource,
        setEditorHeight: setEditorHeight
    };
}
