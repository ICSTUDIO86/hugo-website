/**
 * IC Studio - 用户支付账号收集云函数
 * 收集并存储用户支付宝账号信息，用于访问码找回功能
 */

const cloud = require('@cloudbase/node-sdk');

// 初始化云开发
const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
});

const db = app.database();

exports.main = async (event, context) => {
  console.log('📝 用户账号收集请求:', JSON.stringify(event, null, 2));
  
  try {
    // 解析请求参数 - HTTP 请求的参数在 event.body 中
    let requestData = {};
    if (event.body) {
      try {
        requestData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (parseError) {
        console.error('JSON 解析失败:', parseError);
        return {
          success: false,
          error: '请求格式错误',
          code: 'INVALID_JSON_FORMAT'
        };
      }
    } else {
      // 直接从 event 中获取参数（非 HTTP 请求）
      requestData = event;
    }
    
    const { 
      alipay_account, 
      access_code, 
      order_no, 
      phone, 
      email,
      timestamp,
      action = 'collect' 
    } = requestData;
    
    if (action === 'collect') {
      // 收集用户支付账号信息
      
      // 参数验证
      if (!alipay_account) {
        return {
          success: false,
          error: '请提供支付宝账号',
          code: 'MISSING_ALIPAY_ACCOUNT'
        };
      }
      
      if (!access_code && !order_no) {
        return {
          success: false,
          error: '请提供访问码或订单号',
          code: 'MISSING_IDENTIFIER'
        };
      }
      
      // 验证支付宝账号格式
      if (!validateAlipayAccount(alipay_account)) {
        return {
          success: false,
          error: '支付宝账号格式无效',
          code: 'INVALID_ALIPAY_FORMAT'
        };
      }
      
      console.log('✅ 参数验证通过，开始收集账号信息');
      
      // 构建账号记录
      const accountRecord = {
        alipay_account: alipay_account.trim(),
        access_code: access_code ? access_code.toUpperCase() : null,
        order_no: order_no || null,
        phone: phone || null,
        email: email || null,
        collected_at: new Date(),
        updated_at: new Date(),
        status: 'active',
        source: 'manual_collection',
        client_ip: event.clientIP || 'unknown',
        user_agent: event.headers && event.headers['user-agent'] ? event.headers['user-agent'] : 'unknown'
      };
      
      let userAccountResult = null;
      
      // 尝试操作user_accounts集合，如果失败则直接同步到codes和orders
      try {
        // 检查是否已存在相同的账号记录
        let existingQuery;
        if (access_code) {
          existingQuery = db.collection('user_accounts').where({
            access_code: access_code.toUpperCase()
          });
        } else {
          existingQuery = db.collection('user_accounts').where({
            order_no: order_no
          });
        }
        
        const { data: existingAccounts } = await existingQuery.get();
        
        if (existingAccounts.length > 0) {
          // 更新现有记录
          const existingAccount = existingAccounts[0];
          await db.collection('user_accounts').doc(existingAccount._id).update({
            alipay_account: accountRecord.alipay_account,
            phone: accountRecord.phone,
            email: accountRecord.email,
            updated_at: new Date(),
            last_update_source: 'manual_update'
          });
          
          console.log('📝 已更新现有账号记录:', existingAccount._id);
          userAccountResult = { id: existingAccount._id, action: 'updated' };
        } else {
          // 创建新记录
          const { id } = await db.collection('user_accounts').add({
            data: accountRecord
          });
          
          console.log('📝 已创建新账号记录:', id);
          userAccountResult = { id: id, action: 'created' };
        }
        
      } catch (userAccountError) {
        console.log('⚠️ user_accounts集合操作失败，将直接同步到codes和orders集合:', userAccountError.message);
        userAccountResult = { error: 'user_accounts_unavailable', action: 'direct_sync' };
      }
      
      // 自动同步到codes和orders集合
      const syncResult = await syncToCodesAndOrders(accountRecord, db);
      
      return {
        success: true,
        data: {
          account_id: userAccountResult.id || null,
          action: userAccountResult.action,
          sync_result: syncResult,
          alipay_account: accountRecord.alipay_account
        },
        message: userAccountResult.action === 'direct_sync' 
          ? '账号信息已直接同步到codes和orders集合' 
          : '账号信息已收集并同步成功'
      };
      
    } else if (action === 'query') {
      // 查询用户支付账号信息
      
      if (!alipay_account && !access_code && !order_no) {
        return {
          success: false,
          error: '请提供查询条件（支付宝账号、访问码或订单号）',
          code: 'MISSING_QUERY_PARAMS'
        };
      }
      
      let query;
      if (alipay_account) {
        query = db.collection('user_accounts').where({
          alipay_account: alipay_account.trim()
        });
      } else if (access_code) {
        query = db.collection('user_accounts').where({
          access_code: access_code.toUpperCase()
        });
      } else {
        query = db.collection('user_accounts').where({
          order_no: order_no
        });
      }
      
      const { data: accounts } = await query.limit(10).get();
      
      return {
        success: true,
        data: {
          accounts: accounts.map(account => ({
            account_id: account._id,
            alipay_account: account.alipay_account,
            access_code: account.access_code,
            order_no: account.order_no,
            phone: account.phone,
            email: account.email,
            collected_at: account.collected_at,
            status: account.status
          })),
          count: accounts.length
        },
        message: `找到 ${accounts.length} 条账号记录`
      };
      
    } else {
      return {
        success: false,
        error: '无效的操作类型',
        code: 'INVALID_ACTION'
      };
    }
    
  } catch (error) {
    console.error('❌ 用户账号收集失败:', error);
    
    return {
      success: false,
      error: '系统错误，请稍后重试',
      code: 'INTERNAL_ERROR',
      details: error.message
    };
  }
};

/**
 * 验证支付宝账号格式
 */
function validateAlipayAccount(account) {
  if (!account || typeof account !== 'string') {
    return false;
  }
  
  const trimmed = account.trim();
  
  // 邮箱格式
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  // 手机号格式 (中国大陆)
  const phonePattern = /^1[3-9]\d{9}$/;
  
  return emailPattern.test(trimmed) || phonePattern.test(trimmed);
}

/**
 * 同步支付宝账号信息到codes和orders集合
 */
async function syncToCodesAndOrders(accountRecord, db) {
  const syncResult = {
    codes_updated: 0,
    orders_updated_by_access_code: 0,
    orders_updated_by_order_no: 0,
    errors: []
  };
  
  try {
    console.log('🔄 开始同步支付宝账号信息到codes和orders集合');
    
    const { access_code, order_no, alipay_account, phone, email } = accountRecord;
    
    if (!access_code && !order_no) {
      console.log('⚠️ 没有访问码或订单号，跳过同步');
      return syncResult;
    }
    
    const syncData = {
      alipay_account: alipay_account,
      alipay_phone: phone,
      alipay_email: email,
      alipay_sync_time: new Date(),
      alipay_sync_source: 'collectUserAccount_auto'
    };
    
    // 同步到codes集合
    if (access_code) {
      try {
        const codesQuery = await db.collection('codes')
          .where({ code: access_code.toUpperCase() })
          .get();
        
        for (const codeRecord of codesQuery.data || []) {
          if (!codeRecord.alipay_account) {
            await db.collection('codes').doc(codeRecord._id).update(syncData);
            console.log(`✅ 已同步到codes集合: ${codeRecord._id}`);
            syncResult.codes_updated++;
          }
        }
      } catch (error) {
        console.error('❌ 同步到codes集合失败:', error);
        syncResult.errors.push('codes集合同步失败: ' + error.message);
      }
    }
    
    // 同步到orders集合
    if (access_code) {
      try {
        const ordersQuery = await db.collection('orders')
          .where({ access_code: access_code.toUpperCase() })
          .get();
        
        for (const orderRecord of ordersQuery.data || []) {
          if (!orderRecord.alipay_account) {
            await db.collection('orders').doc(orderRecord._id).update(syncData);
            console.log(`✅ 已同步到orders集合 (通过访问码): ${orderRecord._id}`);
            syncResult.orders_updated_by_access_code++;
          }
        }
      } catch (error) {
        console.error('❌ 同步到orders集合 (通过访问码) 失败:', error);
        syncResult.errors.push('orders集合(访问码)同步失败: ' + error.message);
      }
    }
    
    // 通过订单号同步到orders集合
    if (order_no) {
      try {
        const ordersByNoQuery = await db.collection('orders')
          .where({ out_trade_no: order_no })
          .get();
        
        for (const orderRecord of ordersByNoQuery.data || []) {
          if (!orderRecord.alipay_account) {
            await db.collection('orders').doc(orderRecord._id).update({ 
              ...syncData, 
              alipay_sync_source: 'collectUserAccount_auto_by_order_no' 
            });
            console.log(`✅ 已同步到orders集合 (通过订单号): ${orderRecord._id}`);
            syncResult.orders_updated_by_order_no++;
          }
        }
      } catch (error) {
        console.error('❌ 同步到orders集合 (通过订单号) 失败:', error);
        syncResult.errors.push('orders集合(订单号)同步失败: ' + error.message);
      }
    }
    
    console.log('✅ 支付宝账号信息同步完成');
    
  } catch (error) {
    console.error('❌ 同步支付宝账号信息失败:', error);
    syncResult.errors.push('同步过程失败: ' + error.message);
  }
  
  return syncResult;
}