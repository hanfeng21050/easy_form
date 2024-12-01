export const defaultGenerators = {
  personal: {
    name: () => {
      const names = ['张三', '李四', '王五', '赵六', '钱七'];
      return names[Math.floor(Math.random() * names.length)];
    },
    firstName: () => {
      const firstNames = ['张', '李', '王', '赵', '钱', '孙', '周'];
      return firstNames[Math.floor(Math.random() * firstNames.length)];
    },
    lastName: () => {
      const lastNames = ['明', '华', '强', '伟', '勇', '杰'];
      return lastNames[Math.floor(Math.random() * lastNames.length)];
    },
    email: () => {
      const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', '163.com', 'qq.com'];
      const username = Math.random().toString(36).substring(2, 8);
      return `${username}@${domains[Math.floor(Math.random() * domains.length)]}`;
    },
    phone: () => {
      return `1${Math.floor(Math.random() * 9 + 1)}${Array(9).fill(0).map(() => Math.floor(Math.random() * 10)).join('')}`;
    }
  },
  business: {
    company: () => {
      const prefixes = ['华为', '阿里', '腾讯', '百度', '京东'];
      const suffixes = ['科技', '网络', '信息', '软件', '集团'];
      return prefixes[Math.floor(Math.random() * prefixes.length)] + 
             suffixes[Math.floor(Math.random() * suffixes.length)];
    },
    jobTitle: () => {
      const titles = ['软件工程师', '产品经理', '项目主管', '技术总监', '部门经理'];
      return titles[Math.floor(Math.random() * titles.length)];
    },
    department: () => {
      const depts = ['研发部', '产品部', '市场部', '运营部', '人力资源部'];
      return depts[Math.floor(Math.random() * depts.length)];
    }
  },
  random: {
    number: () => Math.floor(Math.random() * 1000),
    text: () => Math.random().toString(36).substring(2, 10),
    date: () => {
      const date = new Date();
      date.setDate(date.getDate() + Math.floor(Math.random() * 365));
      return date.toISOString().split('T')[0];
    }
  }
}; 