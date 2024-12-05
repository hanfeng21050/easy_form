# UF30表单填充助手Beta

一个专为 UF30 设计的 Chrome 扩展,用于快速生成和填充表单数据。支持自定义数据生成规则,让测试工作更轻松。

## 主要功能

- ✨ 自定义数据生成规则
- 🖱️ 多种填充方式:
  - 右键菜单快速填充
  - Alt + 双击使用默认生成器
  - 点击输入框右侧图标快速生成
- 💾 支持导入导出配置
- 🔍 实时预览生成结果
- 🔗 智能元素绑定:
  - 自动记住每个输入框使用的生成器
  - 显示快捷图标一键生成
  - 跨页面保持绑定关系
- 🎯 精确定位:
  - 基于元素特征的智能识别
  - 支持 label 文本匹配
  - 自动处理动态元素
- 🛡️ 安全执行:
  - 使用安全沙箱执行生成器代码
  - 支持 ES6+ 语法
  - 超时保护机制

## 使用方法

### 1. 安装扩展
1. 下载源代码
2. 打开 Chrome 扩展管理页面 (`chrome://extensions/`)
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"，选择源代码目录

### 2. 创建生成器
1. 点击扩展图标
2. 输入生成器名称和生成规则
3. 点击"预览"测试结果
4. 点击"保存"完成创建

### 3. 使用生成器

#### 方式一：右键菜单
1. 在输入框中右键点击
2. 选择"填充数据"
3. 点击要使用的生成器
4. 生成器会自动与该输入框绑定，显示快捷图标

#### 方式二：快捷键
- Alt + 双击：使用默认生成器填充数据

#### 方式三：快捷图标
- 点击输入框右侧的生成器图标即可快速填充数据
- 图标会自动记住上次使用的生成器

### 4. 元素绑定
- 当使用右键菜单选择生成器时，会自动建立输入框与生成器的绑定关系
- 绑定后会在输入框右侧显示生成器图标
- 点击图标可快速生成数据
- 绑定关系会跨域名保存，相同结构的元素在不同网站上可复用

## 代码示例

```javascript
// 示例1：生成随机中文姓名
const firstNames = ['张', '李', '王', '赵', '钱'];
const lastNames = ['明', '华', '强', '伟', '勇'];
const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
return `${firstName}${lastName}`;

// 示例2：生成随机手机号
const prefix = ['3', '4', '5', '7', '8'];
return `1${prefix[Math.floor(Math.random() * prefix.length)]}${
  Array(9).fill().map(() => Math.floor(Math.random() * 10)).join('')
}`;

// 示例3：生成随机邮箱
const domains = ['gmail.com', '163.com', 'qq.com', 'outlook.com'];
const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
const length = 8 + Math.floor(Math.random() * 5);
const name = Array(length).fill()
  .map(() => chars[Math.floor(Math.random() * chars.length)])
  .join('');
return `${name}@${domains[Math.floor(Math.random() * domains.length)]}`;
```

## 技术实现

### 核心模块
- content.js: 页面内容处理和UI交互
- interpreter.js: 安全的代码执行环境
- background.js: 右键菜单和消息处理
- popup.js: 扩展弹窗界面

### 关键特性
1. 安全沙箱
   - 使用 eval5 提供安全的代码执行环境
   - 支持 ES6+ 语法转换
   - 设置执行超时保护

2. 智能元素定位
   - 基于元素特征生成唯一选择器
   - 支持 label 文本匹配
   - 处理动态加载元素

3. 状态管理
   - 使用 chrome.storage.sync 存储配置
   - 支持跨域名的元素绑定
   - 自动同步多设备配置

## 注意事项

1. 生成器代码必须包含 return 语句
2. 只能返回字符串或数字类型
3. 直接写方法体，无需写 function 定义
4. 代码在安全的沙箱环境中执行
5. 元素绑定关系会跨域名生效
6. 绑定关系基于元素的结构特征，与域名无关

## 开发相关

### 目录结构
```
├── manifest.json    // 扩展配置
├── popup.html      // 弹窗界面
├── popup.js       // 弹窗逻辑
├── content.js     // 内容脚本
├── background.js  // 后台脚本
├── interpreter.js // 代码解释器
├── bindings.html  // 绑定管理界面
├── bindings.js    // 绑定管理逻辑
├── icons/        // 图标资源
└── lib/          // 第三方库
    ├── eval5.js
    ├── eval5.min.js
    └── babel.min.js
```

### 技术栈

- Chrome Extension API
- JavaScript (ES6+)
- eval5 (安全的代码执行环境)
- Babel (ES6+ 代码转换)

## 配置导入导出

- 点击"导出配置"将所有生成器和绑定关系保存为 JSON 文件
- 点击"导入配置"从 JSON 文件中恢复生成器和绑定关系
- 支持在不同设备间同步配置