// 处理表单填充
async function fillField(element, dataType) {
  let value = '';
  
  if (dataType.startsWith('custom:')) {
    // 处理自定义生成器
    const generatorName = dataType.split(':')[1];
    const result = await chrome.storage.sync.get('customGenerators');
    const generators = result.customGenerators || {};
    const generatorCode = generators[generatorName];
    
    if (generatorCode) {
      try {
        value = await evaluateCode(generatorCode);
      } catch (error) {
        console.error('自定义生成器执行错误:', error);
      }
    }
  }
  
  if (value) {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForms') {
    const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
    inputs.forEach(input => fillField(input, request.dataType));
  } else if (request.action === 'clearForms') {
    const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
    inputs.forEach(input => {
      input.value = '';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  } else if (request.action === 'fillWithGenerator') {
    // 处理单个元素的填充
    const element = document.activeElement;
    if (element) {
      fillField(element, `custom:${request.generatorName}`);
    }
  }
});
