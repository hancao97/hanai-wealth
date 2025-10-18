import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径（ES模块中没有__dirname）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 从现有的每日数据文件中移除 business_descrpt 字段，以节省空间
 */
function removeBusinessDescrpt() {
  const assetsDir = path.join(__dirname, '../../public/assets');
  
  console.log('开始移除每日数据中的 business_descrpt 字段...');
  
  try {
    // 读取所有日期文件
    const files = fs.readdirSync(assetsDir)
      .filter(file => file.endsWith('.json') && /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
      .sort();
    
    console.log(`找到 ${files.length} 个数据文件`);
    
    if (files.length === 0) {
      console.log('没有找到数据文件');
      return;
    }
    
    let totalProcessed = 0;
    let totalSaved = 0;
    
    files.forEach(file => {
      const filePath = path.join(assetsDir, file);
      
      try {
        // 获取原文件大小
        const originalSize = fs.statSync(filePath).size;
        
        // 读取数据
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        // 移除 business_descrpt 字段
        const cleanedData = data.map(item => {
          const { business_descrpt, ...rest } = item;
          return rest;
        });
        
        // 写回文件
        fs.writeFileSync(filePath, JSON.stringify(cleanedData, null, 2), 'utf-8');
        
        // 获取新文件大小
        const newSize = fs.statSync(filePath).size;
        const savedSize = originalSize - newSize;
        
        totalProcessed++;
        totalSaved += savedSize;
        
        console.log(`✓ ${file}: ${(originalSize / 1024 / 1024).toFixed(2)} MB → ${(newSize / 1024 / 1024).toFixed(2)} MB (节省 ${(savedSize / 1024 / 1024).toFixed(2)} MB)`);
      } catch (err) {
        console.error(`✗ 处理文件 ${file} 失败:`, err.message);
      }
    });
    
    console.log('\n处理完成！');
    console.log(`处理文件数: ${totalProcessed}/${files.length}`);
    console.log(`总共节省空间: ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (error) {
    console.error('处理失败:', error);
    throw error;
  }
}

removeBusinessDescrpt();


