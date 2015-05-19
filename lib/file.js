//File 类
var mongodb = require('./db');

function File(file) {
	this.name = file.name;
	this.type = file.type;
	this.code = file.code;
	this.language = file.language;
	this.username = file.username;
	this.directory = file.directory;
};

module.exports = File;
File.prototype.saveFile = function saveFile(callback) {
	var message = null;
	if(!this.name){
		message = "文件名不能为空";
		return callback(err,message);
	};
	if(!this.language){
		message = "语言不能为空";
		return callback(err,message);
	};
	var date = new Date();
	var fileTemp = {
		name: this.name,
		type: this.type,
		code: this.code,
		language: this.language,
		username: this.username,
		directory: this.directory,
		time: date
	};
	mongodb.open(function(err, db) {
		if (err) {
			mongodb.close();
			message = "出错了";
			return callback(err, message);
		}
		db.collection("files", function(err, collection) {
			collection.findOne({
				"name": fileTemp.name,
				'username': fileTemp.username
			}, function(err, doc) {
				if (err) {
					mongodb.close();
					message = "出错了";
					return callback(err, message);
				}
				if (doc) {
					// 如果文件已经存在
					mongodb.close();
					message = "文件名已经存在";
					return callback(err, message, doc);
				} else {
					// 存入 Mongodb 的文档
					// 为  name 属性添加索引
					collection.ensureIndex('name', {
						unique: true
					}, function(err, file) {});
					// 写入 file 文档
					collection.insert(fileTemp, {
						safe: true
					}, function(err, doc) {
						mongodb.close();
						doc = fileTemp;
						message = "保存文件成功!";
						callback(err, message, doc);
					});
				}
			});
		});
	});
};
File.updateFile = function updateFile(filename, username, code, callback) {
	var message = null;
	mongodb.open(function(err, db) {
		if (err) {
			mongodb.close();
			message = "出错了";
			return callback(err, message);
		}
		db.collection("files", function(err, collection) {
			collection.findOne({
				"name": filename,
				'username': username
			}, function(err, doc) {
				if (err) {
					mongodb.close();
					message = "出错了";
					return callback(err, message);
				}
				if (doc) {
					collection.update({
						"name": filename,
						'username': username
					}, {
						$set: {
							"code": code,
							"time": new Date()
						}
					}, function(err) {
						mongodb.close();
						if (err) {
							message = "出错了";
						} else {
							message = "更新成功";
						};
						return callback(err, message);
					});
				} else {
					//如果没有文件
					mongodb.close();
					message = "没有这个文件";
					return callback(err, message);
				}
			});
		});
	});
};
File.deleteFile = function deleteFile(filename, username, callback) {
	message = "出错了";
	var query = {
		name:filename,
		username:username
	};
	console.log(query);
	File.getFile(query,function(err,message,doc){
		if(!doc){
			message = "没有这个文件";
			return callback(err,message);
		}else{
			mongodb.open(function(err, db) {
				if (err) {
					mongodb.close();
					return callback(err,message);
				}
				db.collection("files", function(err, collection) {
					//删除文件
					collection.remove({
						"name": filename,
						"username": username
					}, {
						w: 1
					}, function(err) {
						mongodb.close();
						if (err) {
							return callback(err,message);
						}else{
							message = "删除成功";
							return callback(err,message);
						}
					});
				});
			});
		}
	});
};
//获取单个文件
File.getFile = function getFile(query, callback) {
	var message = null;
	//query中存有查询参数
	mongodb.open(function(err, db) {
		if (err) {
			mongodb.close();
			message = "mongodb.open出错了";
			return callback(err,message);
		}
		// 读取 files 集合
		db.collection('files', function(err, collection) {
			if (err) {
				mongodb.close();
				message = "collection()出错了";
				return callback(err,message);
			}
			collection.findOne(query, function(err, doc) {
				mongodb.close();
				if (doc) {
					message = "查找成功";
					callback(err, message, doc);
				} else {
					message = "查找失败"
					callback(err, message, null);
				}
			});
		});
	});
};
//获取某个用户的所有文件OK
File.getAllFile = function getAllFile(username, callback) {
	//query中存有查询参数
	var message = null;
	mongodb.open(function(err, db) {
		if (err) {
			mongodb.close();
			message = "mongodb.open出错了";
			return callback(err, message);
		}
		// 读取 files 集合
		db.collection('files', function(err, collection) {
			if (err) {
				message = "db.collection()出错了";
				return callback(err, message);
			}
			//使用 count 返回特定查询的文档数 total
			collection.count({
				username: username
			}, function(err, total) {
				//根据 query 对象查询，并跳过前 (page-1)*10 个结果，返回之后的 10 个结果
				collection.find({
					username: username
				}, {
					// 查询限定条件
					// skip: (page - 1)*10,
					// limit: 10
				}).sort({
					time: -1
				}).toArray(function(err, docs) {
					mongodb.close();
					if (err) {
						message = "collection.find()出错了";
						return callback(err, message, null);
					}
					message = "获取成功";
					callback(err, message, docs, total);
				});
			});
		});
	});
}