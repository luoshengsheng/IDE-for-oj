var props = require("./properties")
module.exports = {
	//cookieSecret 用于 Cookie 加密与数据库无关
	cookieSecret: props.get('IDE-for-oj', 'cookieSecret', 'IDEForOjbyredluo'),
	db: props.get('IDE-for-oj','dbName','ideforoj'),
	host: props.get('IDE-for-oj', 'dbHost', 'localhost'),
	port: props.get('IDE-for-oj', 'dbPort', '27017')
};