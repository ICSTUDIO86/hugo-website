const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('测试环境变量...');
    console.log('Event:', JSON.stringify(event, null, 2));
    
    // 获取环境变量
    const zpayPid = process.env.ZPAY_PID;
    const zpayKey = process.env.ZPAY_KEY;
    const tcbEnv = process.env.TCB_ENV;
    
    console.log('ZPAY_PID:', zpayPid ? '已设置' : '未设置');
    console.log('ZPAY_KEY:', zpayKey ? '已设置（长度: ' + zpayKey.length + '）' : '未设置');
    console.log('TCB_ENV:', tcbEnv);
    
    // 测试数据库连接
    let dbTestResult = '未测试';
    try {
        const app = cloud.init({
            env: tcbEnv || 'cloud1-4g1r5ho01a0cfd85'
        });
        const db = app.database();
        const { data } = await db.collection('orders').limit(1).get();
        dbTestResult = `成功 (找到 ${data.length} 条记录)`;
    } catch (error) {
        dbTestResult = `失败: ${error.message}`;
    }
    
    return {
        success: true,
        data: {
            environment_variables: {
                ZPAY_PID: zpayPid ? '已设置' : '未设置',
                ZPAY_KEY: zpayKey ? '已设置' : '未设置',
                TCB_ENV: tcbEnv || '未设置'
            },
            database_connection: dbTestResult,
            timestamp: new Date().toISOString()
        }
    };
};