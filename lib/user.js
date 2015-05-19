//User 类
var mongodb = require('./db');

function User(user) {
	this.name = user.name;
	this.password = user.password;
};

module.exports = User;
User.prototype.save = function save(callback) {
	// 存入 Mongodb 的文档
	var user = {
		name: this.name,
		password: this.password,
	};
	//查看API
	mongodb.open(function(err, db) {
		if (err) {
			return callback(err);
		}
		// 读取 users 集合
		// 无需特别语句创建集合，执行执行一条插入即可
		db.collection('users', function(err, collection) {
			if (err) {
				mongodb.close();
				//两层回调，出错后调用传过来的回调函数
				return callback(err);
			}
			// 为  name 属性添加索引
			//错误7：这里如果没有回调函数的话就会出现Error: Cannot use a writeConcern without a provided callback
			collection.ensureIndex('name', {
				unique: true
			}, function(err, user){});
			// 写入 user 文档
			collection.insert(user, {
				safe: true
			}, function(err, user) {
				mongodb.close();
				callback(err, user);
			});
		});
	});
};
User.get = function get(username, callback) {
	mongodb.open(function(err, db) {
		if (err) {
			return callback(err);
		}
		// 读取 users 集合
		db.collection('users', function(err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}
			// 查找 name 属性为  username 的文档
			collection.findOne({
				name: username
			}, function(err, doc) {
				mongodb.close();
				if (doc) {
					// 封装文档为  User 对象
					var user = new User(doc);
					callback(err, user);
				} else {
					callback(err, null);
				}
			});
		});
	});
};
User.getAll = function getAll(callback) {
	mongodb.open(function(err, db) {
		if (err) {
			return callback(err);
		}
		// 读取 users 集合
		db.collection('users', function(err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}
			// 查找 name 属性为  username 的文档
			collection.find().toArray(function (err, docs) {
	          mongodb.close();
	          if (err) {
	            return callback(err);
	          }
	          // console.log("typeof docs");
	          // console.log(typeof docs);
	          // JSON.stringify(docs);
	          callback(err,docs);
	        });
		});
	});
};