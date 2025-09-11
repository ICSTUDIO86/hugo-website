/**
 * IC Studio - 通过订单号退款云函数
 * 根据订单号直接调用 Z-Pay 退款 API
 */

const cloud = require('@cloudbase/node-sdk');
const crypto = require('crypto');

// 初始化云开发
const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
});

const db = app.database();

// MD5签名算法
function md5(str) {
    return crypto.createHash('md5').update(str, 'utf8').digest('hex').toLowerCase();
}

// Z-Pay退款API签名生成
function generateZPaySign(params, key) {
    // 1. 按参数名ASCII码从小到大排序，排除sign、sign_type、key和空值
    const sortedKeys = Object.keys(params)
        .filter(k => k !== 'sign' && k !== 'sign_type' && k !== 'key' && params[k] !== '' && params[k] !== null && params[k] !== undefined)
        .sort();
    
    // 2. 构建签名字符串 (不包含key字段，但在最后拼接KEY)
    const signString = sortedKeys
        .map(k => `${k}=${params[k]}`)
        .join('&') + key;
    
    console.log('🔐 签名字符串:', signString);
    return md5(signString);
}

// 调用Z-Pay退款API
async function callZPayRefund(orderNo, amount) {
    const key = 'UoA5vDBCe51EyVzdK2Fu2udBO1SAadjN'; // Z-Pay商户密钥
    
    const refundParams = {
        pid: '2025090607243839', // Z-Pay商户ID
        key: key, // 根据官方文档，key必须作为参数发送
        out_trade_no: orderNo,
        money: amount || '48.00'
    };
    
    const sign = generateZPaySign(refundParams, key);
    
    refundParams.sign = sign;
    refundParams.sign_type = 'MD5';
    
    console.log('📝 Z-Pay退款请求参数:', refundParams);
    
    // 构建表单数据
    const formData = new URLSearchParams();
    Object.keys(refundParams).forEach(key => {
        formData.append(key, refundParams[key]);
    });
    
    return new Promise((resolve, reject) => {
        const https = require('https');
        const postData = formData.toString();
        
        const options = {
            hostname: 'zpayz.cn',
            path: '/api.php?act=refund',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('💰 Z-Pay退款结果:', result);
                    resolve(result);
                } catch (parseError) {
                    console.error('❌ Z-Pay响应解析失败:', parseError);
                    reject(parseError);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ Z-Pay退款API调用失败:', error);
            reject(error);
        });
        
        req.write(postData);
        req.end();
    });
}

exports.main = async (event, context) => {
  console.log('🔄 订单号退款请求:', JSON.stringify(event, null, 2));
  
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
    
    const { order_no, reason, detail } = requestData;
    
    // 参数验证
    if (!order_no) {
      return {
        success: false,
        error: '请提供订单号',
        code: 'MISSING_ORDER_NUMBER'
      };
    }
    
    // 验证订单号格式 (至少10位字符)
    if (order_no.length < 10) {
      return {
        success: false,
        error: '订单号格式不正确',
        code: 'INVALID_ORDER_NUMBER_FORMAT'
      };
    }
    
    console.log('✅ 参数验证通过，处理订单号退款:', order_no);
    
    // 调用Z-Pay退款API
    try {
      const refundResult = await callZPayRefund(order_no, '48.00');
      
      if (refundResult.code === 1) {
        // 退款成功
        console.log('💰 订单号退款成功');
        
        // 尝试更新数据库中的订单状态（如果存在的话）
        try {
          const { data: orders } = await db.collection('orders')
            .where({ out_trade_no: order_no })
            .limit(1)
            .get();
          
          if (orders.length > 0) {
            await db.collection('orders').doc(orders[0]._id).update({
              refund_status: 'refunded',
              refund_time: new Date(),
              refund_reason: reason || '用户主动退款',
              refund_detail: detail || '',
              updated_time: new Date()
            });
            console.log('✅ 已更新数据库中的订单状态');
          } else {
            console.log('⚠️ 数据库中未找到对应订单，但退款已成功处理');
          }
        } catch (dbError) {
          console.warn('⚠️ 更新数据库失败，但退款已成功:', dbError);
          // 数据库更新失败不影响退款结果
        }
        
        // 记录退款日志
        try {
          await db.collection('refund_logs').add({
            out_trade_no: order_no,
            refund_amount: '48.00',
            refund_reason: reason || '用户主动退款',
            refund_detail: detail || '',
            refund_method: 'order_number',
            zpay_response: refundResult,
            client_ip: event.clientIP || 'unknown',
            user_agent: event.headers?.['user-agent'] || 'unknown',
            timestamp: new Date(),
            request_id: context.requestId
          });
        } catch (logError) {
          console.warn('⚠️ 记录退款日志失败:', logError);
          // 日志记录失败不影响主要功能
        }
        
        console.log('✅ 订单号退款处理完成');
        
        return {
          success: true,
          data: {
            out_trade_no: order_no,
            refund_amount: '48.00',
            product_name: 'IC Studio 视奏工具'
          },
          message: '退款申请已提交成功'
        };
        
      } else {
        // Z-Pay退款失败
        console.error('❌ Z-Pay退款失败:', refundResult);
        return {
          success: false,
          error: `退款申请失败：${refundResult.msg || '未知错误'}`,
          code: 'ZPAY_REFUND_FAILED',
          details: refundResult
        };
      }
      
    } catch (refundError) {
      console.error('❌ 退款API调用异常:', refundError);
      return {
        success: false,
        error: '退款系统暂时不可用，请稍后重试',
        code: 'REFUND_API_ERROR',
        details: refundError.message
      };
    }
    
  } catch (error) {
    console.error('❌ 订单号退款处理失败:', error);
    
    return {
      success: false,
      error: '系统错误，请稍后重试',
      code: 'INTERNAL_ERROR',
      details: error.message
    };
  }
};