const cloud = require('@cloudbase/node-sdk');
const crypto = require('crypto');

// 临时硬编码配置（仅用于测试）
const TEMP_CONFIG = {
  ZPAY_PID: '2025090607243839',
  ZPAY_KEY: 'UoA5vDBCe51EyVzdK2Fu2udBO1SAadjN',
  TCB_ENV: 'cloud1-4g1r5ho01a0cfd85'
};

exports.main = async (event, context) => {
    console.log('🚀 退款云函数开始执行...');
    console.log('📦 请求参数:', JSON.stringify(event, null, 2));
    
    // 使用临时配置而不是环境变量
    const zpayPid = TEMP_CONFIG.ZPAY_PID;
    const zpayKey = TEMP_CONFIG.ZPAY_KEY;
    const tcbEnv = TEMP_CONFIG.TCB_ENV;
    
    console.log('🔑 配置检查:');
    console.log('  ZPAY_PID:', zpayPid ? '已设置' : '未设置');
    console.log('  ZPAY_KEY:', zpayKey ? '已设置（长度: ' + zpayKey.length + '）' : '未设置');
    console.log('  TCB_ENV:', tcbEnv);
    
    if (!zpayPid || !zpayKey || !tcbEnv) {
        return {
            success: false,
            error: '云函数配置缺失',
            code: 'MISSING_CONFIG',
            debug: {
                zpayPid: !!zpayPid,
                zpayKey: !!zpayKey,
                tcbEnv: !!tcbEnv
            }
        };
    }
    
    // 其余代码保持不变...
    // [这里放入完整的退款函数代码]
    
    return {
        success: true,
        message: '临时配置测试成功',
        debug: {
            zpayPid: !!zpayPid,
            zpayKey: !!zpayKey,
            tcbEnv: !!tcbEnv
        }
    };
};