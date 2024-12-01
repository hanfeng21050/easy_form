// Field type detection and mapping
const fieldMapping = {
  // Name fields
  name: ['name', 'fullname', 'full-name'],
  firstName: ['firstname', 'fname', 'first-name', 'given-name'],
  lastName: ['lastname', 'lname', 'last-name', 'family-name'],
  
  // Contact fields
  email: ['email', 'e-mail', 'emailaddress'],
  phone: ['phone', 'telephone', 'tel', 'mobile', 'cell'],
  
  // Address fields
  address: ['address', 'street', 'streetaddress'],
  
  // Business fields
  company: ['company', 'organization', 'business', 'company-name'],
  jobTitle: ['job', 'title', 'position', 'job-title'],
  department: ['department', 'dept', 'team'],
  
  // Generic fields
  number: ['number', 'amount', 'quantity'],
  text: ['text', 'description', 'comment'],
  date: ['date', 'datetime']
};

function detectFieldType(element) {
  const name = element.name.toLowerCase();
  const id = element.id.toLowerCase();
  const type = element.type.toLowerCase();
  
  // Check each field type
  for (const [fieldType, keywords] of Object.entries(fieldMapping)) {
    if (keywords.some(keyword => 
      name.includes(keyword) || 
      id.includes(keyword) ||
      element.getAttribute('placeholder')?.toLowerCase().includes(keyword)
    )) {
      return fieldType;
    }
  }
  
  // Fallback to input type
  return type;
}

async function fillField(element, dataType) {
  const fieldType = detectFieldType(element);
  let value = '';
  
  if (dataType.startsWith('custom:')) {
    // 处理自定义生成器
    const generatorName = dataType.split(':')[1];
    const result = await chrome.storage.sync.get('customGenerators');
    const generators = result.customGenerators || {};
    const generatorCode = generators[generatorName];
    
    if (generatorCode) {
      try {
        const generatorFunc = eval('(' + generatorCode + ')');
        value = generatorFunc();
      } catch (error) {
        console.error('自定义生成器执行错误:', error);
      }
    }
  } else if (dataType === 'personal' && generators.personal[fieldType]) {
    value = generators.personal[fieldType]();
  } else if (dataType === 'business' && generators.business[fieldType]) {
    value = generators.business[fieldType]();
  } else if (generators.random[fieldType]) {
    value = generators.random[fieldType]();
  }
  
  if (value) {
    element.value = value;
    // 触发change事件
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForms') {
    const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
    inputs.forEach(input => fillField(input, request.dataType));
  } else if (request.action === 'clearForms') {
    const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
    inputs.forEach(input => {
      input.value = '';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
});
