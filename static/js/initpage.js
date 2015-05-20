//------------------------------------页面初始化相关函数---------------------------
var currentCompiler = null;
var allCompilers = [];

function initialise(options) {
	//初始化文件文件列表
	initFilelist();
	$("#saveFileButton").click(function() {
		$('#saveFile').modal('hide');
		savaNewFile();
	});
	$('#deleteFile').on('show.bs.modal', function(event) {
		var button = $(event.relatedTarget);
		var filename = button.data('filename');
		var modal = $(this);
		modal.find('#file-name').val(filename);
	})
	$("#deleteButton").click(function() {
		$('#deleteFile').modal('hide');
		deleteFile();
	});
	$('#updateButton').click(function() {
		updateFile();
	});
	$('#newFile').click(function() {
		$(".selected").removeClass("selected");
		$(this).addClass("selected");
		var editor = ace.edit("editor");
		editor.getSession().setValue("");
	});
	// $('#myModal').on('hidden.bs.modal', function (e) {
	//   // do something...
	// })
	// 设置css

	var screetHeight = screen.availHeight;
	var tempHeight = screetHeight - ($(".navbar").height() + 150);
	var height = tempHeight;
	$(".allContent").css({
		height: height
	});
	tempHeight = $(".ioContent").height() - ($(".panel-heading").height());
	height = tempHeight;
	$(".panel-body").css({
		height: height
	})
	$('#ioContent').menuToggle({
		'ctrlBtn': 'ioContentHide',
		'speed': 300,
		'height': 200,
		'openText': 'input-output',
		'closeText': 'input-output',
		'type': 'height',
	});
	// $('#left').menuToggle({
	//     'ctrlBtn':'showFile',
	//     'speed':300,
	//     'height':$("#left").height,
	//     'openText':'file',
	//     'closeText':'filess',
	//     'type':'width',
	// });

	//用户代码
	// codeFile = getFile(getCookie("username"));

	//设置语言代码模板
	setSetting("templateC", $(".template.lang.c").text());
	setSetting("templateCC", $(".template.lang.cc").text());
	setSetting("templateJava", $(".template.lang.java").text());

	var language = getSetting("language");
	if (!language) {
		language = options.language;
	};
	//设置同步异步

	//显示语言
	$(".language-name").text(language);
	$(".languageSelect").val(language);
	setSetting("language", language);

	//函数在static/js/compiler.js文件定义
	var compiler = new Compiler($('body'), options.windowLocalPrefix, language);
	allCompilers.push(compiler);
	currentCompiler = compiler;

	var defaultCompiler = options.GCC_defaultCompiler;
	if (language == "java") {
		defaultCompiler = options.java_defaultCompiler;
	}

	//初始化所有编译器，，然后设置当前编译器
	compiler.setCompilers(options.compilers, defaultCompiler, language);
}

$(function() {
	initialise(OPTIONS);
});

//------------------------------------页面初始化相关函数-------------------
//获取localstorage变量值---------------------------------------------------
function getSetting(name) {
	return window.localStorage[OPTIONS.windowLocalPrefix + "." + name];
}

function setSetting(name, value) {
	window.localStorage[OPTIONS.windowLocalPrefix + "." + name] = value;
}

function setSource(code) {
	var editor = ace.edit("editor");
	editor.getSession().setValue(code);
}

function getSource() {
	var editor = ace.edit("editor");
	return editor.getSession().getValue();
}

function getCookie(name) {
	var arr, reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
	if (arr = document.cookie.match(reg)) {
		return unescape(arr[2]);
	} else {
		return null;
	}
}

function getFile(username) {
		if (!username) {
			return null;
		}
		var query = {
			username: username,
			directory: null
		}
		var codeFile = null;
		File.get(query, function(docs, count) {
			docs.forEach(function(doc) {
				if (doc.type == "directory") {
					var html = '<a href="#">' + doc.name + '</a>';
					$('.templateFile').clone().appendTo('#fileMeun').removeClass('templateFile').html(html);
				} else {
					var html = '<a href="#">' + doc.name + '</a>';
					$('.templateFile').clone().appendTo('#fileMeun').removeClass('templateFile').html(html);
				}
			});
			codeFile = docs;
		});
		return codeFile;
	}
	//------------------------------------页面功能函数----------------------------------

