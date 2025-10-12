/**
 * 检测滚动容器
 */

console.log('🔍 检测滚动容器...\n');

// 1. 检查 html 和 body 的 overflow
const html = document.documentElement;
const body = document.body;

const htmlStyle = window.getComputedStyle(html);
const bodyStyle = window.getComputedStyle(body);

console.log('📄 HTML 元素：');
console.log('  overflow:', htmlStyle.overflow);
console.log('  overflow-x:', htmlStyle.overflowX);
console.log('  overflow-y:', htmlStyle.overflowY);
console.log('  height:', htmlStyle.height);
console.log('  position:', htmlStyle.position);
console.log('  transform:', htmlStyle.transform);
console.log('');

console.log('📄 BODY 元素：');
console.log('  overflow:', bodyStyle.overflow);
console.log('  overflow-x:', bodyStyle.overflowX);
console.log('  overflow-y:', bodyStyle.overflowY);
console.log('  height:', bodyStyle.height);
console.log('  position:', bodyStyle.position);
console.log('  transform:', bodyStyle.transform);
console.log('');

// 2. 检查所有可能的滚动容器
console.log('📦 查找所有滚动容器：');
const allElements = document.querySelectorAll('*');
const scrollContainers = [];

allElements.forEach(el => {
  const style = window.getComputedStyle(el);
  const hasScroll = (
    (style.overflow !== 'visible' && style.overflow !== '') ||
    (style.overflowY !== 'visible' && style.overflowY !== '') ||
    (style.overflowX !== 'visible' && style.overflowX !== '')
  );

  if (hasScroll && (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)) {
    scrollContainers.push({
      element: el,
      tag: el.tagName,
      id: el.id,
      className: el.className,
      overflow: style.overflow,
      overflowY: style.overflowY,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight
    });
  }
});

if (scrollContainers.length > 0) {
  console.log(`  找到 ${scrollContainers.length} 个滚动容器：`);
  scrollContainers.forEach((container, i) => {
    console.log(`\n  ${i + 1}. <${container.tag}> ${container.id ? '#' + container.id : ''} ${container.className ? '.' + container.className.split(' ').join('.') : ''}`);
    console.log(`     overflow: ${container.overflow}, overflow-y: ${container.overflowY}`);
    console.log(`     scrollHeight: ${container.scrollHeight}, clientHeight: ${container.clientHeight}`);
  });
} else {
  console.log('  未找到滚动容器（正常情况下应该是 window 在滚动）');
}
console.log('');

// 3. 检查是否有平滑滚动
console.log('🎯 滚动行为：');
console.log('  html scroll-behavior:', htmlStyle.scrollBehavior);
console.log('  body scroll-behavior:', bodyStyle.scrollBehavior);
console.log('');

// 4. 监听滚动事件来确定谁在滚动
console.log('👂 监听滚动事件 5 秒钟（请滚动页面）...');
let windowScrolled = false;
let bodyScrolled = false;
let htmlScrolled = false;

const windowListener = () => {
  windowScrolled = true;
  console.log('  ✓ window 触发了 scroll 事件, scrollY:', window.scrollY);
};

const bodyListener = () => {
  bodyScrolled = true;
  console.log('  ✓ body 触发了 scroll 事件');
};

const htmlListener = () => {
  htmlScrolled = true;
  console.log('  ✓ html 触发了 scroll 事件');
};

window.addEventListener('scroll', windowListener);
body.addEventListener('scroll', bodyListener);
html.addEventListener('scroll', htmlListener);

setTimeout(() => {
  window.removeEventListener('scroll', windowListener);
  body.removeEventListener('scroll', bodyListener);
  html.removeEventListener('scroll', htmlListener);

  console.log('\n📊 滚动事件总结：');
  console.log('  window scrolled:', windowScrolled);
  console.log('  body scrolled:', bodyScrolled);
  console.log('  html scrolled:', htmlScrolled);
  console.log('\n✅ 检测完成');
}, 5000);

console.log('⏳ 等待 5 秒...');
