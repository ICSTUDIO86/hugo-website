const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('🔍 测试环境变量和认证...');
    
    // 检查环境变量
    const zpayPid = process.env.ZPAY_PID;
    const zpayKey = process.env.ZPAY_KEY;
    const tcbEnv = process.env.TCB_ENV;
    
    console.log('环境变量检查:');
    console.log('ZPAY_PID:', zpayPid ? '✅ 已设置' : '❌ 未设置');
    console.log('ZPAY_KEY:', zpayKey ? '✅ 已设置' : '❌ 未设置');
    console.log('TCB_ENV:', tcbEnv ? '✅ 已设置' : '❌ 未设置');
    
    // 测试数据库连接
    let dbStatus = '未测试';
    try {
        const app = cloud.init({
            env: tcbEnv || 'cloud1-4g1r5ho01a0cfd85'
        });
        const db = app.database();
        const { data } = await db.collection('orders').limit(1).get();
        dbStatus = `✅ 连接成功 (${data.length} 条记录)`;
    } catch (error) {
        dbStatus = `❌ 连接失败: ${error.message}`;
    }
    
    return {
        success: true,
        message: '环境变量测试完成',
        data: {
            environment_variables: {
                ZPAY_PID: zpayPid ? '已设置' : '未设置',
                ZPAY_KEY: zpayKey ? '已设置' : '未设置', 
                TCB_ENV: tcbEnv || '未设置'
            },
            database_status: dbStatus,
            timestamp: new Date().toISOString(),
            request_info: {
                headers: event.headers || {},
                method: event.httpMethod || 'unknown',
                path: event.path || 'unknown'
            }
        }
    };
};