function initFilelist() {
	var data = {
		username: $("#showUsername").text().trim(),
	};
	$.ajax({
		type: 'POST',
		url: '/initFilelist',
		dataType: 'json',
		contentType: 'application/json',
		data: JSON.stringify(data),
		success: function(result) {
			var docs = result.docs;
			var lastFile = window.localStorage[OPTIONS.windowLocalPrefix + "." + data.username + ".lastFile"];
			//判段是否有选择的文件
			var judgeNull = true;
			var index = 0;
			window.localStorage[OPTIONS.windowLocalPrefix + "." + data.username + ".allFile"] = JSON.stringify(docs);
			docs.forEach(function(doc) {
				if (doc.type == "directory") {
					var html = '<a href="#" fileId="' + index + '">' + doc.name + '<div data-target="#deleteFile" data-toggle="modal" data-filename="' + doc.name + '" class="icondiv delete"><span class="glyphicon glyphicon-trash" aria-hidden="true"></span></div><div class="icondiv edit"><span class="glyphicon glyphicon-edit" aria-hidden="true"></span></div></a>';
					$('.templateFile').clone().appendTo('#fileMeun').removeClass('templateFile').html(html);
				} else {
					var html = '<a href="#" fileId="' + index + '">' + doc.name + '<div data-target="#deleteFile" data-toggle="modal"  data-filename="' + doc.name + '" class="icondiv delete"><span class="glyphicon glyphicon-trash" aria-hidden="true"></span></div><div class="icondiv edit"><span class="glyphicon glyphicon-edit" aria-hidden="true"></span></div></a>';
					if (doc.name == lastFile) {
						html = '<a href="#" class="selected" fileId="' + index + '">' + doc.name + '<div data-target="#deleteFile" data-toggle="modal" data-filename="' + doc.name + '" class="icondiv delete"><span class="glyphicon glyphicon-trash" aria-hidden="true"></span></div><div class="icondiv edit"><span class="glyphicon glyphicon-edit" aria-hidden="true"></span></div></a>';
						setSetting("code", doc.code);
						judgeNull = false;
					}
					$('.templateFile').clone().appendTo('#fileMeun').removeClass('templateFile').html(html);
				}
				index = index + 1;
			});
			if (judgeNull) {
				$("#newFile").addClass("selected");
			};
			$("#fileMeun li a .edit").click(function() {
				var editor = ace.edit("editor");
				var filename = $(this).parent().text();
				var index = $(this).parent().attr("fileId");
				window.localStorage[OPTIONS.windowLocalPrefix + "." + data.username + ".lastFile"] = filename;
				$("#fileMeun li a.selected").removeClass("selected");
				$(this).parent().addClass("selected");
				var allFile = window.localStorage[OPTIONS.windowLocalPrefix + "." + data.username + ".allFile"];
				allFile = JSON.parse(allFile);
				editor.getSession().setValue(allFile[index].code);
			});
		}
	});
}

function savaNewFile() {
	var editor = ace.edit("editor");
	var data = {
		code: editor.getSession().getValue(),
		type: 'file',
		language: $('.languageSelect').val(),
		name: $("#filename").val(),
		username: $("#showUsername").text().trim(),
		directory: 'files',
	};
	$.ajax({
		type: 'POST',
		url: '/saveNewFile',
		dataType: 'json',
		contentType: 'application/json',
		data: JSON.stringify(data),
		success: function(result) {
			var doc = result.doc;
			var allFile = window.localStorage[OPTIONS.windowLocalPrefix + "." + data.username + ".allFile"];
			allFile = JSON.parse(allFile);
			var index = allFile.length;
			if (result.message == "保存文件成功!") {
				allFile.push(doc);
				window.localStorage[OPTIONS.windowLocalPrefix + "." + data.username + ".allFile"] = JSON.stringify(allFile);
				$("#fileMeun li a.selected").removeClass("selected");
				if (doc.type == "directory") {
					var html = '<a class="selected" href="#" fileId="' + index + '">' + doc.name + '<div data-target="#deleteFile" data-toggle="modal"  data-filename="' + doc.name + '" class="icondiv delete"><span class="glyphicon glyphicon-trash" aria-hidden="true"></span></div><div class="icondiv edit"><span class="glyphicon glyphicon-edit" aria-hidden="true"></span></div></a>';
					$('.templateFile').clone().appendTo('#fileMeun').removeClass('templateFile').html(html);
				} else {
					var html = '<a class="selected" href="#" fileId="' + index + '">' + doc.name + '<div data-target="#deleteFile" data-toggle="modal"  data-filename="' + doc.name + '" class="icondiv delete"><span class="glyphicon glyphicon-trash" aria-hidden="true"></span></div><div class="icondiv edit"><span class="glyphicon glyphicon-edit" aria-hidden="true"></span></div></a>';
					$('.templateFile').clone().appendTo('#fileMeun').removeClass('templateFile').html(html);
				}
			}
			alert(result.message);
		}
	});
}

function deleteFile() {
	var editor = ace.edit("editor");
	var node = $("#file-name");
	var filename = node.val();
	var data = {
		filename: filename,
		username: $("#showUsername").text().trim()
	}
	$.ajax({
		type: 'POST',
		url: '/deleteFile',
		dataType: 'json',
		contentType: 'application/json',
		data: JSON.stringify(data),
		success: function(result) {
			var message = result.message;
			if (node.hasClass("selected")) {
				if (message == "删除成功") {
					$("#newFile").addClass("selected");
					editor.getSession().setValue('');
					// $('#fileMeun li a[data-filename="'+data.filename+'"]').remove();
					location.reload();
				}
			} else {
				location.reload();
				// $('#fileMeun li a[data-filename="'+data.filename+'"]').remove();

			}
			alert(message);
		}
	});
}

