// 加载并显示所有绑定关系
async function loadBindings() {
  const { elementBindings = {} } = await chrome.storage.sync.get('elementBindings');
  const bindingList = document.getElementById('bindingList');
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

// 初始化
document.addEventListener('DOMContentLoaded', loadBindings); 