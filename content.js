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
    const parts = [];
    
    // 从当前元素向上遍历，直到找到一个具有唯一标识的祖先元素
    function generatePath(el, isTarget = true) {
      if (!el || el === document.body) return;
      
      let identifier = el.tagName.toLowerCase();
      
      // 对目标元素使用所有可用的属性
      if (isTarget) {
        if (el.id) identifier += `#${el.id}`;
        if (el.name) identifier += `[name="${el.name}"]`;
        if (el.getAttribute('placeholder')) identifier += `[placeholder="${el.getAttribute('placeholder')}"]`;
        if (el.getAttribute('type')) identifier += `[type="${el.getAttribute('type')}"]`;
        if (el.getAttribute('data-id')) identifier += `[data-id="${el.getAttribute('data-id')}"]`;
        
        // 使用 class，但过滤掉动态类
        const classes = Array.from(el.classList)
          .filter(cls => !cls.includes('has-generator-btn'))
          .join('.');
        if (classes) identifier += `.${classes}`;
      } else {
        // 对父元素只使用稳定的标识符
        if (el.id) identifier += `#${el.id}`;
        if (el.getAttribute('data-id')) identifier += `[data-id="${el.getAttribute('data-id')}"]`;
      }
      
      // 如果当前层级没有唯一标识，添加 nth-child
      if (identifier === el.tagName.toLowerCase() || (!isTarget && !el.id)) {
        const parent = el.parentElement;
        if (parent) {
          const index = Array.from(parent.children)
            .filter(child => child.tagName === el.tagName)
            .indexOf(el) + 1;
          identifier += `:nth-of-type(${index})`;
        }
      }
      
      parts.unshift(identifier);
      
      // 如果还没有找到唯一标识，继续向上查找
      if (!el.id && !el.getAttribute('data-id')) {
        generatePath(el.parentElement, false);
      }
    }
    
    generatePath(element);
    return parts.join(' > ');
  }

  // 获取元素的绑定生成器
  async function getElementBinding(element) {
    const selector = generateElementSelector(element);
    const key = `${window.location.origin}|${selector}`;
    
    console.log('Checking binding for:', {
      selector,
      key,
      element
    });
    
    const { elementBindings = {} } = await chrome.storage.sync.get('elementBindings');
    const binding = elementBindings[key];
    
    console.log('Found binding:', binding);
    
    return binding;
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
          try {
            // 先保存绑定关系
            await saveElementBinding(element, request.generatorName);
            
            // 立即显示图标按钮
            await checkAndShowFloatButton(element);
            
            // 填充数据
            await fillField(element, `custom:${request.generatorName}`);
          } catch (error) {
            console.error('Fill with generator error:', error);
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
      await fillField(element, `custom:${binding.generatorName}`);
    };
    
    // 将按钮添加到输入框内部
    element.parentNode.insertBefore(button, element.nextSibling);
    return button;
  }

  // 管理浮动按钮
  const floatButtons = new Map();

  // 检查并显示浮动按钮
  async function checkAndShowFloatButton(element) {
    try {
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
      console.error('Check and show float button error:', error);
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

  // 页面加载完成后检查所有输入元素
  document.addEventListener('DOMContentLoaded', checkAllInputs);

  // 为了确保在 DOMContentLoaded 之前加载的页面也能正常工作
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAllInputs);
  } else {
    checkAllInputs();
  }
})();
