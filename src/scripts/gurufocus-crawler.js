import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { guruFocusFetchApiBasicParams } from '../configs/gurufocus.js';
import { formatAsset } from '../utils/gurufocus.js';

// 获取当前文件的目录路径（ES模块中没有__dirname）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchGuruFocusScreener() {
  const res = [];
  let page = 1;
  const url = 'https://www.gurufocus.cn/_api/screener?locale=zh-hans';
  const options = {
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json, text/plain, */*',
    },
    timeout: 30000
  };
  const body = {
    ...guruFocusFetchApiBasicParams,
    page,
    per_page: 3000,
  }
  try {
    console.log(`Fetching start...`);
    let resp = await axios.post(url, body, options);
    res.push(...resp.data.data);
    page += 1;
    while (resp.data.total > res.length) {
      console.log(`Fetched count ${res.length}... ${resp.data.total - res.length} left...`);
      body.page = page;
      resp = await axios.post(url, body, options);
      res.push(...resp.data.data);
      page += 1;
    }
    return res;
  } catch (err) {
    console.error('Fetch failed:', err.response?.status, err.response?.statusText);
    console.error(err.response?.data || err.message);
    process.exit(1);
  }
}

function getFileName() {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}.json`;
}

function saveData(data) {
  // 为每个股票添加板块信息
  const processedData = data.map(item => {
    return {
      ...formatAsset(item)
    };
  });
  
  // 统计板块分布
  const boardStats = {};
  processedData.forEach(item => {
    boardStats[item.board] = (boardStats[item.board] || 0) + 1;
  });
  
  console.log('板块分布统计:');
  Object.entries(boardStats).forEach(([board, count]) => {
    console.log(`  ${board}: ${count} 只股票`);
  });
  
  const fileName = getFileName();
  
  // 只保存到public目录（Vue3版本）
  const publicPath = path.join(__dirname, '../../public/assets', fileName);
  fs.writeFileSync(publicPath, JSON.stringify(processedData, null, 2), 'utf-8');
  console.log(`Saved ${processedData.length} records to ${publicPath}`);
}

function upateDates() {
  const assetsDir = path.join(__dirname, '../../public/assets');
  const publicDatesConfigPath = path.join(__dirname, '../../public/dates.json');
  
  try {
    // 读取public/assets目录下的所有JSON文件
    const files = fs.readdirSync(assetsDir)
      .filter(file => file.endsWith('.json') && /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
      .sort(); // 按日期排序
    
    console.log(`Found ${files.length} data files:`, files);
    
    if (files.length === 0) {
      console.log('No data files found, creating empty dates.json');
      fs.writeFileSync(publicDatesConfigPath, JSON.stringify([], null, 2), 'utf-8');
      return;
    }
    
    const validDates = files.map(file => file.replace('.json', ''));
    
    // 将有效日期写入配置文件（只写入public目录）
    fs.writeFileSync(publicDatesConfigPath, JSON.stringify(validDates, null, 2), 'utf-8');
    console.log(`更新dates.json，有效日期数: ${validDates.length}`);
    
  } catch (error) {
    console.error('更新 dates.json 失败:', error);
    throw error;
  }
}

async function main() {
  const data = await fetchGuruFocusScreener();
  saveData(data);
  upateDates();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fetch failed:', err.response?.status, err.response?.statusText);
  // eslint-disable-next-line no-console
  console.error(err.response?.data || err.message);
  process.exit(1);
});


