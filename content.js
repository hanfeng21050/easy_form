// 使用立即执行函数避免全局变量污染
(async function() {
  let isAltPressed = false;
  
  // 简化的日志函数
  const log = {
    info: (...args) => console.log('[Generator]', ...args),
    error: (...args) => console.error('[Generator]', ...args)
  };

  // 核心生成器函数
  async function generateValue(generatorName) {
    try {
      const result = await chrome.storage.sync.get('customGenerators');
      const generators = result.customGenerators || {};
      const generatorCode = generators[generatorName];
      
      if (!generatorCode) {
        throw new Error(`Generator "${generatorName}" not found`);
      }
      
      return await evaluateCode(generatorCode);
    } catch (error) {
      log.error('Generation failed:', error);
      throw error;
    }
  }

  // 填充字段值
  async function fillField(element, dataType) {
    try {
      if (!dataType.startsWith('custom:')) return;
      
      const generatorName = dataType.split(':')[1];
      const value = await generateValue(generatorName);
      
      if (value) {
        element.value = value;
        ['input', 'change'].forEach(eventType => 
          element.dispatchEvent(new Event(eventType, { bubbles: true }))
        );
        log.info('Value set:', value);
      }
    } catch (error) {
      log.error('Fill field failed:', error);
    }
  }

  // Alt键状态监听
  document.addEventListener('keydown', e => e.key === 'Alt' && (isAltPressed = true));
  document.addEventListener('keyup', e => e.key === 'Alt' && (isAltPressed = false));

  // 双击事件处理
  document.addEventListener('dblclick', async function(e) {
    if (!isAltPressed && !e.altKey) return;
    
    const target = e.target;
    if (!target.matches('input:not([type="hidden"]), textarea, select')) return;
    
    try {
      const { defaultGenerator, customGenerators = {} } = 
        await chrome.storage.sync.get(['defaultGenerator', 'customGenerators']);
      
      const generatorName = defaultGenerator || Object.keys(customGenerators)[0];
      
      if (generatorName && customGenerators[generatorName]) {
        await fillField(target, `custom:${generatorName}`);
      }
    } catch (error) {
      log.error('Quick fill failed:', error);
    }
  });

  // 消息监听处理
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const handlers = {
      fillForms: () => {
        document.querySelectorAll('input:not([type="hidden"]), textarea, select')
          .forEach(input => fillField(input, request.dataType));
      },
      clearForms: () => {
        document.querySelectorAll('input:not([type="hidden"]), textarea, select')
          .forEach(input => {
            input.value = '';
            ['change', 'input'].forEach(eventType => 
              input.dispatchEvent(new Event(eventType, { bubbles: true }))
            );
          });
      },
      fillWithGenerator: () => {
        const element = document.activeElement;
        element && fillField(element, `custom:${request.generatorName}`);
      }
    };

    handlers[request.action]?.();
  });
})();
