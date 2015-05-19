//------------------------------------编译器操作相关函数---------------------------

//初始化编辑器，当文档加载完成后执行
$(function(){
    initAce("IDE-for-oj");
})
function initAce(windowLocalPrefix){
  var editor = ace.edit("editor")

  $(".theme ul li a").click(setTheme);
  $(".loadButton").click(loadTemplate);
  $(".fontsize ul li a").click(setFont);

  //initFontSize
  editor.setFontSize(initFontSize());
  //initTheme
  editor.setTheme(initTheme());
  setNav();

  if(getSetting("language") == "java"){
    editor.getSession().setMode("ace/mode/java");
  }else{
    editor.getSession().setMode("ace/mode/c_cpp");
  }

  editor.getSession().setUseWrapMode(true);
  editor.setShowPrintMargin(false);
  editor.setOptions({
    //maxLine:10000,
    enableBasicAutocompletion : true,
    enableSnippets : true,
    enableLiveAutocompletion: true
  });
  //获取localstorage变量值---------------------------------------------------
  function getSetting(name) {
      return window.localStorage[windowLocalPrefix + "." + name];
  }
  function setSetting(name, value) {
      window.localStorage[windowLocalPrefix + "." + name] = value;
  }
  //设置编辑器函数--------------------------------------------------------------
  function initTheme(){
    var theme = getSetting("theme");
    if(theme){
      $(".theme ul li a").each(function(){
        var themeAttr = $(this).attr("theme");
          if(theme == themeAttr){
            $(this).addClass("active");

          }
      });
    }else{
      //默认主题
      $(".theme ul li a:eq(2)").addClass("active");
      theme = "ace/theme/crimson_editor";
      setSetting("theme",theme);
    }
    return theme;
  }
  //initFontSize
  function initFontSize(){
    var fontSize = getSetting("fontSize");
    if(fontSize){   
      $(".fontsize ul li a").each(function(){
        var size = $(this).attr("value");
          if(size == fontSize){
            $(this).addClass("active");
          }
      });
    }else{
      //默认字体
      $(".fontsize ul li a:eq(2)").addClass("active");
      fontSize = "16";
      setSetting("fontSize",fontSize);
    }
    return fontSize;
  }

  function setFont(e){
    $(".fontsize ul li a.active").removeClass("active");
    $(e.target).addClass("active");
    var editor = ace.edit("editor");
    var fontSize = $(e.target).attr("value");
    editor.setFontSize(fontSize);
    setSetting("fontSize",fontSize);
  }
  function setTheme(e){
    $(".theme ul li a.active").removeClass("active");
    $(e.target).addClass("active");
    var editor = ace.edit("editor");
    editor.setTheme($(e.target).attr("theme"));
    setNav();
  }
  function setNav(){
    if($(".theme ul li a.active").attr("type")=="light"){
      $("nav").removeClass("navbar-default").addClass("navbar-inverse");
    }else{
      $("nav").removeClass("navbar-inverse").addClass("navbar-default");
    }
  }
  function loadTemplate(){
    var language = window.localStorage[windowLocalPrefix+".language"];
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
    var code = window.localStorage[windowLocalPrefix+"."+template];
    editor.getSession().setValue(code);
  }
  //设置编辑器函数----------------------------------------------------------------
}



//------------------------------------编译器操作相关函数---------------------------

//*******文件保存--------------------------------------------------------------------

// function writeFile(arr){
//  var fso = new ActiveXObject("Shell.Application") 
//  var tf = fso.CreateTextFile("d:\\answer.txt", true); 
//  tf.Write (arr);
//  tf.Close();
// }

//*******end of 文件保存-------------------------------------------------------------



