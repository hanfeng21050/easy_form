import { evaluateCode } from './interpreter.js';

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded');
  
  const generatorList = document.getElementById('generatorList');
  const generatorName = document.getElementById('generatorName');
  const generatorCode = document.getElementById('generatorCode');
  const testGenerator = document.getElementById('testGenerator');
  const saveGenerator = document.getElementById('saveGenerator');
  const previewResult = document.getElementById('previewResult');

  if (!generatorList || !generatorName || !generatorCode || !testGenerator || !saveGenerator || !previewResult) {
    console.error('Required elements not found');
    return;
  }

  let currentEditingGenerator = null;

  // 加载保存的生成器
  loadGenerators();

  // 测试生成器按钮点击事件
  testGenerator.addEventListener('click', async () => {
    console.log('Test button clicked');
    try {
      const code = generatorCode.value;
      console.log('Evaluating code:', code);
      const result = await evaluateCode(code);
      console.log('Evaluation result:', result);
      previewResult.textContent = JSON.stringify(result, null, 2);
    } catch (error) {
      console.error('Test error:', error);
      previewResult.textContent = `错误: ${error.message}`;
    }
  });

  // 保存生成器按钮点击事件
  saveGenerator.addEventListener('click', async () => {
    console.log('Save button clicked');
    const name = generatorName.value.trim();
    const code = generatorCode.value.trim();

    if (!name || !code) {
      alert('请填写生成器名称和代码');
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
    } catch (error) {
      console.error('Save error:', error);
      alert(`保存失败: ${error.message}`);
    }
  });

  // 加载保存的生成器列表
  async function loadGenerators() {
    console.log('Loading generators...');
    try {
      const generators = await loadSavedGenerators();
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
        const item = document.createElement('div');
        item.className = 'generator-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'generator-name';
        nameSpan.textContent = name;
        
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'button-group';
        
        const editButton = document.createElement('button');
        editButton.textContent = '编辑';
        editButton.onclick = () => editGenerator(name, code);
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '删除';
        deleteButton.onclick = () => deleteGenerator(name);
        
        buttonsDiv.appendChild(editButton);
        buttonsDiv.appendChild(deleteButton);
        
        item.appendChild(nameSpan);
        item.appendChild(buttonsDiv);
        generatorList.appendChild(item);
      });
    } catch (error) {
      console.error('Load generators error:', error);
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
    if (!confirm(`确定要删除生成器 "${name}" 吗？`)) {
      return;
    }

    try {
      const generators = await loadSavedGenerators();
      delete generators[name];
      await chrome.storage.sync.set({ 'customGenerators': generators });
      loadGenerators();
    } catch (error) {
      console.error('Delete generator error:', error);
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
});
