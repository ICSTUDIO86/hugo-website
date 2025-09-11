/**
 * IC Studio - 列出数据库集合云函数
 */

const cloud = require('@cloudbase/node-sdk');

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
});

const db = app.database();

exports.main = async (event, context) => {
  try {
    // 先尝试查看数据库中的一些常见集合
    const collections = ['orders', 'refund_logs', 'codes', 'users', 'payments'];
    const results = {};
    
    for (const collectionName of collections) {
      try {
        const data = await db.collection(collectionName).limit(5).get();
        results[collectionName] = {
          exists: true,
          count: data.data.length,
          sample: data.data.slice(0, 2) // 只显示前2条记录作为示例
        };
      } catch (error) {
        results[collectionName] = {
          exists: false,
          error: error.message
        };
      }
    }
    
    return {
      success: true,
      data: results,
      timestamp: new Date()
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};