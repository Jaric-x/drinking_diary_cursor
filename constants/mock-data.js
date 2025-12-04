/**
 * 测试数据
 * 用于开发阶段UI展示
 * 12.4日2条，12.1日2条，11.19日1条
 */

const MOCK_NOTES = [
  // 12月4日 - 2条记录
  {
    id: '1',
    name: 'Old Fashioned',
    dateString: '12.04',
    timeString: '20:30',
    rating: 5,
    tags: ['烟熏味', '焦糖味'],
    imageUrl: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?auto=format&fit=crop&w=800&q=80',
    notes: '完美平衡的苦味和甜味。橙皮增添了可爱的香气。',
    location: 'The Campbell',
    price: 24,
    createTime: 1733320200000, // 2024-12-04 20:30
    updateTime: 1733320200000
  },
  {
    id: '2',
    name: 'Manhattan',
    dateString: '12.04',
    timeString: '22:15',
    rating: 4,
    tags: ['甜味', '坚果味'],
    imageUrl: 'https://images.unsplash.com/photo-1542849187-5ec6ea5e6a27?auto=format&fit=crop&w=800&q=80',
    notes: '顺滑而精致。晚上的永恒经典。',
    location: 'Employees Only',
    price: 22,
    createTime: 1733326500000, // 2024-12-04 22:15
    updateTime: 1733326500000
  },
  // 12月1日 - 2条记录
  {
    id: '3',
    name: 'Vesper Martini',
    dateString: '12.01',
    timeString: '19:45',
    rating: 5,
    tags: ['辛辣', '花香'],
    imageUrl: 'https://images.unsplash.com/photo-1629246522511-2a9452b41490?auto=format&fit=crop&w=800&q=80',
    notes: '詹姆斯·邦德风格。清脆、强劲且极其优雅。',
    location: 'Dukes Bar',
    price: 28,
    createTime: 1733053500000, // 2024-12-01 19:45
    updateTime: 1733053500000
  },
  {
    id: '4',
    name: 'Negroni Sbagliato',
    dateString: '12.01',
    timeString: '21:30',
    rating: 4,
    tags: ['苦味', '果香'],
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80',
    notes: '一个更轻盈的错误。普罗塞克增添了可爱的气泡。',
    location: 'Dante NYC',
    price: 18,
    createTime: 1733059800000, // 2024-12-01 21:30
    updateTime: 1733059800000
  },
  // 11月19日 - 1条记录
  {
    id: '5',
    name: 'Highball',
    dateString: '11.19',
    timeString: '19:10',
    rating: 5,
    tags: ['甜味', '果香'],
    imageUrl: 'https://images.unsplash.com/photo-1597075687490-8f673c6c17f6?auto=format&fit=crop&w=800&q=80',
    notes: '简单而优雅。碳酸化确实打开了威士忌的风味。',
    location: 'Katana Kitten',
    price: 16,
    createTime: 1732014600000, // 2024-11-19 19:10
    updateTime: 1732014600000
  }
];

module.exports = {
  MOCK_NOTES
};
