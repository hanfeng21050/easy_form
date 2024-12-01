import { Interpreter } from './node_modules/eval5/dist/esm/index.js';

export const createInterpreter = () => {
  return new Interpreter(window, {
    timeout: 1000,
  });
};

export const evaluateCode = (code) => {
  const interpreter = createInterpreter();
  try {
    const func = interpreter.evaluate(`(${code})`);
    console.log(func)
    return func();
  } catch (error) {
    console.error('Evaluation error:', error);
    throw new Error(`代码执行错误: ${error.message}`);
  }
};
