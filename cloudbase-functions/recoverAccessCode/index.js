/**
 * IC Studio - 访问码找回云函数
 * 由于当前订单结构中不包含买家支付宝账号，所以改为提供订单号查询功能
 */

const cloud = require('@cloudbase/node-sdk');

// 初始化云开发
const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
});

const db = app.database();

exports.main = async (event, context) => {
  console.log('🔍 访问码找回请求:', JSON.stringify(event, null, 2));
  
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
    
    const { alipay_account, timestamp } = requestData;
    
    // 参数验证
    if (!alipay_account) {
      return {
        success: false,
        error: '请提供支付宝账号',
        code: 'MISSING_ACCOUNT'
      };
    }
    
    console.log('✅ 参数验证通过，开始查询用户账号记录');
    
    // 从用户账号集合中查找匹配的记录
    try {
      const { data: userAccounts } = await db.collection('user_accounts').where({
        alipay_account: alipay_account.trim(),
        status: 'active'
      }).get();
      
      console.log('📊 找到匹配的账号记录数量:', userAccounts.length);
      
      if (userAccounts.length === 0) {
        return {
          success: false,
          error: '未找到与此支付宝账号关联的访问码记录。可能是：1) 支付时未保存账号信息 2) 输入的账号不正确',
          code: 'NO_ACCOUNT_RECORD_FOUND',
          suggestion: {
            message: '建议操作',
            options: [
              '检查输入的支付宝账号是否正确',
              '使用订单号进行退款申请',
              '联系客服：service@icstudio.club',
              '查看购买确认邮件中的访问码'
            ]
          }
        };
      }
      
      // 获取所有匹配的访问码
      const accessCodes = userAccounts
        .filter(account => account.access_code)
        .map(account => ({
          access_code: account.access_code,
          collected_at: account.collected_at,
          order_no: account.order_no
        }));
      
      if (accessCodes.length === 0) {
        return {
          success: false,
          error: '找到账号记录但没有关联的访问码。请联系客服获取帮助。',
          code: 'NO_ACCESS_CODE_FOUND',
          suggestion: {
            message: '建议操作',
            options: [
              '联系客服：service@icstudio.club',
              '提供订单信息以便查询'
            ]
          }
        };
      }
      
      console.log('✅ 成功找到访问码:', accessCodes.length, '个');
      
      // 记录找回访问码的日志
      try {
        await db.collection('access_code_recovery_logs').add({
          data: {
            alipay_account: alipay_account.trim(),
            found_codes_count: accessCodes.length,
            found_codes: accessCodes.map(c => c.access_code),
            client_ip: event.clientIP || 'unknown',
            user_agent: event.headers && event.headers['user-agent'] ? event.headers['user-agent'] : 'unknown',
            recovery_time: new Date(),
            request_id: context.requestId || 'unknown'
          }
        });
        console.log('📝 访问码找回日志已记录');
      } catch (logError) {
        console.warn('⚠️ 记录找回日志失败:', logError);
      }
      
      return {
        success: true,
        data: {
          access_codes: accessCodes,
          total_found: accessCodes.length,
          account_verified: alipay_account.trim()
        },
        message: `成功找到 ${accessCodes.length} 个与此支付宝账号关联的访问码`
      };
      
    } catch (queryError) {
      console.error('❌ 查询用户账号记录失败:', queryError);
      return {
        success: false,
        error: '查询过程中发生错误，请稍后重试',
        code: 'QUERY_ERROR',
        details: queryError.message
      };
    }
    
  } catch (error) {
    console.error('❌ 访问码找回失败:', error);
    
    return {
      success: false,
      error: '系统错误，请稍后重试',
      code: 'INTERNAL_ERROR',
      details: error.message
    };
  }
};