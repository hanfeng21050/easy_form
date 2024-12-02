// 存储右键菜单项的ID
const menuItems = new Map();

// 初始化右键菜单
async function initContextMenus() {
  await chrome.contextMenus.removeAll();
  
  chrome.contextMenus.create({
    id: 'fillWithGenerator',
    title: '填充数据',
    contexts: ['editable']
  });

  const { customGenerators = {} } = await chrome.storage.sync.get('customGenerators');
  
  Object.keys(customGenerators).forEach(name => {
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

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.customGenerators) {
    initContextMenus();
  }
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (menuItems.has(info.menuItemId)) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'fillWithGenerator',
        generatorName: menuItems.get(info.menuItemId)
      });
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  }
});

// 初始化
initContextMenus();