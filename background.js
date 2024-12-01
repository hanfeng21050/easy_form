// 存储右键菜单项的ID
let menuItems = new Map();

// 初始化右键菜单
async function initContextMenus() {
  // 清除所有已存在的菜单
  await chrome.contextMenus.removeAll();
  
  // 创建主菜单
  chrome.contextMenus.create({
    id: 'fillWithGenerator',
    title: '使用生成器填充',
    contexts: ['editable']
  });

  // 加载保存的生成器并创建子菜单
  const result = await chrome.storage.sync.get('customGenerators');
  const generators = result.customGenerators || {};
  
  Object.keys(generators).forEach(name => {
    const id = `generator-${name}`;
    menuItems.set(id, name);
    
    chrome.contextMenus.create({
      id,
      parentId: 'fillWithGenerator',
      title: name,
      contexts: ['editable']
    });
  });
}

// 监听存储变化，更新右键菜单
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.customGenerators) {
    initContextMenus();
  }
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (menuItems.has(info.menuItemId)) {
    const generatorName = menuItems.get(info.menuItemId);
    
    // 先注入content script
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [
          'lib/eval5.min.js',
          'lib/eval5.js',
          'interpreter.js',
          'content.js'
        ]
      });
    } catch (error) {
      // 如果脚本已经注入，会抛出错误，我们可以忽略它
    }
    
    // 确保content script加载完成后再发送消息
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'fillWithGenerator',
        generatorName,
        targetElementId: info.targetElementId
      });
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  }
});

// 初始化
initContextMenus();