import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { guruFocusFetchApiBasicParams } from '../configs/gurufocus.js';
import { formatAsset } from '../utils/gurufocus.js';

// 获取当前文件的目录路径（ES模块中没有__dirname）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 带重试机制的请求函数
 * @param {Function} requestFn - 执行请求的函数
 * @param {number} maxRetries - 最大重试次数（默认5次）
 * @param {number} retryDelay - 重试延迟（毫秒，默认2秒）
 * @returns {Promise} 请求结果
 */
async function fetchWithRetry(requestFn, maxRetries = 5, retryDelay = 2000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`执行请求 (第 ${attempt} 次尝试)...`);
      const result = await requestFn();
      if (attempt > 1) {
        console.log(`✓ 重试成功！`);
      }
      return result;
    } catch (error) {
      lastError = error;
      const errorMsg = error.response?.status 
        ? `HTTP ${error.response.status} ${error.response.statusText}`
        : error.message;
      
      if (attempt < maxRetries) {
        // 还有重试机会
        console.warn(`✗ 请求失败 (第 ${attempt}/${maxRetries} 次):`, errorMsg);
        console.log(`等待 ${retryDelay / 1000} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        // 指数退避：每次重试延迟时间翻倍
        retryDelay *= 2;
      } else {
        // 已达到最大重试次数
        console.error(`✗ 请求失败，已重试 ${maxRetries} 次:`, errorMsg);
        throw error;
      }
    }
  }
  
  // 所有重试都失败了
  throw lastError;
}

async function fetchGuruFocusScreener() {
  const res = [];
  let page = 1;
  const url = 'https://www.gurufocus.cn/_api/screener?locale=zh-hans';
  const options = {
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json, text/plain, */*',
    },
    timeout: 300000
  };
  const body = {
    ...guruFocusFetchApiBasicParams,
    page,
    per_page: 3000,
  }
  try {
    console.log(`Fetching start...`);
    
    // 第一次请求使用重试机制
    let resp = await fetchWithRetry(() => axios.post(url, body, options));
    res.push(...resp.data.data);
    page += 1;
    
    while (resp.data.total > res.length) {
      console.log(`Fetched count ${res.length}... ${resp.data.total - res.length} left...`);
      body.page = page;
      
      // 分页请求也使用重试机制
      resp = await fetchWithRetry(() => axios.post(url, body, options));
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
  
  // 分离公司基础信息
  const companiesData = {};
  const dailyData = [];
  
  processedData.forEach(item => {
    const { business_descrpt, ...dailyItem } = item;
    
    // 保存公司基础信息（如果有business_descrpt）
    if (business_descrpt && item.symbol) {
      companiesData[item.symbol] = business_descrpt;
    }
    
    // 保存每日数据（不包含business_descrpt）
    dailyData.push(dailyItem);
  });
  
  // 保存每日数据到public目录
  const publicPath = path.join(__dirname, '../../public/assets', fileName);
  fs.writeFileSync(publicPath, JSON.stringify(dailyData, null, 2), 'utf-8');
  console.log(`Saved ${dailyData.length} records to ${publicPath}`);
  
  // 更新companies.json（合并已有数据）
  const companiesPath = path.join(__dirname, '../../public/companies.json');
  let existingCompanies = {};
  
  // 读取已有的公司信息
  if (fs.existsSync(companiesPath)) {
    try {
      existingCompanies = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'));
      console.log(`Loaded ${Object.keys(existingCompanies).length} existing companies`);
    } catch (err) {
      console.warn('Failed to read existing companies.json, will create new one');
    }
  }
  
  // 合并新旧公司信息（新数据覆盖旧数据）
  const mergedCompanies = {
    ...existingCompanies,
    ...companiesData
  };
  
  fs.writeFileSync(companiesPath, JSON.stringify(mergedCompanies, null, 2), 'utf-8');
  console.log(`Updated companies.json with ${Object.keys(mergedCompanies).length} companies (${Object.keys(companiesData).length} updated)`);
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


