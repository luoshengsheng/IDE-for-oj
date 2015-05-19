// 提示测试
var $line = $(".ace_gutter-cell:eq(0)");
var $error = $("<span class=\"icon erroricon\">!</span>");
if($line.text()=="1")
{
   $line.attr("class","ace_gutter-cell after_add_icon")
   $line.prepend($error);
   
}