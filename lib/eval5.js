// 确保 eval5 已加载
if (typeof eval5 === 'undefined') {
  throw new Error('eval5 库未加载');
}

// 使用 eval5 库
const { Interpreter } = eval5;

// 创建安全的执行环境
const createSandbox = () => ({
  console: {
    log: (...args) => console.log('[Generator]', ...args),
    error: (...args) => console.error('[Generator]', ...args),
    warn: (...args) => console.warn('[Generator]', ...args),
  },
  Math,
  Date,
  String,
  Number,
  Array,
  Object,
  JSON,
});

// 扩展 Interpreter 类
class SafeInterpreter extends Interpreter {
  constructor(options = {}) {
    const sandbox = createSandbox();
    super(sandbox, {
      timeout: options.timeout || 1000,
      rootContext: sandbox,
    });
  }

  evaluate(code) {
    try { 
      // 执行代码
      const result = super.evaluate(code);
      
      // 校验返回值类型
      if (typeof result !== 'string' && typeof result !== 'number') {
        throw new Error('生成器必须返回字符串或数字');
      }
      
      return Promise.resolve(result);
    } catch (error) {
      return Promise.reject(new Error(`代码执行错误: ${error.message}\n代码: ${code}`));
    }
  }
}

// 确保导出到全局作用域
window.SafeInterpreter = SafeInterpreter; 