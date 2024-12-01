# 自定义数据生成器

一个 Chrome 扩展，用于快速生成和填充表单数据。支持自定义数据生成规则，让测试工作更轻松。

## 主要功能

- ✨ 自定义数据生成规则
- 🖱️ 右键菜单快速填充
- 💾 支持导入导出配置
- 🔍 实时预览生成结果

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
在任意输入框右键点击 -> 选择"填充数据" -> 点击要使用的生成器

## 代码示例
## 代码示例

```javascript
// 示例1：生成随机中文姓名
const firstNames = ['张', '李', '王', '赵', '钱'];
const lastNames = ['明', '华', '强', '伟', '勇'];
const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
return firstName + lastName;

// 示例2：生成随机手机号
return '1' + 
  ['3', '4', '5', '7', '8'][Math.floor(Math.random() * 5)] + 
  Array(9).fill(0).map(() => Math.floor(Math.random() * 10)).join('');

// 示例3：生成随机邮箱
const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
const length = 8 + Math.floor(Math.random() * 5);
const name = Array(length).fill(0)
  .map(() => chars[Math.floor(Math.random() * chars.length)])
  .join('');
return name + '@' + domains[Math.floor(Math.random() * domains.length)];
```

## 注意事项

1. 生成器代码必须包含 return 语句
2. 只能返回字符串或数字类型
3. 直接写方法体，无需写 function 定义
4. 代码在安全的沙箱环境中执行

## 开发相关

### 目录结构
```
├── manifest.json    // 扩展配置
├── popup.html      // 弹窗界面
├── popup.js       // 弹窗逻辑
├── content.js     // 内容脚本
├── background.js  // 后台脚本
├── interpreter.js // 代码解释器
├── icons/        // 图标资源
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── lib/          // 第三方库
    ├── eval5.js
    └── eval5.min.js
```

### 技术栈

- Chrome Extension API
- JavaScript
- eval5 (安全的代码执行环境)

## 配置导入导出

- 点击"导出配置"将所有生成器保存为 JSON 文件
- 点击"导入配置"从 JSON 文件中恢复生成器