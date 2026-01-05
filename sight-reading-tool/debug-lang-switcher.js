/**
 * 语言切换器诊断工具
 * 在浏览器控制台运行此脚本来诊断 position: fixed 为什么不工作
 */

console.log('🔍 开始诊断语言切换器...\n');

const switcher = document.querySelector('.lang-switcher');

if (!switcher) {
  console.error('❌ 找不到 .lang-switcher 元素');
} else {
  console.log('✅ 找到语言切换器元素\n');

  // 1. 检查计算后的样式
  const computed = window.getComputedStyle(switcher);
  console.log('📊 计算后的关键样式：');
  console.log('  position:', computed.position);
  console.log('  top:', computed.top);
  console.log('  right:', computed.right);
  console.log('  z-index:', computed.zIndex);
  console.log('  transform:', computed.transform);
  console.log('\n');

  // 2. 检查内联样式
  console.log('📝 内联样式（style attribute）：');
  console.log('  position:', switcher.style.position);
  console.log('  top:', switcher.style.top);
  console.log('  right:', switcher.style.right);
  console.log('\n');

  // 3. 检查父元素链
  console.log('👪 父元素链及其可能破坏 fixed 定位的属性：');
  let element = switcher.parentElement;
  let level = 1;

  while (element && level <= 5) {
    const style = window.getComputedStyle(element);
    const tagName = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';

    console.log(`\n  Level ${level}: <${tagName}${id}${classes}>`);

    // 检查会创建新 containing block 的属性
    const problematicProps = {
      'transform': style.transform,
      'filter': style.filter,
      'perspective': style.perspective,
      'will-change': style.willChange,
      'contain': style.contain,
      'backdrop-filter': style.backdropFilter,
      'overflow': style.overflow,
      'overflow-x': style.overflowX,
      'overflow-y': style.overflowY
    };

    for (const [prop, value] of Object.entries(problematicProps)) {
      if (value && value !== 'none' && value !== 'visible' && value !== 'auto') {
        console.log(`    ⚠️  ${prop}: ${value}`);
      }
    }

    element = element.parentElement;
    level++;
  }

  console.log('\n');

  // 4. 检查是否有 CSS 规则覆盖
  console.log('🎨 应用到此元素的所有 CSS 规则（包含 position）：');
  const sheets = document.styleSheets;
  for (let i = 0; i < sheets.length; i++) {
    try {
      const rules = sheets[i].cssRules || sheets[i].rules;
      for (let j = 0; j < rules.length; j++) {
        const rule = rules[j];
        if (rule.style && rule.style.position && switcher.matches(rule.selectorText)) {
          console.log(`  ${rule.selectorText} { position: ${rule.style.position} }`);
        }
      }
    } catch (e) {
      // 跨域 CSS 无法访问，忽略
    }
  }

  console.log('\n');

  // 5. 测试强制修复
  console.log('🔧 尝试强制修复...');
  switcher.style.setProperty('position', 'fixed', 'important');
  switcher.style.setProperty('top', '20px', 'important');
  switcher.style.setProperty('right', '20px', 'important');
  switcher.style.setProperty('z-index', '99999', 'important');

  const newComputed = window.getComputedStyle(switcher);
  console.log('修复后的 computed position:', newComputed.position);

  if (newComputed.position === 'fixed') {
    console.log('✅ 强制修复成功！元素现在应该固定了。');
  } else {
    console.log('❌ 强制修复失败，position 仍然是:', newComputed.position);
    console.log('\n💡 可能的原因：');
    console.log('  1. 父元素有 transform/filter/perspective/contain 等属性创建了新的 containing block');
    console.log('  2. 浏览器不支持或有 bug');
    console.log('  3. 有其他 JavaScript 代码在干扰');
  }
}

console.log('\n✅ 诊断完成');
