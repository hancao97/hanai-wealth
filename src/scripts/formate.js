import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定义要处理的目录和要删除的键
const assetsDir = path.join(__dirname, '../../public/assets');
const keysToRemove = ['sma_20', 'sma_50', 'sma_200'];

// 读取目录中的所有文件
fs.readdir(assetsDir, (err, files) => {
  if (err) {
    console.error('读取目录失败:', err);
    return;
  }

  // 筛选出JSON文件
  const jsonFiles = files.filter(file => file.endsWith('.json'));

  console.log(`找到 ${jsonFiles.length} 个JSON文件`);

  // 处理每个JSON文件
  jsonFiles.forEach(file => {
    const filePath = path.join(assetsDir, file);
    
    // 读取JSON文件
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(`读取文件 ${file} 失败:`, err);
        return;
      }

      try {
        // 解析JSON
        const jsonData = JSON.parse(data);

        // 删除指定的键
        if (Array.isArray(jsonData)) {
          jsonData.forEach(item => {
            keysToRemove.forEach(key => {
              if (key in item) {
                delete item[key];
              }
            });
          });
        }

        // 写回文件
        fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
          if (err) {
            console.error(`写入文件 ${file} 失败:`, err);
          } else {
            console.log(`✓ 已处理: ${file}`);
          }
        });

      } catch (parseErr) {
        console.error(`解析文件 ${file} 失败:`, parseErr);
      }
    });
  });
});
