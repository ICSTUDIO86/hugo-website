/**
 * 创建试用计数集合
 */
const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({
  env: process.env.TCB_ENV
});
const db = app.database();

exports.main = async (event, context) => {
  console.log('📊 开始创建 device_melody_trials 集合...');

  try {
    // 尝试在集合中添加一个测试文档来创建集合
    const testDoc = {
      _id: 'test_init_' + Date.now(),
      device_hash: 'test_device',
      used_count: 0,
      created_at: new Date(),
      test_record: true
    };

    console.log('✨ 插入测试记录以创建集合...');
    const result = await db.collection('device_melody_trials').add(testDoc);
    console.log('✅ 测试记录插入成功:', result.id);

    // 立即删除测试记录
    console.log('🧹 删除测试记录...');
    await db.collection('device_melody_trials').doc(result.id).remove();
    console.log('✅ 测试记录已删除');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'device_melody_trials 集合创建成功',
        testId: result.id
      })
    };

  } catch (error) {
    console.error('❌ 创建集合失败:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        code: error.code
      })
    };
  }
};