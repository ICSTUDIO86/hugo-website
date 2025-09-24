/**
 * IC Studio - 通过访问码退款云函数
 * 根据访问码查找订单信息并处理退款，成功后删除访问码
 */

const crypto = require('crypto');
const { checkRefundTimeLimit, formatRefundTimeError } = require('./utils/refundTimeChecker');

exports.main = async (event, context) => {
  console.log('🔄 访问码退款请求:', JSON.stringify(event, null, 2));
  
  try {
    // 导入cloudbase SDK
    const cloud = require('@cloudbase/node-sdk');
    
    // 初始化云开发
    const app = cloud.init({
      env: cloud.SYMBOL_CURRENT_ENV
    });
    
    const db = app.database();
    
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
    
    const { access_code, order_no, reason, detail } = requestData;
    
    // 参数验证 - 支持访问码或订单号
    if (!access_code && !order_no) {
      return {
        success: false,
        error: '请提供访问码或订单号',
        code: 'MISSING_PARAMETERS'
      };
    }
    
    if (access_code && order_no) {
      return {
        success: false,
        error: '请只提供访问码或订单号中的一个',
        code: 'TOO_MANY_PARAMETERS'
      };
    }
    
    // 验证访问码格式
    if (access_code && !/^[A-Z0-9]{6,20}$/i.test(access_code)) {
      return {
        success: false,
        error: '访问码格式不正确',
        code: 'INVALID_ACCESS_CODE_FORMAT'
      };
    }
    
    // 验证订单号格式
    if (order_no && order_no.length < 10) {
      return {
        success: false,
        error: '订单号格式不正确',
        code: 'INVALID_ORDER_NUMBER_FORMAT'
      };
    }
    
    console.log('✅ 参数验证通过，查询条件:', { access_code, order_no });
    
    // 统一的查询逻辑：与前端验证系统保持一致
    let order = null;
    let orderSource = '';
    
    if (access_code) {
      console.log('🔍 使用访问码查询，采用与前端验证相同的逻辑');
      
      // 第一步：查询 codes 集合（与前端验证一致）
      console.log('📋 步骤1: 查询 codes 集合...');
      const { data: codes } = await db.collection('codes')
        .where({ 
          code: access_code.toUpperCase(),
          status: 'active'
        })
        .limit(1)
        .get();
      
      console.log(`📊 codes 集合查询结果: ${codes.length} 条记录`);
      
      if (codes.length === 0) {
        return {
          success: false,
          error: '访问码无效或已过期（在codes集合中未找到）',
          code: 'INVALID_ACCESS_CODE'
        };
      }
      
      const codeRecord = codes[0];
      console.log('✅ 在 codes 集合中找到访问码记录:', codeRecord.code);
      
      // 第二步：通过 out_trade_no 查询对应订单
      console.log('📋 步骤2: 通过订单号查询 orders 集合...');
      const { data: orders } = await db.collection('orders')
        .where({ out_trade_no: codeRecord.out_trade_no })
        .limit(1)
        .get();
      
      console.log(`📊 orders 集合查询结果: ${orders.length} 条记录`);
      
      if (orders.length === 0) {
        return {
          success: false,
          error: `访问码对应的订单不存在（订单号: ${codeRecord.out_trade_no}）`,
          code: 'ORDER_NOT_FOUND'
        };
      }
      
      order = orders[0];
      orderSource = 'codes_to_orders';
      
      // 验证订单状态
      if (order.status !== 'paid') {
        return {
          success: false,
          error: `订单状态不允许退款（当前状态: ${order.status}，需要: paid）`,
          code: 'INVALID_ORDER_STATUS'
        };
      }
      
      console.log('✅ 通过 codes->orders 链路找到有效订单:', order.out_trade_no);
      
    } else {
      console.log('🔍 使用订单号直接查询 orders 集合');
      
      // 直接查询订单
      const { data: orders } = await db.collection('orders')
        .where({
          out_trade_no: order_no,
          status: 'paid'
        })
        .limit(1)
        .get();
      
      console.log(`📊 orders 集合查询结果: ${orders.length} 条记录`);
      
      if (orders.length === 0) {
        return {
          success: false,
          error: '未找到对应的有效订单（直接查询orders集合）',
          code: 'NO_ORDER_FOUND'
        };
      }
      
      order = orders[0];
      orderSource = 'direct_orders';
      console.log('✅ 直接在 orders 集合中找到订单:', order.out_trade_no);
    }
    console.log('📦 找到订单:', order._id, '订单号:', order.out_trade_no);

    // 🕐 检查退款时间期限（7天内）
    console.log('🕐 检查退款时间期限...');
    const timeCheck = checkRefundTimeLimit(order, null);

    if (!timeCheck.valid) {
      console.log('❌ 超过退款期限:', timeCheck.message);

      // 记录超期退款尝试日志
      try {
        await db.collection('refund_logs').add({
          data: {
            order_id: order._id,
            order_no: order.out_trade_no,
            access_code: access_code ? access_code.toUpperCase() : null,
            status: 'rejected_time_expired_by_access_code',
            rejection_reason: timeCheck.message,
            days_passed: timeCheck.days_passed,
            purchase_time: timeCheck.purchase_time,
            attempt_time: new Date(),
            source: 'refund_by_access_code',
            order_source: orderSource,
            request_id: `refund_access_code_expired_${Date.now()}`
          }
        });
      } catch (logError) {
        console.warn('⚠️ 超期退款日志记录失败:', logError);
      }

      // 返回时间期限错误
      const timeError = formatRefundTimeError(timeCheck, order.out_trade_no);
      return {
        success: false,
        error: timeError.error,
        message: timeError.message,
        details: timeError.details,
        code: 'REFUND_TIME_EXPIRED',
        order_id: order._id,
        order_no: order.out_trade_no
      };
    }

    console.log('✅ 退款时间检查通过:', `购买${timeCheck.days_passed}天后申请退款`);

    // 检查订单状态，防止重复退款
    if (order.refund_status === 'refunded') {
      return {
        success: false,
        error: '此订单已经退款，请勿重复申请',
        code: 'ALREADY_REFUNDED'
      };
    }
    
    // 调用Z-Pay退款API
    console.log('💰 开始调用Z-Pay退款API...');
    
    let zpayRefundResult;
    try {
      zpayRefundResult = await callZPayRefund(order.out_trade_no, order.money || '1.00');
      console.log('💰 Z-Pay退款结果:', zpayRefundResult);
    } catch (refundError) {
      console.error('❌ Z-Pay退款API调用失败:', refundError);
      return {
        success: false,
        error: '退款系统暂时不可用，请稍后重试',
        code: 'ZPAY_API_ERROR',
        details: refundError.message
      };
    }
    
    // 检查Z-Pay退款结果
    if (zpayRefundResult.code !== 1) {
      console.error('❌ Z-Pay退款失败:', zpayRefundResult);
      
      // 改善错误信息，提供更准确的问题描述
      let errorMessage = zpayRefundResult.msg || '未知错误';
      let userFriendlyMessage = '';
      let suggestedAction = '';
      
      if (errorMessage.includes('余额不足') || errorMessage.includes('卖家余额不足') || 
          errorMessage.includes('订单不存在') || errorMessage.includes('订单编号不存在')) {
        
        // 对于系统中存在但支付平台找不到的订单，创建手动退款记录
        console.log('🔧 订单在支付系统中不存在，尝试创建手动退款记录...');
        
        try {
          // 尝试创建手动退款记录，如果集合不存在则跳过
          await db.collection('manual_refunds').add({
            data: {
              access_code: access_code ? access_code.toUpperCase() : null, // 修复：处理订单号退款时access_code为空的情况
              order_id: order._id,
              out_trade_no: order.out_trade_no,
              refund_amount: order.money || '1.00',
              refund_reason: reason || '用户主动退款',
              refund_detail: detail || '',
              refund_method: access_code ? 'access_code' : 'order_number', // 记录退款方式
              status: 'pending_manual_review',
              error_details: {
                zpay_error: zpayRefundResult.msg,
                zpay_response: zpayRefundResult
              },
              client_ip: event.clientIP || 'unknown',
              user_agent: event.headers && event.headers['user-agent'] ? event.headers['user-agent'] : 'unknown',
              created_time: new Date(),
              request_id: context.requestId
            }
          });
          
          console.log('✅ 手动退款记录已创建');
          
          // 标记访问码为待手动退款
          await db.collection('orders').doc(order._id).update({
            refund_status: 'pending_manual_review',
            refund_time: new Date(),
            refund_reason: reason || '用户主动退款（需手动处理）',
            manual_refund_required: true,
            updated_time: new Date()
          });
          
          const identifierText = access_code ? `访问码 ${access_code.toUpperCase()}` : `订单号 ${order.out_trade_no}`;
          userFriendlyMessage = '退款申请已提交，正在安排手动处理';
          suggestedAction = `您的${identifierText}退款申请已成功提交。由于支付系统数据同步问题，我们将在1-2个工作日内手动为您处理退款。如有疑问请联系客服：service@icstudio.club`;
          
          return {
            success: true,
            data: {
              refund_type: 'manual_processing',
              access_code: access_code ? access_code.toUpperCase() : null,
              out_trade_no: order.out_trade_no,
              refund_amount: order.money || '1.00',
              processing_time: '1-2个工作日'
            },
            message: userFriendlyMessage,
            suggestion: suggestedAction
          };
          
        } catch (manualError) {
          console.error('❌ 创建手动退款记录失败:', manualError);
          
          // 即使创建记录失败，仍然告知用户我们会处理退款
          const identifierTextFallback = access_code ? `访问码 ${access_code.toUpperCase()}` : `订单号 ${order.out_trade_no}`;
          userFriendlyMessage = '退款申请已收到，将手动处理';
          suggestedAction = `您的${identifierTextFallback}退款申请已收到。由于系统问题，我们将在1-2个工作日内手动为您处理退款。如需加急处理请联系客服：service@icstudio.club`;
          
          return {
            success: true,
            data: {
              refund_type: 'manual_processing',
              access_code: access_code ? access_code.toUpperCase() : null,
              out_trade_no: order.out_trade_no,
              refund_amount: order.money || '1.00',
              processing_time: '1-2个工作日'
            },
            message: userFriendlyMessage,
            suggestion: suggestedAction
          };
        }
        
      } else {
        userFriendlyMessage = `支付系统返回错误：${errorMessage}`;
        suggestedAction = '请稍后重试，或联系客服处理。';
      }
      
      return {
        success: false,
        error: userFriendlyMessage,
        suggestion: suggestedAction,
        code: 'ZPAY_REFUND_FAILED',
        details: {
          original_error: zpayRefundResult.msg,
          order_found_locally: true,
          order_number: order.out_trade_no,
          access_code: access_code.toUpperCase(),
          zpay_response: zpayRefundResult
        }
      };
    }
    
    console.log('✅ Z-Pay退款成功，开始更新数据库...');
    
    // 更新订单状态
    const updateData = {
      refund_status: 'refunded',
      refund_time: new Date(),
      refund_reason: reason || '用户主动退款',
      refund_detail: detail || '',
      updated_time: new Date(),
      zpay_refund_result: zpayRefundResult
    };
    
    // 只有使用访问码退款时才删除访问码
    if (access_code) {
      updateData.access_code = db.command.remove();
      
      // 同时从codes集合中删除对应的访问码记录
      try {
        await db.collection('codes').where({
          access_code: access_code.toUpperCase()
        }).remove();
        console.log('✅ 访问码已从codes集合中删除');
      } catch (deleteError) {
        console.warn('⚠️ 从codes集合删除访问码失败:', deleteError);
      }
    }
    
    await db.collection('orders').doc(order._id).update(updateData);
    
    // 记录退款日志
    try {
      await db.collection('refund_logs').add({
        data: {
          order_id: order._id,
          out_trade_no: order.out_trade_no,
          original_access_code: access_code ? access_code.toUpperCase() : null,
          refund_amount: order.money || '1.00',
          refund_reason: reason || '用户主动退款',
          refund_detail: detail || '',
          refund_method: access_code ? 'access_code' : 'order_number',
          query_source: orderSource, // 记录订单来源
          refund_status: 'completed',
          zpay_result: zpayRefundResult,
          client_ip: event.clientIP || 'unknown',
          user_agent: event.headers && event.headers['user-agent'] ? event.headers['user-agent'] : 'unknown',
          timestamp: new Date(),
          request_id: context.requestId
        }
      });
      
      console.log('📝 退款日志已记录');
    } catch (logError) {
      console.warn('⚠️ 记录退款日志失败:', logError);
      // 日志记录失败不影响主要功能
    }
    
    console.log('✅ 退款处理完成');
    
    const message = access_code ? 
      '退款申请已提交，访问码已失效，资金将在1-3个工作日内返还' : 
      '退款申请已提交成功，资金将在1-3个工作日内返还';
    
    return {
      success: true,
      data: {
        out_trade_no: order.out_trade_no,
        refund_amount: order.money || '1.00',
        product_name: order.name || 'IC Studio 视奏工具',
        refund_time: new Date(),
        zpay_trade_no: zpayRefundResult.trade_no || 'N/A'
      },
      message: message
    };
    
  } catch (error) {
    console.error('❌ 访问码退款处理失败:', error);
    
    return {
      success: false,
      error: '系统错误，请稍后重试',
      code: 'INTERNAL_ERROR',
      details: error.message
    };
  }
};

