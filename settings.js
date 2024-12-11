document.addEventListener('DOMContentLoaded', async () => {
    const showFloatButton = document.getElementById('showFloatButton');

    // 加载设置
    async function loadSettings() {
        try {
            const { settings = {} } = await chrome.storage.sync.get('settings');
            showFloatButton.checked = settings.showFloatButton !== false;
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    // 保存设置
    async function saveSettings() {
        try {
            await chrome.storage.sync.set({
                settings: {
                    showFloatButton: showFloatButton.checked
                }
            });

            // 通知所有标签页设置已更改
            const tabs = await chrome.tabs.query({});
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'settingsChanged',
                    settings: {
                        showFloatButton: showFloatButton.checked
                    }
                }).catch(() => {
                    // 忽略不支持的标签页错误
                });
            });
        } catch (error) {
            console.error('保存设置失败:', error);
        }
    }

    // 监听设置变化
    showFloatButton.addEventListener('change', saveSettings);

    // 初始加载设置
    await loadSettings();
});
