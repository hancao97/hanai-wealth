import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径（ES模块中没有__dirname）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 从现有的每日数据文件中提取公司基础信息，生成 companies.json
 */
function extractCompaniesInfo() {
  const assetsDir = path.join(__dirname, '../../public/assets');
  const companiesPath = path.join(__dirname, '../../public/companies.json');
  
  console.log('开始提取公司基础信息...');
  
  try {
    // 读取所有日期文件
    const files = fs.readdirSync(assetsDir)
      .filter(file => file.endsWith('.json') && /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
      .sort(); // 按日期排序
    
    console.log(`找到 ${files.length} 个数据文件`);
    
    if (files.length === 0) {
      console.log('没有找到数据文件');
      return;
    }
    
    const companiesData = {};
    let stocksWithBusinessInfo = 0;
    
    // 从最新的文件开始读取（优先使用最新数据）
    for (let i = files.length - 1; i >= 0; i--) {
      const file = files[i];
      const filePath = path.join(assetsDir, file);
      
      console.log(`处理文件: ${file}`);
      
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        data.forEach(item => {
          
          // 如果该股票还没有记录，且有business_descrpt，则保存
          if (item.symbol && item.business_descrpt) {
            companiesData[item.symbol] = item.business_descrpt;
            !companiesData[item.symbol] && stocksWithBusinessInfo++;
          }
        });
        
        console.log(`  已收集 ${Object.keys(companiesData).length} 个公司信息`);
      } catch (err) {
        console.error(`  处理文件 ${file} 失败:`, err.message);
      }
    }
    
    // 保存到 companies.json
    fs.writeFileSync(companiesPath, JSON.stringify(companiesData, null, 2), 'utf-8');
    
    console.log('\n提取完成！');
    console.log(`有业务信息的股票数: ${stocksWithBusinessInfo}`);
    console.log(`保存到: ${companiesPath}`);
    console.log(`文件大小: ${(fs.statSync(companiesPath).size / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (error) {
    console.error('提取失败:', error);
    throw error;
  }
}

extractCompaniesInfo();