// MD5签名算法
function md5(str) {
    return crypto.createHash('md5').update(str, 'utf8').digest('hex').toLowerCase();
}

// 签名字符串生成（与创建订单保持一致）
function generateSignString(params, key) {
    // 1. 过滤并排序参数（与../common/sign.js保持一致）
    const filteredParams = Object.entries(params)
        .filter(([key, value]) => 
            key !== 'sign' && 
            key !== 'sign_type' && 
            value != null && 
            value !== ''
        )
        .sort((a, b) => a[0].localeCompare(b[0])); // ASCII码排序
    
    // 2. 构建基础字符串
    const baseString = filteredParams
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
    
    // 3. 添加key（与../common/sign.js第30行保持一致）
    const signString = baseString + '&key=' + key;
    
    console.log('🔐 Z-Pay退款签名字符串:', signString);
    return signString;
}

// 调用Z-Pay退款API
async function callZPayRefund(orderNo, amount) {
    const key = process.env.ZPAY_KEY; // 从环境变量获取Z-Pay商户密钥
    const pid = process.env.ZPAY_PID; // 从环境变量获取Z-Pay商户ID
    
    // 调试：显示环境变量状态
    console.log('🔧 Z-Pay环境变量检查:');
    console.log('  ZPAY_PID存在:', !!pid, '长度:', pid ? pid.length : 0);
    console.log('  ZPAY_KEY存在:', !!key, '长度:', key ? key.length : 0);
    console.log('  PID前6位:', pid ? pid.substring(0, 6) + '***' : 'null');
    console.log('  KEY前6位:', key ? key.substring(0, 6) + '***' : 'null');
    
    if (!key || !pid) {
        throw new Error('Z-Pay配置缺失：请检查ZPAY_KEY和ZPAY_PID环境变量');
    }
    
    // 构建退款参数（官方格式：直接传递key，不使用签名算法）
    const refundParams = {
        pid: pid,
        key: key,  // 直接传递key，不用于签名
        out_trade_no: orderNo,
        money: amount
    };
    
    console.log('📝 Z-Pay退款请求参数:', refundParams);
    
    return new Promise((resolve, reject) => {
        const https = require('https');
        
        // 构建表单数据
        const formData = new (require('url').URLSearchParams)();
        Object.keys(refundParams).forEach(key => {
            formData.append(key, refundParams[key]);
        });
        
        const postData = formData.toString();
        
        const options = {
            hostname: 'zpayz.cn',
            path: '/api.php?act=refund',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'IC-Studio-Refund/1.0'
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
                    console.log('💰 Z-Pay退款响应:', result);
                    resolve(result);
                } catch (parseError) {
                    console.error('❌ Z-Pay响应解析失败:', parseError);
                    console.error('原始响应:', data);
                    reject(new Error('Z-Pay响应格式错误: ' + data));
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ Z-Pay退款API网络错误:', error);
            reject(new Error('网络请求失败: ' + error.message));
        });
        
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('请求超时'));
        });
        
        req.write(postData);
        req.end();
    });
}