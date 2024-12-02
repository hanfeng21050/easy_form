document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded');
  
  const generatorList = document.getElementById('generatorList');
  const generatorName = document.getElementById('generatorName');
  const generatorCode = document.getElementById('generatorCode');
  const testGenerator = document.getElementById('testGenerator');
  const saveGenerator = document.getElementById('saveGenerator');
  const previewResult = document.getElementById('previewResult');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');

  if (!generatorList || !generatorName || !generatorCode || !testGenerator || !saveGenerator || !previewResult || !exportBtn || !importBtn || !importFile) {
    console.error('Required elements not found');
    return;
  }

  let currentEditingGenerator = null;

  // 加载保存的生成器
  loadGenerators();

  // 测试生成器按钮点击事件
  testGenerator.addEventListener('click', async () => {
    try {
      const code = generatorCode.value;
      if (!code.trim()) {
        showToast('请输入生成器代码', 'error');
        return;
      }

      const result = await evaluateCode(code);
      
      // 直接显示结果，不添加引号
      previewResult.textContent = result;
      
      showToast('测试成功！');
    } catch (error) {
      console.error('Test error:', error);
      previewResult.textContent = `错误: ${error.message}`;
      showToast('测试失败: ' + error.message, 'error');
    }
  });

  // 保存生成器按钮点击事件
  saveGenerator.addEventListener('click', async () => {
    console.log('Save button clicked');
    const name = generatorName.value.trim();
    const code = generatorCode.value.trim();

    if (!name || !code) {
      showToast('请填写生成器名称和代码', 'error');
      return;
    }

    try {
      // 测试代码是否可以执行
      console.log('Testing code before save:', code);
      await evaluateCode(code);

      // 保存到 Chrome 存储
      const generators = await loadSavedGenerators();
      generators[name] = code;
      await chrome.storage.sync.set({ 'customGenerators': generators });
      console.log('Generator saved successfully');

      // 刷新生成器列表
      loadGenerators();
      
      // 清空表单
      generatorName.value = '';
      generatorCode.value = '';
      previewResult.textContent = '';
      currentEditingGenerator = null;
      
      showToast('保存成功！');
    } catch (error) {
      console.error('Save error:', error);
      showToast('保存失败: ' + error.message, 'error');
    }
  });

  // 加载保存的生成器列表
  async function loadGenerators() {
    console.log('Loading generators...');
    try {
      const result = await chrome.storage.sync.get(['customGenerators', 'defaultGenerator']);
      const generators = result.customGenerators || {};
      const defaultGenerator = result.defaultGenerator;
      
      generatorList.innerHTML = '';
      
      if (Object.keys(generators).length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.style.padding = '10px';
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.color = '#666';
        emptyMessage.textContent = '暂无生成器，请添加新的生成器';
        generatorList.appendChild(emptyMessage);
        return;
      }
      
      Object.entries(generators).forEach(([name, code]) => {
        const item = createGeneratorItem(name, code);
        generatorList.appendChild(item);
      });
    } catch (error) {
      console.error('Load generators error:', error);
      showToast('加载生成器列表失败: ' + error.message, 'error');
    }
  }

  // 编辑生成器
  function editGenerator(name, code) {
    console.log('Editing generator:', name);
    currentEditingGenerator = name;
    generatorName.value = name;
    generatorCode.value = code;
    previewResult.textContent = '';
  }

  // 删除生成器
  async function deleteGenerator(name) {
    console.log('Deleting generator:', name);

    try {
      // 获取所有数据
      const result = await chrome.storage.sync.get(['customGenerators', 'elementBindings', 'defaultGenerator']);
      const generators = result.customGenerators || {};
      const elementBindings = result.elementBindings || {};
      
      // 删除生成器
      delete generators[name];
      
      // 如果删除的是默认生成器，清除默认生成器设置
      let updates = { customGenerators: generators };
      if (result.defaultGenerator === name) {
        updates.defaultGenerator = null;
      }
      
      // 删除相关的绑定关系
      let hasBindings = false;
      Object.entries(elementBindings).forEach(([key, binding]) => {
        if (binding.generatorName === name) {
          hasBindings = true;
          delete elementBindings[key];
        }
      });
      if (hasBindings) {
        updates.elementBindings = elementBindings;
      }
      
      // 保存更新
      await chrome.storage.sync.set(updates);
      
      // 刷新界面
      loadGenerators();
      if (document.querySelector('.tab[data-tab="bindings"]').classList.contains('active')) {
        loadBindings();
      }
      
      showToast('删除成功！');
    } catch (error) {
      console.error('Delete generator error:', error);
      showToast('删除失败: ' + error.message, 'error');
    }
  }

  // 从存储中加载保存的生成器
  async function loadSavedGenerators() {
    console.log('Loading saved generators...');
    try {
      const result = await chrome.storage.sync.get('customGenerators');
      return result.customGenerators || {};
    } catch (error) {
      console.error('Load saved generators error:', error);
      return {};
    }
  }

  // 修改导出功能
  exportBtn.addEventListener('click', async () => {
    try {
      // 获取所有数据
      const result = await chrome.storage.sync.get([
        'customGenerators',
        'defaultGenerator',
        'elementBindings'
      ]);

      const exportData = {
        customGenerators: result.customGenerators || {},
        defaultGenerator: result.defaultGenerator || null,
        elementBindings: result.elementBindings || {},
        exportTime: new Date().toISOString(),
        version: '1.0'
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'generator-config.json';
      
      document.body.appendChild(a);
      a.click();
      
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      showToast('导出失败: ' + error.message, 'error');
    }
  });
  
  // 导入功能实现
  importBtn.addEventListener('click', () => {
    importFile.click();
  });
  
  // 修改导入功能
  importFile.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // 验证导入数据的格式
      if (!data.customGenerators || typeof data.customGenerators !== 'object') {
        throw new Error('无效的生成器配置数据');
      }

      // 保存所有数据
      await chrome.storage.sync.set({
        customGenerators: data.customGenerators,
        defaultGenerator: data.defaultGenerator || null,
        elementBindings: data.elementBindings || {}
      });

      // 刷新界面
      await loadGenerators();
      if (document.querySelector('.tab[data-tab="bindings"]').classList.contains('active')) {
        await loadBindings();
      }
      
      showToast('导入成功！');
      event.target.value = '';
    } catch (error) {
      console.error('导入失败:', error);
      showToast('导入失败: ' + error.message, 'error');
    }
  });

  // Toast 提示功能
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 16px;
      border-radius: 4px;
      color: white;
      z-index: 10000;
      transition: opacity 0.2s;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      backdrop-filter: blur(4px);
      max-width: 280px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    
    if (type === 'error') {
      toast.style.backgroundColor = 'rgba(255, 68, 68, 0.9)';
    } else {
      toast.style.backgroundColor = 'rgba(76, 175, 80, 0.9)';
    }
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 200);
    }, 1500);
  }

  // 添加代码格式化函数
  function formatCode(code) {
    // 简单的格式化
    return code.replace(/^\s*function\s*\(\s*\)\s*\{/, 'function() {')
              .replace(/\}\s*$/, '\n}')
              .replace(/\n\s+/g, '\n  ');
  }

  // 添加快捷键支持
  generatorCode.addEventListener('keydown', (e) => {
    // Ctrl + Enter 执行测试
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      testGenerator.click();
    }
    
    // Tab 键缩进
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = generatorCode.selectionStart;
      const end = generatorCode.selectionEnd;
      generatorCode.value = generatorCode.value.substring(0, start) + '  ' + 
                           generatorCode.value.substring(end);
      generatorCode.selectionStart = generatorCode.selectionEnd = start + 2;
    }
  });

  // 保存最近使用的生成器
  function saveHistory(name, code) {
    const history = JSON.parse(localStorage.getItem('generatorHistory') || '[]');
    history.unshift({ name, code, time: Date.now() });
    if (history.length > 10) history.pop();
    localStorage.setItem('generatorHistory', JSON.stringify(history));
  }

  // 显示历史记录
  function showHistory() {
    const history = JSON.parse(localStorage.getItem('generatorHistory') || '[]');
    const historyList = document.createElement('div');
    historyList.className = 'history-list';
    history.forEach(item => {
      const div = document.createElement('div');
      div.textContent = `${item.name} (${new Date(item.time).toLocaleString()})`;
      div.onclick = () => {
        generatorName.value = item.name;
        generatorCode.value = item.code;
      };
      historyList.appendChild(div);
    });
    // 显示历史记录列表
  }

  // 建议添加数据备份机制
  async function backupGenerators() {
    const generators = await loadSavedGenerators();
    localStorage.setItem('generators_backup', JSON.stringify(generators));
  }

  // 添加快捷键提示
  function addShortcutHints() {
    const shortcuts = {
      'Ctrl + Enter': '测试生成器',
      'Ctrl + S': '保存生成器',
      'Esc': '清空输入'
    };
    
    // 显示快捷键提示...
  }

  function createGeneratorItem(name, code) {
    const item = document.createElement('div');
    item.className = 'generator-item';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'generator-name';
    nameSpan.textContent = name;
    
    const actions = document.createElement('div');
    actions.className = 'actions';
    
    const setDefaultButton = document.createElement('button');
    setDefaultButton.className = 'btn btn-action default';
    setDefaultButton.textContent = '默认';
    setDefaultButton.onclick = async () => {
      try {
        await chrome.storage.sync.set({ defaultGenerator: name });
        showToast(`已将 "${name}" 设为默认生成器`);
        loadGenerators();
      } catch (error) {
        showToast('设置默认成器失败: ' + error.message, 'error');
      }
    };
    
    const editButton = document.createElement('button');
    editButton.className = 'btn btn-action edit';
    editButton.textContent = '编辑';
    editButton.onclick = () => editGenerator(name, code);
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-action delete';
    deleteButton.textContent = '删除';
    deleteButton.onclick = () => deleteGenerator(name);
    
    actions.appendChild(setDefaultButton);
    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    
    item.appendChild(nameSpan);
    item.appendChild(actions);
    
    // 检查是否为默认生成器
    chrome.storage.sync.get('defaultGenerator', (result) => {
      if (result.defaultGenerator === name) {
        item.classList.add('default-generator');
      }
    });
    
    return item;
  }

  // 标签页切换
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // 更新标签页状态
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // 更新内容显示
      const tabContents = document.querySelectorAll('.tab-content');
      tabContents.forEach(content => content.classList.remove('active'));
      document.getElementById(`${tab.dataset.tab}Tab`).classList.add('active');
      
      // 如果切换到绑定关系标签，加载绑定列表
      if (tab.dataset.tab === 'bindings') {
        loadBindings();
      }
    });
  });

  // 加载绑定关系列表
  async function loadBindings() {
    const bindingList = document.getElementById('bindingList');
    const { elementBindings = {} } = await chrome.storage.sync.get('elementBindings');
    
    bindingList.innerHTML = '';
    
    if (Object.keys(elementBindings).length === 0) {
      bindingList.innerHTML = '<div class="binding-item">暂无绑定关系</div>';
      return;
    }
    
    Object.entries(elementBindings).forEach(([key, binding]) => {
      const item = document.createElement('div');
      item.className = 'binding-item';
      
      const info = document.createElement('div');
      info.className = 'binding-info';
      
      const url = document.createElement('div');
      url.className = 'url';
      url.textContent = binding.url;
      
      const selector = document.createElement('div');
      selector.className = 'selector';
      selector.textContent = binding.selector;
      
      const generator = document.createElement('div');
      generator.className = 'generator-name';
      generator.textContent = `使用生成器: ${binding.generatorName}`;
      
      info.appendChild(url);
      info.appendChild(selector);
      info.appendChild(generator);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-delete';
      deleteBtn.textContent = '删除';
      deleteBtn.onclick = async () => {
        delete elementBindings[key];
        await chrome.storage.sync.set({ elementBindings });
        loadBindings();
      };
      
      item.appendChild(info);
      item.appendChild(deleteBtn);
      bindingList.appendChild(item);
    });
  }

  // 添加点击复制功能
  previewResult.addEventListener('click', async () => {
    const text = previewResult.textContent;
    if (!text) return;
    
    try {
      await navigator.clipboard.writeText(text);
      
      // 添加临时的复制提示效果
      const originalColor = previewResult.style.backgroundColor;
      previewResult.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';  // 轻微的绿色背景
      
      // 显示简短的复制成功提示
      showToast('已复制', 'success');
      
      // 恢复原始背景色
      setTimeout(() => {
        previewResult.style.backgroundColor = originalColor;
      }, 200);
    } catch (error) {
      console.error('复制失败:', error);
      showToast('复制失败', 'error');
    }
  });

  // 添加鼠标悬停效果
  previewResult.style.cursor = 'pointer';
  previewResult.title = '点击复制';
});
