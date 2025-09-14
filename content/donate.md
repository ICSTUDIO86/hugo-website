---
title: "支持 IC Studio"
slug: /donate/
description: 如果你觉得我们的内容对你的音乐之路有帮助，那就请 IC Studio 喝杯咖啡吧！
image: images/donate.png
categories:
weight: 4
tags:
  - web
draft: false
---
嘿！如果 IC Studio 的内容帮到了你，
无论是少走了弯路，还是灵感大爆发——
不如请我喝杯咖啡，为我的创作加点燃料吧！

## 💖 支持方式

### 👉 一杯咖啡的支持
<div class="p-6 bg-zinc-100 rounded-3xl">
  <form id="paypal-form" class="flex flex-col space-y-4">
    <label for="amount" class="font-bold">金额 (EUR):</label>
    <input type="number" id="amount" name="amount" min="1" step="1" value="2" class="p-2 border rounded">
    <button type="submit" class="bg-blue-500 text-white p-2 rounded">
      通过 PayPal 支持
    </button>
  </form>
</div>
<script>
  document.getElementById('paypal-form').addEventListener('submit', function(event) {
    event.preventDefault();
    var amount = document.getElementById('amount').value;
    if (amount) {
      window.open('https://paypal.me/icstudio86/' + amount + '?country.x=IT&locale.x=en_US', '_blank');
    } else {
      window.open('https://paypal.me/icstudio86?country.x=IT&locale.x=en_US', '_blank');
    }
  });
</script>

- Bilibili 充电: https://space.bilibili.com/376362605
### 🌱 免费支持（也超重要！）
- 点赞、投币（B站用户专属）、关注、收藏、分享

### 🌟 想长期支持？加入会员吧！
- 点击这里[加入会员](/%E7%BD%91%E7%AB%99%E5%86%85%E5%AE%B9/%E4%BC%9A%E5%91%98/)，解锁[专属内容](/%E7%BD%91%E7%AB%99%E5%86%85%E5%AE%B9/%E4%BC%9A%E5%91%98/)!