function updateFile() {
		var editor = ace.edit("editor");
		var code = editor.getSession().getValue();
		var filename = $('#fileMeun li a.selected').text().trim();
		var index = $('#fileMeun li a.selected').attr("fileId");
		if (!filename || !index) {
			alert("请先建文件");
		} else {
			var data = {
				filename: filename,
				code: code,
				username: $("#showUsername").text().trim()
			}
			$.ajax({
				type: 'POST',
				url: '/updateFile',
				dataType: 'json',
				contentType: 'application/json',
				data: JSON.stringify(data),
				success: function(result) {
					var message = result.message;
					changeAllFile(index, 3, code);
					alert(message);
				}
			});
		}
	}
	//action 1,2,3,4 增删改查
function changeAllFile(index, action, message) {
		var allFile = window.localStorage[OPTIONS.windowLocalPrefix + "." + $("#showUsername").text().trim() + ".allFile"];
		allFile = JSON.parse(allFile);
		switch (action) {
			case 1:
				{
					break;
				}
			case 2:
				{

					break;
				}
			case 3:
				{
					allFile[index].code = message;
					break;
				}
			case 4:
				{
					break;
				}
			default:
				{
					break;
				}
		}
		window.localStorage[OPTIONS.windowLocalPrefix + "." + $("#showUsername").text().trim() + ".allFile"] = JSON.stringify(allFile);
	}
	//------------------------------------begin of 展开插件-----------------------------
	(function($) {
		$.fn.extend({
			'menuToggle': function(options) {
				//self变量，用于函数内部调用插件参数
				var self = this;
				//默认参数
				this._default = {
					'ctrlBtn': null, //关闭&展开按钮id
					'speed': 400, //展开速度
					'width': 400, //展开菜单宽度
					'height': 400, //展开菜单高度
					'openText': '展开>>', //展开前文本
					'closeText': '<<关闭', //展开后文本
					'type': 'width' //width表示按宽度伸展，height表示按高度伸展
				};
				//插件初始化函数
				this.init = function(options) {
					//配置参数格式有误则提示并返回
					if (typeof options != 'object') {
						self.error('Options is not object Error!');
						return false;
					}
					if (typeof options.ctrlBtn == 'undefined') {
						self.error('Options ctrlBtn should not be empty!');
						return false;
					}
					//存储自定义参数
					self._default.ctrlBtn = options.ctrlBtn;
					if (typeof options.type != 'undefined') self._default.type = options.type;
					if (typeof options.width != 'undefined') self._default.width = options.width;
					if (typeof options.height != 'undefined') self._default.height = options.height;
					if (typeof options.speed != 'undefined') self._default.speed = options.speed;
					if (typeof options.openText != 'undefined') self._default.openText = options.openText;
					if (typeof options.closeText != 'undefined') self._default.closeText = options.closeText;
					if (self._default.type == 'width') {
						self._default.expandOpen = {
							width: self._default.width
						};
						self._default.expandClose = {
							width: 0
						};
					} else {
						self._default.expandOpen = {
							height: self._default.height
						};
						self._default.expandClose = {
							height: 0
						};
					}
				};
				this.run = function() {
					$("#" + self._default.ctrlBtn).click(function() {
						var showJudge = true;
						if ($(this).hasClass('closed')) { //有closed类，表示已关闭，现在展开
							$(this).removeClass('closed').html(self._default.closeText);
							$(self).show().animate(self._default.expandOpen, self._default.speed);
						} else {
							$(this).addClass('closed').html(self._default.openText);
							$(self).animate(self._default.expandClose, self._default.speed, function() {
								$(this).hide();
							});
							showJudge = false;
						}
						if (self._default.ctrlBtn == "ioContentHide" && !showJudge) {
							$("#editor").animate({
								height: $("#editor").height() + self._default.height
							}, self._default.speed);
						} else {
							$("#editor").animate({
								height: $("#editor").height() - self._default.height
							}, self._default.speed);
						}
						if (self._default.ctrlBtn == "showFile" && !showJudge) {
							$("#left").animate({
								height: $("#left").width() + self._default.width
							}, self._default.speed);
						} else {
							$("#left").animate({
								height: $("#left").width() - self._default.width
							}, self._default.speed);
						}
					});
				};
				this.error = function(msg) {
						//没有错误提示DIV则自动添加
						if (!$("#menuToggleErrorTips").size()) {
							$("<div id='menuToggleErrorTips'><h2>Error<\/h2><div class='tips'><\/div><\/div>").appendTo($("body")).hide();
							$("#menuToggleErrorTips").css({
								position: 'absolute',
								left: 0,
								top: 0,
								width: 400,
								height: 200,
								'z-index': 9999999,
								'border': '1px solid #000',
								'background-color': '#ABC',
								'color': '#CC0000',
								'text-align': 'center'
							});
						}
						//显示错误提示信息
						$("#menuToggleErrorTips").show().children('.tips').html(msg);
					}
					//Init
				this.init(options);
				this.run();
			}
		});
	})(jQuery);
//------------------------------------end of 展开插件-----------------------------