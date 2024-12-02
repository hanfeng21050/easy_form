// 确保 SafeInterpreter 和 Babel 已加载
if (typeof SafeInterpreter === 'undefined') {
  throw new Error('SafeInterpreter 未加载');
}

if (typeof Babel === 'undefined') {
  throw new Error('Babel 未加载');
}

const createInterpreter = () => {
  // 缓存解释器实例
  if (!createInterpreter.instance) {
    createInterpreter.instance = new SafeInterpreter({
      timeout: 1000,
    });
  }
  return createInterpreter.instance;
};

const transformCode = (code) => {
  try {
    const result = Babel.transform(`(function() { ${code} })()`, {
      presets: ['env'],
      plugins: ['transform-modules-commonjs'],
      sourceType: 'script',
      filename: 'generator.js',
      ast: false,
      compact: true
    });
    return result.code;
  } catch (error) {
    throw new Error(`Babel 转换错误: ${error.message}`);
  }
};

const evaluateCode = async (code) => {
  const interpreter = createInterpreter();
  try {
    // 转换 ES6 代码为 ES5
    const transformedCode = transformCode(code);
    const result = await interpreter.evaluate(transformedCode);
    if (result === undefined) {
      throw new Error('生成器必须返回一个值');
    }
    return result;
  } catch (error) {
    throw new Error(`执行错误: ${error.message}\n代码行号: ${error.lineNumber}`);
  }
};

// 确保导出到全局作用域
window.evaluateCode = evaluateCode;
