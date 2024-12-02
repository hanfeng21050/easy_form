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

  // 生成元素的唯一标识
  function generateElementSelector(element) {
    let selector = element.tagName.toLowerCase();
    
    // 添加id
    if (element.id) {
      selector += `#${element.id}`;
    }
    
    // 添加name
    if (element.name) {
      selector += `[name="${element.name}"]`;
    }
    
    // 添加其他可能的标识属性
    ['placeholder', 'type', 'data-id'].forEach(attr => {
      if (element.getAttribute(attr)) {
        selector += `[${attr}="${element.getAttribute(attr)}"]`;
      }
    });
    
    return selector;
  }

  // 获取元素的绑定生成器
  async function getElementBinding(element) {
    const selector = generateElementSelector(element);
    const key = `${window.location.origin}|${selector}`;
    
    const { elementBindings = {} } = await chrome.storage.sync.get('elementBindings');
    return elementBindings[key];
  }

  // 保存元素绑定
  async function saveElementBinding(element, generatorName) {
    const selector = generateElementSelector(element);
    const key = `${window.location.origin}|${selector}`;
    
    const { elementBindings = {} } = await chrome.storage.sync.get('elementBindings');
    
    elementBindings[key] = {
      url: window.location.origin,
      selector,
      generatorName,
      lastUsed: Date.now()
    };
    
    await chrome.storage.sync.set({ elementBindings });
  }

  // 修改双击事件处理
  document.addEventListener('dblclick', async function(e) {
    if (!isAltPressed && !e.altKey) return;
    
    const target = e.target;
    if (!target.matches('input:not([type="hidden"]), textarea, select')) return;
    
    try {
      // 首先检查是否有绑定的生成器
      const binding = await getElementBinding(target);
      let generatorName;
      
      if (binding) {
        // 如果有绑定关系，使用绑定的生成器
        generatorName = binding.generatorName;
      } else {
        // 如果没有绑定，使用默认生成器
        const { defaultGenerator, customGenerators = {} } = 
          await chrome.storage.sync.get(['defaultGenerator', 'customGenerators']);
        generatorName = defaultGenerator || Object.keys(customGenerators)[0];
      }
      
      if (generatorName) {
        await fillField(target, `custom:${generatorName}`);
      }
    } catch (error) {
      log.error('Quick fill failed:', error);
    }
  });

  // 修改消息处理，在右键菜单选择生成器时建立绑定关系
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
      fillWithGenerator: async () => {
        const element = document.activeElement;
        if (element) {
          // 保存绑定关系
          await saveElementBinding(element, request.generatorName);
          // 填充数据
          await fillField(element, `custom:${request.generatorName}`);
        }
      }
    };

    handlers[request.action]?.();
  });
})();
