// 使用立即执行函数避免全局变量污染
(async function() {
  let isAltPressed = false;
  let showFloatButton = true; // 默认显示浮动按钮
  
  // 空日志函数
  const log = {
    info: () => {},
    error: () => {}
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
      if (!dataType?.startsWith('custom:')) return;
      
      const generatorName = dataType.split(':')[1];
      const value = await generateValue(generatorName);
      
      if (value) {
        // 如果element是label元素，找到对应的input
        let inputElement = element;
        if (element.tagName.toLowerCase() === 'label') {
          const formItem = element.closest('.h-form-item');
          if (formItem) {
            inputElement = formItem.querySelector('input');
          }
        }
        
        if (inputElement) {
          inputElement.value = value;
          ['input', 'change'].forEach(eventType => 
            inputElement.dispatchEvent(new Event(eventType, { bubbles: true }))
          );
          log.info('Value set:', value);
        }
      }
    } catch (error) {
      log.error('Fill field failed:', error);
    }
  }

  // 生成基于位置的选择器
  function generatePositionSelector(element) {
    const tagName = element.tagName.toLowerCase();
    if (tagName !== 'input' && tagName !== 'textarea') {
      return null;
    }

    // 获取元素的特征属性
    const attributes = {
      type: element.type,
      name: element.name,
      placeholder: element.placeholder,
      class: Array.from(element.classList).join(' ')
    };

    // 构建属性选择器部分
    const attrSelectors = Object.entries(attributes)
      .filter(([_, value]) => value) // 只使用有值的属性
      .map(([key, value]) => `[${key}="${value}"]`)
      .join('');

    // 获取元素在同类元素中的索引
    const sameTypeElements = Array.from(document.querySelectorAll(tagName + attrSelectors));
    const elementIndex = sameTypeElements.indexOf(element);

    if (elementIndex === -1) {
      return null;
    }

    // 生成选择器：元素类型 + 属性 + 位置索引
    const selector = `position:${tagName}${attrSelectors}[position-index="${elementIndex}"]`;
    
    log.info('Generated position selector:', {
      tagName,
      attributes,
      elementIndex,
      selector,
      element
    });

    return selector;
  }

  // 根据位置选择器查找元素
  function findElementByPositionSelector(selector) {
    try {
      if (!selector.startsWith('position:')) {
        return null;
      }

      // 解析选择器
      const selectorWithoutPrefix = selector.substring(9); // 移除 'position:' 前缀
      const indexMatch = selectorWithoutPrefix.match(/\[position-index="(\d+)"\]$/);
      if (!indexMatch) {
        return null;
      }

      const elementIndex = parseInt(indexMatch[1]);
      const baseSelector = selectorWithoutPrefix.replace(/\[position-index="\d+"\]$/, '');
      
      // 查找所有匹配的元素
      const elements = Array.from(document.querySelectorAll(baseSelector));
      return elements[elementIndex] || null;
    } catch (error) {
      log.error('Error finding element by position:', error);
      return null;
    }
  }

  // 生成元素的唯一标识
  function generateElementSelector(element) {
    // 首先尝试使用表单项方式生成选择器
    const formSelector = generateFormItemSelector(element);
    if (formSelector) {
      return formSelector;
    }

    // 如果不是表单项，使用位置选择器
    return generatePositionSelector(element);
  }

  // 生成基于表单项的选择器
  function generateFormItemSelector(element) {
    // 只处理input和textarea元素
    const tagName = element.tagName.toLowerCase();
    if (tagName !== 'input' && tagName !== 'textarea') {
      log.info('Element is not input or textarea:', element);
      return null;
    }

    // 查找最近的表单项容器
    const formItem = element.closest('.uf3-form-item');
    if (!formItem) {
      log.info('No form item container found, will use position selector');
      return null;
    }

    // 获取label文本
    const labelElement = formItem.querySelector('.h-form-item-label');
    const labelText = labelElement?.querySelector('.uf3-inline-label-text span')?.textContent?.trim();
    if (!labelText) {
      log.info('No label text found, will use position selector');
      return null;
    }

    // 获取内容区域
    const contentElement = formItem.querySelector('.h-form-item-content');
    if (!contentElement) {
      log.info('No content element found, will use position selector');
      return null;
    }

    // 找到当前元素在content区域中的所有同类元素中的位置
    const elements = Array.from(contentElement.querySelectorAll('input, textarea'));
    const elementIndex = elements.indexOf(element);
    
    // 生成选择器：label文本 + 元素类型 + 索引
    const selector = `form-item:${labelText}[element-type="${tagName}"][element-index="${elementIndex}"]`;
    
    log.info('Generated form item selector:', {
      labelText,
      tagName,
      elementIndex,
      selector,
      element
    });

    return selector;
  }

  // 根据选择器查找元素
  function findElementBySelector(selector) {
    // 根据选择器类型调用不同的查找方法
    if (selector.startsWith('form-item:')) {
      return findElementByFormItemSelector(selector);
    } else if (selector.startsWith('position:')) {
      return findElementByPositionSelector(selector);
    }
    return null;
  }

  // 根据表单项选择器查找元素
  function findElementByFormItemSelector(selector) {
    try {
      if (!selector.startsWith('form-item:')) {
        return null;
      }

      // 解析选择器
      const labelText = selector.substring(10, selector.indexOf('[element-type="'));
      const typeMatch = selector.match(/element-type="([^"]+)"/);
      const indexMatch = selector.match(/element-index="(\d+)"/);
      
      if (!typeMatch || !indexMatch) {
        log.info('Invalid form item selector format:', selector);
        return null;
      }

      const elementType = typeMatch[1];
      const elementIndex = parseInt(indexMatch[1]);

      // 查找对应的表单项
      const formItems = Array.from(document.querySelectorAll('.uf3-form-item'));
      for (const formItem of formItems) {
        const labelSpan = formItem.querySelector('.uf3-inline-label-text span');
        if (labelSpan?.textContent?.trim() === labelText) {
          // 找到匹配的label后，查找对应位置的元素
          const contentElement = formItem.querySelector('.h-form-item-content');
          const elements = Array.from(contentElement.querySelectorAll('input, textarea'));
          const element = elements[elementIndex];
          
          if (element?.tagName.toLowerCase() === elementType) {
            return element;
          }
        }
      }
      
      log.info('No element found for form item selector:', selector);
      return null;
    } catch (error) {
      log.error('Error finding element:', error);
      return null;
    }
  }

  // 获取元素的绑定生成器
  async function getElementBinding(element) {
    const selector = generateElementSelector(element);
    if (!selector) {
      log.info('No valid selector generated for element:', element);
      return null;
    }
    
    log.info('Checking binding for:', {
      selector,
      element
    });
    
    const { elementBindings = {} } = await chrome.storage.sync.get('elementBindings');
    const binding = elementBindings[selector];
    
    log.info('Found binding:', binding);
    
    return binding;
  }

  // 保存元素绑定
  async function saveElementBinding(element, generatorName) {
    const selector = generateElementSelector(element);
    if (!selector) {
      log.error('Cannot generate selector for element:', element);
      return;
    }
    
    const { elementBindings = {} } = await chrome.storage.sync.get('elementBindings');
    
    elementBindings[selector] = {
      selector,
      generatorName,
      lastUsed: Date.now()
    };
    
    await chrome.storage.sync.set({ elementBindings });
    log.info('Binding saved:', { selector, generatorName });

    // 更新或创建浮动按钮
    const existingButton = floatButtons.get(element);
    if (existingButton) {
      // 如果按钮已存在，更新按钮的标题和点击事件
      existingButton.title = `使用生成器: ${generatorName}`;
      existingButton.onclick = async (e) => {
        e.stopPropagation();
        element.focus();
        await fillField(element, `custom:${generatorName}`);
      };
    } else {
      // 如果按钮不存在，创建新按钮
      const binding = { generatorName };
      const button = createFloatButton(element, binding);
      floatButtons.set(element, button);
    }
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
          try {
            // 先保存绑定关系
            await saveElementBinding(element, request.generatorName);
            
            // 立即显示图标按钮
            await checkAndShowFloatButton(element);
            
            // 填充数据
            await fillField(element, `custom:${request.generatorName}`);
          } catch (error) {
            log.error('Fill with generator error:', error);
          }
        }
      }
    };

    handlers[request.action]?.();
    return true; // 表示异步处理
  });

  // 修改浮动按钮样式
  const style = document.createElement('style');
  style.textContent = `
    .generator-float-btn {
      position: absolute;
      width: 20px;
      height: 20px;
      background: transparent;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border: none;
      opacity: 0.6;
      transition: opacity 0.2s;
      z-index: 2;
      right: 5px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: auto;
      padding: 0;
    }

    .generator-float-btn img {
      width: 16px;
      height: 16px;
      object-fit: contain;
    }

    .generator-float-btn:hover {
      opacity: 1;
    }

    /* 为父元素添加相对定位 */
    .has-generator-btn {
      position: relative !important;
      padding-right: 30px !important;
    }
  `;
  document.head.appendChild(style);

  // 修改创建浮动按钮的函数
  function createFloatButton(element, binding) {
    // 给输入框添加相对定位类
    element.classList.add('has-generator-btn');
    
    const button = document.createElement('button');
    button.className = 'generator-float-btn';
    
    // 创建图标元素
    const icon = document.createElement('img');
    icon.src = chrome.runtime.getURL('icons/icon16.png');
    icon.alt = '生成数据';
    button.appendChild(icon);
    
    button.title = `使用生成器: ${binding.generatorName}`;
    
    // 点击事件
    button.onclick = async (e) => {
      e.stopPropagation();
      
      // 先让输入框获得焦点
      element.focus();
      
      // 然后生成并填充数据
      await fillField(element, `custom:${binding.generatorName}`);
    };
    
    // 将按钮添加到输入框的父元素中
    element.parentNode.insertBefore(button, element.nextSibling);
    
    return button;
  }

  // 管理浮动按钮
  const floatButtons = new Map();

  // 检查并显示浮动按钮
  async function checkAndShowFloatButton(element) {
    try {
      // 如果设置为不显示按钮，直接返回
      if (!showFloatButton) {
        removeFloatButton(element);
        return;
      }

      const binding = await getElementBinding(element);
      
      // 如果没有绑定关系，移除可能存在的按钮
      if (!binding) {
        removeFloatButton(element);
        return;
      }

      // 只有存在绑定关系且没有创建过按钮时才创建
      if (!floatButtons.has(element)) {
        const button = createFloatButton(element, binding);
        floatButtons.set(element, button);
      }
    } catch (error) {
      log.error('Check and show float button failed:', error);
    }
  }

  // 监听设置变化
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'settingsChanged') {
      showFloatButton = request.settings.showFloatButton;
      
      // 如果设置为不显示按钮，移除所有现有按钮
      if (!showFloatButton) {
        floatButtons.forEach((button, element) => {
          removeFloatButton(element);
        });
      } else {
        // 如果设置为显示按钮，重新检查所有输入框
        checkAllInputs();
      }
    }
  });

  // 初始化时加载设置
  async function loadSettings() {
    try {
      const { settings = {} } = await chrome.storage.sync.get('settings');
      showFloatButton = settings.showFloatButton !== false;
    } catch (error) {
      log.error('Load settings failed:', error);
    }
  }

  // 移除更新位置的相关代码，因为按钮位置是相对于输入框的
  function updateFloatButtonPosition(element) {
    // 不再需要更新位置
  }

  // 移除滚动和调整大小的事件监听
  window.removeEventListener('scroll', () => {
    floatButtons.forEach((button, element) => {
      updateFloatButtonPosition(element);
    });
  });

  window.removeEventListener('resize', () => {
    floatButtons.forEach((button, element) => {
      updateFloatButtonPosition(element);
    });
  });

  // 修改移除按钮的函数
  function removeFloatButton(element) {
    const button = floatButtons.get(element);
    if (button) {
      element.classList.remove('has-generator-btn');
      button.remove();
      floatButtons.delete(element);
    }
  }

  // 修改页面加载时的检查逻辑
  async function checkAllInputs() {
    const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
    for (const input of inputs) {
      await checkAndShowFloatButton(input);
    }
  }

  // 监听 DOM 变化，处理动态添加的元素
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // 元素节点
          const inputs = node.matches('input:not([type="hidden"]), textarea, select') ? 
            [node] : 
            node.querySelectorAll('input:not([type="hidden"]), textarea, select');
          
          inputs.forEach(input => checkAndShowFloatButton(input));
        }
      });
    });
  });

  // 配置并启动观察器
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 移除焦点相关的事件监听
  document.removeEventListener('focusin', async (e) => {
    const target = e.target;
    if (target.matches('input:not([type="hidden"]), textarea, select')) {
      await checkAndShowFloatButton(target);
    }
  });

  document.removeEventListener('focusout', (e) => {
    const target = e.target;
    if (!target.matches('input:not([type="hidden"]), textarea, select')) return;
    
    setTimeout(() => {
      if (!target.matches(':focus')) {
        removeFloatButton(target);
      }
    }, 200);
  });

  // 页面加载完成后先加载设置，然后检查所有输入元素
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      await loadSettings();
      checkAllInputs();
    });
  } else {
    loadSettings().then(() => checkAllInputs());
  }
})();
