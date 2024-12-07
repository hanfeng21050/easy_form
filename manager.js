document.addEventListener('DOMContentLoaded', async function() {
  const generatorList = document.getElementById('generatorList');
  const generatorName = document.getElementById('generatorName');
  const generatorCode = document.getElementById('generatorCode');
  const testGenerator = document.getElementById('testGenerator');
  const saveGenerator = document.getElementById('saveGenerator');
  const previewResult = document.getElementById('previewResult');
  const searchGenerator = document.getElementById('searchGenerator');
  const searchBinding = document.getElementById('searchBinding');

  // 添加标签页相关元素
  const bindingList = document.getElementById('bindingList');

  // 绑定关系搜索功能
  searchBinding.addEventListener('input', () => {
    const searchText = searchBinding.value.toLowerCase();
    const items = bindingList.getElementsByClassName('binding-item');
    
    Array.from(items).forEach(item => {
      const selector = item.querySelector('.selector').textContent.toLowerCase();
      const generator = item.querySelector('.generator-name').textContent.toLowerCase();
      const shouldShow = selector.includes(searchText) || generator.includes(searchText);
      item.style.display = shouldShow ? '' : 'none';
    });
  });

  // 测试生成器按钮点击事件
  testGenerator.addEventListener('click', async () => {
    try {
      const code = generatorCode.value;
      if (!code.trim()) {
        showToast('请输入生成器代码', 'error');
        return;
      }

      const result = await evaluateCode(code);
      previewResult.textContent = result;
      showToast('测试成功！');
    } catch (error) {
      previewResult.textContent = `错误: ${error.message}`;
      showToast('测试失败: ' + error.message, 'error');
    }
  });

  // 保存生成器按钮点击事件
  saveGenerator.addEventListener('click', async () => {
    const name = generatorName.value.trim();
    const code = generatorCode.value.trim();

    if (!name || !code) {
      showToast('请填写生成器名称和代码', 'error');
      return;
    }

    try {
      // 测试代码是否可以执行
      await evaluateCode(code);

      // 保存到 Chrome 存储
      const result = await chrome.storage.sync.get('customGenerators');
      const generators = result.customGenerators || {};
      generators[name] = code;
      await chrome.storage.sync.set({ 'customGenerators': generators });

      // 刷新生成器列表
      loadGenerators();
      showToast('保存成功！');
    } catch (error) {
      showToast('保存失败: ' + error.message, 'error');
    }
  });

  // 搜索功能
  searchGenerator.addEventListener('input', () => {
    const searchText = searchGenerator.value.toLowerCase();
    const items = generatorList.getElementsByClassName('generator-item');
    
    Array.from(items).forEach(item => {
      const name = item.querySelector('span').textContent.toLowerCase();
      item.style.display = name.includes(searchText) ? '' : 'none';
    });
  });

  // 加载生成器列表
  async function loadGenerators() {
    const result = await chrome.storage.sync.get(['customGenerators', 'defaultGenerator', 'generatorOrder']);
    const generators = result.customGenerators || {};
    const defaultGenerator = result.defaultGenerator;
    const order = result.generatorOrder || Object.keys(generators);
    
    generatorList.innerHTML = '';
    
    // 按保存的顺序显示生成器
    order.forEach(name => {
      if (generators[name]) {
        const item = document.createElement('div');
        item.className = 'generator-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        item.appendChild(nameSpan);

        // 添加删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-delete';
        deleteBtn.innerHTML = '删除';
        deleteBtn.onclick = async (e) => {
          e.stopPropagation(); // 阻止事件冒泡
          if (confirm(`确定要删除生成器 "${name}" 吗？`)) {
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
              loadBindings();  // 刷新绑定关系列表
              // 如果当前正在编辑这个生成器，清空编辑器
              if (generatorName.value === name) {
                generatorName.value = '';
                generatorCode.value = '';
                previewResult.textContent = '';
              }
              showToast('删除成功！');
            } catch (error) {
              showToast('删除失败: ' + error.message, 'error');
            }
          }
        };
        
        item.appendChild(deleteBtn);
        item.onclick = () => {
          generatorName.value = name;
          generatorCode.value = generators[name];
          previewResult.textContent = '';
          // 高亮选中的生成器
          document.querySelectorAll('.generator-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          // 自动在绑定关系中搜索该生成器
          searchBinding.value = name;
          // 触发搜索事件
          const event = new Event('input');
          searchBinding.dispatchEvent(event);
        };
        
        generatorList.appendChild(item);
      }
    });

    // 显示未在顺序中的新生成器
    Object.keys(generators).forEach(name => {
      if (!order.includes(name)) {
        const item = document.createElement('div');
        item.className = 'generator-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        item.appendChild(nameSpan);

        // 添加删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-delete';
        deleteBtn.innerHTML = '删除';
        deleteBtn.onclick = async (e) => {
          e.stopPropagation(); // 阻止事件冒泡
          if (confirm(`确定要删除生成器 "${name}" 吗？`)) {
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
              loadBindings();  // 刷新绑定关系列表
              // 如果当前正在编辑这个生成器，清空编辑器
              if (generatorName.value === name) {
                generatorName.value = '';
                generatorCode.value = '';
                previewResult.textContent = '';
              }
              showToast('删除成功！');
            } catch (error) {
              showToast('删除失败: ' + error.message, 'error');
            }
          }
        };
        
        item.appendChild(deleteBtn);
        item.onclick = () => {
          generatorName.value = name;
          generatorCode.value = generators[name];
          previewResult.textContent = '';
          // 高亮选中的生成器
          document.querySelectorAll('.generator-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          // 自动在绑定关系中搜索该生成器
          searchBinding.value = name;
          // 触发搜索事件
          const event = new Event('input');
          searchBinding.dispatchEvent(event);
        };
        
        generatorList.appendChild(item);
      }
    });
  }

  // 加载绑定关系列表
  async function loadBindings() {
    const { elementBindings = {}, customGenerators = {} } = 
      await chrome.storage.sync.get(['elementBindings', 'customGenerators']);
    
    bindingList.innerHTML = '';
    
    if (Object.keys(elementBindings).length === 0) {
      bindingList.innerHTML = `
        <div class="empty-state">
          暂无绑定关系
        </div>
      `;
      return;
    }

    // 显示所有绑定
    Object.entries(elementBindings).forEach(([key, binding]) => {
      bindingList.appendChild(createBindingItem({ key, ...binding }));
    });
  }

  // 创建绑定项
  function createBindingItem(binding) {
    const item = document.createElement('div');
    item.className = 'binding-item';
    
    // 确保所有字段都有默认值
    const {
      url = '未知URL',
      selector = '未知选择器',
      generatorName = '未知生成器'
    } = binding;
    
    item.innerHTML = `
      <div class="binding-info">
        <div class="selector">${selector}</div>
        <div class="generator-name">使用生成器: ${generatorName}</div>
      </div>
      <div class="actions">
        <button class="btn btn-danger btn-delete-binding">删除</button>
      </div>
    `;

    // 添加删除功能
    item.querySelector('.btn-delete-binding').onclick = async () => {
      if (confirm('确定要删除这个绑定关系吗？')) {
        try {
          const result = await chrome.storage.sync.get('elementBindings');
          const elementBindings = result.elementBindings || {};
          delete elementBindings[binding.key];
          await chrome.storage.sync.set({ elementBindings });
          loadBindings();
          showToast('删除成功！');
        } catch (error) {
          showToast('删除失败: ' + error.message, 'error');
        }
      }
    };

    return item;
  }

  // Toast提示功能
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    if (type === 'error') {
      toast.classList.add('error');
    }
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 2000);
  }

  // 初始化加载
  loadGenerators();
  loadBindings();
}); 