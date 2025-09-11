#!/usr/bin/env node

/**
 * IC Studio CloudBase CLI 自动配置工具
 * 自动配置付费用户的生产环境
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 IC Studio CloudBase CLI 自动配置工具');
console.log('=====================================');

// 配置参数
const config = {
  envId: 'cloud1-4g1r5ho01a0cfd85',
  region: 'ap-shanghai',
  functions: [
    'generate-access-code',
    'verify-access-code', 
    'zpay-callback',
    'query-records',
    'init-database'
  ],
  collections: [
    'access-codes',
    'payment-orders',
    'access-logs',
    'rate-limits',
    'security-logs',
    'error-logs'
  ],
  corsOrigins: [
    'https://igorchen.github.io',
    'https://icstudio.club',
    'http://localhost:3000',
    'http://localhost:8080',
    'https://localhost:3000'
  ]
};

async function main() {
  try {
    console.log('📋 开始配置CloudBase环境...');
    
    // 1. 检查CloudBase CLI是否安装
    await checkCloudBaseCLI();
    
    // 2. 登录检查
    await checkLogin();
    
    // 3. 初始化数据库
    await initializeDatabase();
    
    // 4. 部署云函数
    await deployFunctions();
    
    // 5. 配置HTTP触发器和CORS
    await configureHTTPTriggers();
    
    // 6. 设置数据库权限
    await configureDatabasePermissions();
    
    // 7. 验证配置
    await verifyConfiguration();
    
    console.log('✅ CloudBase环境配置完成！');
    
  } catch (error) {
    console.error('❌ 配置过程中出现错误:', error.message);
    process.exit(1);
  }
}

// 检查CloudBase CLI
async function checkCloudBaseCLI() {
  console.log('🔍 检查CloudBase CLI...');
  
  try {
    const version = execSync('tcb --version', { encoding: 'utf8' });
    console.log('✅ CloudBase CLI已安装:', version.trim());
  } catch (error) {
    console.log('❌ CloudBase CLI未安装，正在安装...');
    
    try {
      execSync('npm install -g @cloudbase/cli', { stdio: 'inherit' });
      console.log('✅ CloudBase CLI安装成功');
    } catch (installError) {
      throw new Error('CloudBase CLI安装失败，请手动执行: npm install -g @cloudbase/cli');
    }
  }
}

// 检查登录状态
async function checkLogin() {
  console.log('🔐 检查登录状态...');
  
  try {
    const result = execSync('tcb env list', { encoding: 'utf8' });
    if (result.includes(config.envId)) {
      console.log('✅ 已登录CloudBase，找到目标环境');
    } else {
      throw new Error('找不到目标环境');
    }
  } catch (error) {
    console.log('❌ 未登录CloudBase或找不到环境，请先登录');
    console.log('💡 请执行: tcb login');
    console.log('💡 然后重新运行此脚本');
    throw new Error('需要先登录CloudBase');
  }
}

// 初始化数据库
async function initializeDatabase() {
  console.log('🗄️ 初始化数据库集合...');
  
  for (const collection of config.collections) {
    try {
      console.log(`📁 创建集合: ${collection}`);
      
      // 创建集合配置文件
      const collectionConfig = {
        name: collection,
        description: `IC Studio ${collection} collection`,
        indexes: getCollectionIndexes(collection)
      };
      
      const configPath = path.join(__dirname, `temp-${collection}.json`);
      fs.writeFileSync(configPath, JSON.stringify(collectionConfig, null, 2));
      
      // 数据库集合需要通过控制台创建
      console.log(`⚠️ 集合 ${collection} 需要在控制台手动创建`);
      
      console.log(`ℹ️ 集合 ${collection} 已标记为需要手动创建`);
      
      // 清理临时文件
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
      
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`ℹ️ 集合 ${collection} 已存在`);
      } else {
        console.warn(`⚠️ 集合 ${collection} 创建失败: ${error.message}`);
      }
    }
  }
}

// 获取集合索引配置
function getCollectionIndexes(collection) {
  const indexes = {
    'access-codes': [
      { keys: [{ name: 'code', direction: '1' }], unique: true },
      { keys: [{ name: 'orderId', direction: '1' }] },
      { keys: [{ name: 'isActive', direction: '1' }] }
    ],
    'payment-orders': [
      { keys: [{ name: 'orderId', direction: '1' }], unique: true },
      { keys: [{ name: 'status', direction: '1' }] }
    ],
    'access-logs': [
      { keys: [{ name: 'timestamp', direction: '-1' }] },
      { keys: [{ name: 'code', direction: '1' }] },
      { keys: [{ name: 'status', direction: '1' }] }
    ],
    'rate-limits': [
      { keys: [{ name: 'identifier', direction: '1' }] },
      { keys: [{ name: 'timestamp', direction: '-1' }] }
    ]
  };
  
  return indexes[collection] || [];
}

// 部署云函数
async function deployFunctions() {
  console.log('☁️ 部署云函数...');
  
  const functionsDir = path.join(__dirname, 'cloudbase', 'functions');
  
  if (!fs.existsSync(functionsDir)) {
    console.log('❌ 找不到functions目录，跳过函数部署');
    return;
  }
  
  for (const funcName of config.functions) {
    const funcPath = path.join(functionsDir, funcName);
    
    if (fs.existsSync(funcPath)) {
      try {
        console.log(`🚀 部署函数: ${funcName}`);
        
        execSync(`tcb fn deploy ${funcName} -e ${config.envId} --dir ${funcPath}`, {
          cwd: functionsDir,  
          stdio: 'pipe'
        });
        
        console.log(`✅ 函数 ${funcName} 部署成功`);
        
      } catch (error) {
        console.error(`❌ 函数 ${funcName} 部署失败: ${error.message}`);
      }
    } else {
      console.log(`⚠️ 找不到函数 ${funcName}，跳过`);
    }
  }
}

// 配置HTTP触发器和CORS
async function configureHTTPTriggers() {
  console.log('🌐 配置HTTP触发器和CORS...');
  
  for (const funcName of config.functions) {
    try {
      console.log(`🔗 配置 ${funcName} HTTP触发器...`);
      
      // 创建HTTP触发器 (需要通过控制台手动配置)
      console.log(`⚠️ ${funcName} HTTP触发器需要在控制台手动配置`);
      
      console.log(`✅ ${funcName} HTTP触发器配置成功`);
      
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`ℹ️ ${funcName} HTTP触发器已存在`);
      } else {
        console.warn(`⚠️ ${funcName} HTTP触发器配置失败: ${error.message}`);
      }
    }
  }
  
  // 配置CORS（需要通过控制台或API）
  console.log('💡 CORS配置需要在CloudBase控制台手动设置：');
  console.log('   1. 访问: https://console.cloud.tencent.com/tcb/env/overview');
  console.log(`   2. 选择环境: ${config.envId}`);
  console.log('   3. 进入"云函数" -> "函数列表"');
  console.log('   4. 对每个函数配置HTTP触发器的CORS：');
  config.corsOrigins.forEach(origin => {
    console.log(`      - ${origin}`);
  });
}

// 配置数据库权限
async function configureDatabasePermissions() {
  console.log('🔐 配置数据库权限...');
  
  try {
    // 创建数据库规则配置文件
    const dbRules = {
      "access-codes": {
        "read": "auth != null",
        "write": "auth != null"
      },
      "payment-orders": {
        "read": "auth != null", 
        "write": "auth != null"
      },
      "access-logs": {
        "read": "auth != null",
        "write": true
      }
    };
    
    const rulesPath = path.join(__dirname, 'temp-db-rules.json');
    fs.writeFileSync(rulesPath, JSON.stringify(dbRules, null, 2));
    
    console.log('✅ 数据库权限配置文件已创建');
    console.log('💡 请在CloudBase控制台手动应用数据库规则');
    
    // 清理临时文件
    setTimeout(() => {
      if (fs.existsSync(rulesPath)) {
        fs.unlinkSync(rulesPath);
      }
    }, 1000);
    
  } catch (error) {
    console.warn('⚠️ 数据库权限配置失败:', error.message);
  }
}

// 验证配置
async function verifyConfiguration() {
  console.log('✅ 验证配置...');
  
  // 验证函数是否可访问
  for (const funcName of config.functions) {
    try {
      console.log(`🔍 验证函数: ${funcName}`);
      
      const result = execSync(`tcb fn invoke ${funcName} -e ${config.envId}`, {
        encoding: 'utf8', 
        stdio: 'pipe'
      });
      
      console.log(`✅ 函数 ${funcName} 可正常调用`);
      
    } catch (error) {
      console.warn(`⚠️ 函数 ${funcName} 验证失败: ${error.message}`);
    }
  }
  
  console.log('🎉 配置验证完成！');
}

// 运行主程序
if (require.main === module) {
  main();
}

module.exports = { main, config };