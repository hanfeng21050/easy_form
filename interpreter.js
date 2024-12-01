// 确保 SafeInterpreter 已加载
if (typeof SafeInterpreter === 'undefined') {
  throw new Error('SafeInterpreter 未加载');
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

const evaluateCode = async (code) => {
  const interpreter = createInterpreter();
  try {
    const result = await interpreter.evaluate(code);
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
