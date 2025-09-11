/**
 * IC Studio - 支付宝账号信息同步云函数
 * 将user_accounts集合中的支付宝账号信息同步到codes和orders集合
 */

const cloud = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
    console.log('🔄 支付宝账号同步功能启动');
    console.log('📨 接收参数:', JSON.stringify(event, null, 2));
    
    try {
        const app = cloud.init({
            env: cloud.SYMBOL_CURRENT_ENV
        });
        const db = app.database();
        
        // 解析请求参数
        let requestData = {};
        if (event.body) {
            try {
                requestData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
            } catch (e) {
                requestData = event;
            }
        } else {
            requestData = event;
        }
        
        const { 
            action = 'sync_all',
            access_code = null,
            force_update = false,
            dry_run = false
        } = requestData;
        
        let syncResults = {
            total_user_accounts: 0,
            synced_codes: 0,
            synced_orders: 0,
            skipped_codes: 0,
            skipped_orders: 0,
            errors: []
        };
        
        if (action === 'sync_all') {
            // 获取所有有访问码的用户账号记录
            const userAccountsQuery = await db.collection('user_accounts')
                .where({
                    access_code: db.command.neq(null)
                })
                .get();
                
            const userAccounts = userAccountsQuery.data || [];
            syncResults.total_user_accounts = userAccounts.length;
            
            console.log(`📦 找到 ${userAccounts.length} 个用户账号记录需要同步`);
            
            for (const userAccount of userAccounts) {
                if (!userAccount.access_code || !userAccount.alipay_account) {
                    continue;
                }
                
                console.log(`🔍 处理访问码: ${userAccount.access_code}`);
                
                try {
                    // 同步到codes集合
                    const codesQuery = await db.collection('codes')
                        .where({ code: userAccount.access_code })
                        .get();
                    
                    for (const codeRecord of codesQuery.data || []) {
                        if (!codeRecord.alipay_account || force_update) {
                            if (!dry_run) {
                                await db.collection('codes').doc(codeRecord._id).update({
                                    data: {
                                        alipay_account: userAccount.alipay_account,
                                        alipay_phone: userAccount.phone,
                                        alipay_email: userAccount.email,
                                        alipay_sync_time: new Date(),
                                        alipay_sync_source: 'user_accounts'
                                    }
                                });
                            }
                            syncResults.synced_codes++;
                            console.log(`✅ 已同步codes记录: ${codeRecord._id}`);
                        } else {
                            syncResults.skipped_codes++;
                            console.log(`⏭️ 跳过codes记录 (已有支付宝账号): ${codeRecord._id}`);
                        }
                    }
                    
                    // 同步到orders集合
                    const ordersQuery = await db.collection('orders')
                        .where({ access_code: userAccount.access_code })
                        .get();
                    
                    for (const orderRecord of ordersQuery.data || []) {
                        if (!orderRecord.alipay_account || force_update) {
                            if (!dry_run) {
                                await db.collection('orders').doc(orderRecord._id).update({
                                    data: {
                                        alipay_account: userAccount.alipay_account,
                                        alipay_phone: userAccount.phone,
                                        alipay_email: userAccount.email,
                                        alipay_sync_time: new Date(),
                                        alipay_sync_source: 'user_accounts'
                                    }
                                });
                            }
                            syncResults.synced_orders++;
                            console.log(`✅ 已同步orders记录: ${orderRecord._id}`);
                        } else {
                            syncResults.skipped_orders++;
                            console.log(`⏭️ 跳过orders记录 (已有支付宝账号): ${orderRecord._id}`);
                        }
                    }
                    
                    // 如果有订单号，也尝试通过订单号同步
                    if (userAccount.order_no) {
                        const ordersByNoQuery = await db.collection('orders')
                            .where({ out_trade_no: userAccount.order_no })
                            .get();
                        
                        for (const orderRecord of ordersByNoQuery.data || []) {
                            if (!orderRecord.alipay_account || force_update) {
                                if (!dry_run) {
                                    await db.collection('orders').doc(orderRecord._id).update({
                                        data: {
                                            alipay_account: userAccount.alipay_account,
                                            alipay_phone: userAccount.phone,
                                            alipay_email: userAccount.email,
                                            alipay_sync_time: new Date(),
                                            alipay_sync_source: 'user_accounts_by_order_no'
                                        }
                                    });
                                }
                                syncResults.synced_orders++;
                                console.log(`✅ 已通过订单号同步orders记录: ${orderRecord._id}`);
                            }
                        }
                    }
                    
                } catch (syncError) {
                    console.error(`❌ 同步访问码 ${userAccount.access_code} 失败:`, syncError);
                    syncResults.errors.push({
                        access_code: userAccount.access_code,
                        error: syncError.message
                    });
                }
            }
            
        } else if (action === 'sync_single' && access_code) {
            // 同步单个访问码
            console.log(`🎯 同步单个访问码: ${access_code}`);
            
            const userAccountQuery = await db.collection('user_accounts')
                .where({ access_code: access_code })
                .limit(1)
                .get();
            
            if (userAccountQuery.data.length === 0) {
                return {
                    success: false,
                    error: '未找到该访问码的用户账号记录'
                };
            }
            
            const userAccount = userAccountQuery.data[0];
            syncResults.total_user_accounts = 1;
            
            if (!userAccount.alipay_account) {
                return {
                    success: false,
                    error: '该用户账号记录没有支付宝账号信息'
                };
            }
            
            // 执行同步逻辑（与上面类似，简化版）
            try {
                // 同步到codes集合
                const codesQuery = await db.collection('codes')
                    .where({ code: access_code })
                    .get();
                
                for (const codeRecord of codesQuery.data || []) {
                    if (!codeRecord.alipay_account || force_update) {
                        if (!dry_run) {
                            await db.collection('codes').doc(codeRecord._id).update({
                                data: {
                                    alipay_account: userAccount.alipay_account,
                                    alipay_phone: userAccount.phone,
                                    alipay_email: userAccount.email,
                                    alipay_sync_time: new Date(),
                                    alipay_sync_source: 'user_accounts_single'
                                }
                            });
                        }
                        syncResults.synced_codes++;
                    } else {
                        syncResults.skipped_codes++;
                    }
                }
                
                // 同步到orders集合
                const ordersQuery = await db.collection('orders')
                    .where({ access_code: access_code })
                    .get();
                
                for (const orderRecord of ordersQuery.data || []) {
                    if (!orderRecord.alipay_account || force_update) {
                        if (!dry_run) {
                            await db.collection('orders').doc(orderRecord._id).update({
                                data: {
                                    alipay_account: userAccount.alipay_account,
                                    alipay_phone: userAccount.phone,
                                    alipay_email: userAccount.email,
                                    alipay_sync_time: new Date(),
                                    alipay_sync_source: 'user_accounts_single'
                                }
                            });
                        }
                        syncResults.synced_orders++;
                    } else {
                        syncResults.skipped_orders++;
                    }
                }
                
            } catch (syncError) {
                console.error(`❌ 同步访问码 ${access_code} 失败:`, syncError);
                syncResults.errors.push({
                    access_code: access_code,
                    error: syncError.message
                });
            }
            
        } else {
            return {
                success: false,
                error: '无效的操作类型或缺少必要参数'
            };
        }
        
        // 记录同步日志
        try {
            await db.collection('alipay_sync_logs').add({
                data: {
                    action: action,
                    access_code: access_code,
                    sync_time: new Date(),
                    request_id: context.requestId,
                    results: syncResults,
                    dry_run: dry_run,
                    force_update: force_update
                }
            });
        } catch (logError) {
            console.warn('⚠️ 同步日志记录失败:', logError);
        }
        
        console.log('🎉 同步完成');
        
        return {
            success: true,
            message: dry_run ? '模拟同步完成' : '同步完成',
            action: action,
            dry_run: dry_run,
            results: syncResults
        };
        
    } catch (error) {
        console.error('❌ 同步错误:', error);
        return {
            success: false,
            error: '同步失败: ' + error.message
        };
    }
};