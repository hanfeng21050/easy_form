document.addEventListener('DOMContentLoaded', function() {
  const generatorList = document.getElementById('generatorList');
  const previewResult = document.getElementById('previewResult');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  const openManager = document.getElementById('openManager');
  const searchInput = document.getElementById('searchInput');

  if (!generatorList || !previewResult || !exportBtn || !importBtn || !importFile || !openManager || !searchInput) {
    showToast('初始化失败: 必需的DOM元素未找到', 'error');
    return;
  }

  // 加载保存的生成器
  loadGenerators();

  // 加载保存的生成器列表
  async function loadGenerators() {
    try {
      const result = await chrome.storage.sync.get(['customGenerators', 'defaultGenerator', 'generatorOrder']);
      const generators = result.customGenerators || {};
      const defaultGenerator = result.defaultGenerator;
      const order = result.generatorOrder || Object.keys(generators);
      
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
      
      // 按保存的顺序显示生成器
      order.forEach(name => {
        if (generators[name]) {
          const item = createGeneratorItem(name, generators[name]);
          generatorList.appendChild(item);
        }
      });
      
      // 显示未在顺序中的新生成器
      Object.keys(generators).forEach(name => {
        if (!order.includes(name)) {
          const item = createGeneratorItem(name, generators[name]);
          generatorList.appendChild(item);
        }
      });
    } catch (error) {
      showToast('加载生成器列表失败: ' + error.message, 'error');
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
      
      showToast('导入成功！');
      event.target.value = '';
    } catch (error) {
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
      showToast('复制失败', 'error');
    }
  });

  // 添加鼠标悬停效果
  previewResult.style.cursor = 'pointer';
  previewResult.title = '点击复制';

  // 打开管理页面按钮点击事件
  openManager.addEventListener('click', () => {
    chrome.tabs.create({
      url: 'manager.html'
    });
  });

  // 添加搜索功能
  searchInput.addEventListener('input', async () => {
    const searchText = searchInput.value.toLowerCase();
    const result = await chrome.storage.sync.get(['customGenerators', 'defaultGenerator']);
    const generators = result.customGenerators || {};
    
    generatorList.innerHTML = '';
    
    const filteredGenerators = Object.entries(generators).filter(([name]) => 
      name.toLowerCase().includes(searchText)
    );
    
    if (filteredGenerators.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.style.padding = '10px';
      emptyMessage.style.textAlign = 'center';
      emptyMessage.style.color = '#666';
      emptyMessage.textContent = searchText ? '没有找到匹配的生成器' : '暂无生成器，请添加新的生成器';
      generatorList.appendChild(emptyMessage);
      return;
    }
    
    filteredGenerators.forEach(([name, code]) => {
      const item = createGeneratorItem(name, code);
      generatorList.appendChild(item);
    });
  });

  function createGeneratorItem(name, code) {
    const item = document.createElement('div');
    item.className = 'generator-item';
    item.draggable = true;
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'generator-name';
    nameSpan.textContent = name;
    
    const actions = document.createElement('div');
    actions.className = 'actions';
    
    // 添加预览按钮
    const previewButton = document.createElement('button');
    previewButton.className = 'btn btn-action btn-preview';
    previewButton.textContent = '预览';
    previewButton.onclick = async () => {
        try {
            const result = await evaluateCode(code);
            previewResult.textContent = result;
        } catch (error) {
            previewResult.textContent = `错误: ${error.message}`;
        }
    };
    
    const setDefaultButton = document.createElement('button');
    setDefaultButton.className = 'btn btn-action default';
    setDefaultButton.textContent = '默认';
    setDefaultButton.onclick = async () => {
        try {
            await chrome.storage.sync.set({ defaultGenerator: name });
            showToast(`已将 "${name}" 设为默认生成器`);
            loadGenerators();
        } catch (error) {
            showToast('设置默认生器失败: ' + error.message, 'error');
        }
    };
    
    actions.appendChild(previewButton);
    actions.appendChild(setDefaultButton);
    
    item.appendChild(nameSpan);
    item.appendChild(actions);
    
    // 检查是否为默认生成器
    chrome.storage.sync.get('defaultGenerator', (result) => {
        if (result.defaultGenerator === name) {
            item.classList.add('default-generator');
        }
    });
    
    // 添加拖拽事件
    item.addEventListener('dragstart', () => {
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', async () => {
      item.classList.remove('dragging');
      
      // 保存新的顺序
      const items = [...generatorList.querySelectorAll('.generator-item')];
      const result = await chrome.storage.sync.get(['customGenerators', 'generatorOrder']);
      const generators = {};
      const order = [];
      
      items.forEach(item => {
        const name = item.querySelector('.generator-name').textContent;
        generators[name] = result.customGenerators[name];
        order.push(name);
      });
      
      await chrome.storage.sync.set({ 
        customGenerators: generators,
        generatorOrder: order
      });
    });
    
    return item;
  }

  // 添加拖拽排序功能
  generatorList.addEventListener('dragover', e => {
    e.preventDefault();
    const draggingItem = document.querySelector('.dragging');
    if (!draggingItem) return;
    
    // 移除所有项的drag-over类
    document.querySelectorAll('.generator-item').forEach(item => {
      item.classList.remove('drag-over');
    });
    
    const siblings = [...generatorList.querySelectorAll('.generator-item:not(.dragging)')];
    const nextSibling = siblings.find(sibling => {
      const rect = sibling.getBoundingClientRect();
      const offset = e.clientY - rect.top - rect.height / 2;
      if (offset < 0) {
        sibling.classList.add('drag-over');
        return true;
      }
      return false;
    });
    
    if (nextSibling) {
      generatorList.insertBefore(draggingItem, nextSibling);
    } else {
      generatorList.appendChild(draggingItem);
    }
  });

  // 拖拽结束时移除所有动画类
  generatorList.addEventListener('dragend', () => {
    document.querySelectorAll('.generator-item').forEach(item => {
      item.classList.remove('drag-over');
    });
  });
});
