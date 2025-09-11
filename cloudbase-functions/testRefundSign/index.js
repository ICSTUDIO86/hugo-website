/**
 * 测试退款签名算法
 */

const crypto = require('crypto');

// MD5签名算法
function md5(str) {
    return crypto.createHash('md5').update(str, 'utf8').digest('hex').toLowerCase();
}

// 标准签名算法（与createOrder一致）
function generateCorrectSign(params, key) {
    // 1. 过滤并排序参数
    const filteredParams = Object.entries(params)
        .filter(([key, value]) => 
            key !== 'sign' && 
            key !== 'sign_type' && 
            value != null && 
            value !== ''
        )
        .sort((a, b) => a[0].localeCompare(b[0]));
    
    // 2. 构建基础字符串
    const baseString = filteredParams
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
    
    // 3. 添加key（正确格式：&key=）
    const signString = baseString + '&key=' + key;
    
    return { signString, sign: md5(signString) };
}

exports.main = async (event, context) => {
    console.log('🧪 测试退款签名算法');
    
    // 测试参数
    const testParams = {
        pid: '2025090607243839',
        out_trade_no: 'IC17574296389486978',
        money: '1.00',
        sign_type: 'MD5'
    };
    
    const key = 'UoA5vDBCe51EyVzdK2Fu2udBO1SAadjN';
    
    const result = generateCorrectSign(testParams, key);
    
    console.log('🔐 测试结果:');
    console.log('  参数:', testParams);
    console.log('  密钥前6位:', key.substring(0, 6) + '***');
    console.log('  签名字符串:', result.signString);
    console.log('  MD5签名:', result.sign);
    
    // 比较与之前日志中错误格式的差异
    const wrongFormat = 'money=1.00&out_trade_no=IC17574296389486978&pid=2025090607243839' + key;
    const wrongSign = md5(wrongFormat);
    
    console.log('❌ 错误格式签名字符串:', wrongFormat);
    console.log('❌ 错误格式MD5签名:', wrongSign);
    
    return {
        success: true,
        correct: {
            signString: result.signString,
            sign: result.sign,
            format: '正确格式：参数&key=密钥'
        },
        wrong: {
            signString: wrongFormat,
            sign: wrongSign,
            format: '错误格式：参数直接拼接密钥'
        },
        note: '正确格式应该在密钥前添加&key='
    };
};