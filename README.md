# IDE-for-oj
graduation project
#环境配置说明
##安装java环境
1. 安装JDK
2. 配置环境变量 
- 编辑/etc/profile 配置PATH变量 
- JAVA_HOME-----`JDK安装路径`		
- CLASS_PATH----`.:$JAVA_HOME/lib/dt.jar:$JAVA_HOME/lib/tools.jar`
- PATH----------`$JAVA_HOME/bin:.`
- PATH变量中要添加当前路径(.)

##安装C,C++环境
1. 安装GCC，G++编译器
2. 在config文件夹中更改配置文件
3. 如何配置--请看配置文件备注

##安装mongodb
1. 可以进行源码安装也可以进行get安装
2. apt-get install mongodb-server
3. mongod -dbpath /data/db/

#功能说明
1. 更改theme,font
2. 正则查找,按ctrl+f
3. 正则替换,按两次ctrl+f
4. undo,按ctrl+z
5. 代码自动补全
6. 多语言java,C,C++
7. 代码检错
8. 黑箱测试