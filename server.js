const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 환경 변수에서 파일 경로 가져오기 (없으면 기본값 사용)
const QUERY_CODE_FILE_PATH = process.env.QUERY_CODE_FILE_PATH || '/Users/user/Documents/쿼리별 주간지표/top_20000_query_분리.xlsx';

// 데이터 저장 파일 경로
const DATA_FILE = path.join(__dirname, 'data', 'weekly_data.json');
const UPLOAD_HISTORY_FILE = path.join(__dirname, 'data', 'upload_history.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 데이터 디렉토리 생성
function ensureDataDirectory() {
    try {
        const dataDir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log('데이터 디렉토리 생성 완료:', dataDir);
        }
        // 디렉토리 쓰기 권한 확인
        fs.accessSync(dataDir, fs.constants.W_OK);
        console.log('데이터 디렉토리 쓰기 권한 확인 완료');
    } catch (error) {
        console.error('데이터 디렉토리 생성/권한 오류:', error);
        throw new Error('데이터 저장 디렉토리를 생성할 수 없습니다: ' + error.message);
    }
}

// 데이터 로드 함수
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            const parsedData = JSON.parse(data);
            
            // 새로운 데이터 구조 처리 (data 객체 안에 실제 데이터가 있는 경우)
            let actualData = parsedData;
            if (parsedData.data) {
                actualData = parsedData.data;
            }
            
            // 기존 데이터에 srArea 필드가 없는 경우 빈 배열로 초기화
            Object.keys(actualData).forEach(query => {
                if (actualData[query] && actualData[query].periods && !actualData[query].srArea) {
                    actualData[query].srArea = new Array(actualData[query].periods.length).fill('');
                }
            });
            
            // 기존 데이터의 중복 제거 및 정리
            const cleanedData = cleanExistingDataDuplicates(actualData);
            
            // 정리된 데이터가 원본과 다르면 저장 (메모리 절약을 위해 간단한 비교)
            const needsSave = Object.keys(cleanedData).length !== Object.keys(actualData).length;
            if (needsSave) {
                saveData(cleanedData);
                console.log('기존 데이터 중복 제거 및 정리 완료');
            }
            
            return cleanedData;
        }
        return {};
    } catch (error) {
        console.error('데이터 로드 오류:', error);
        return {};
    }
}

// 기존 데이터 정리 (잘못 파싱된 쿼리명 수정)
function cleanExistingData(data) {
    const cleanedData = {};
    
    Object.entries(data).forEach(([query, queryData]) => {
        // 쿼리명 정리 (따옴표, 쉼표, 공백 제거)
        let cleanQuery = query;
        if (typeof query === 'string') {
            cleanQuery = query.replace(/^["',\s]+|["',\s]+$/g, ''); // 앞뒤 따옴표, 쉼표, 공백 제거
        }
        
        // 빈 쿼리명이면 건너뛰기
        if (!cleanQuery || cleanQuery.length === 0) {
            return;
        }
        
        // 기존 데이터 구조 유지하면서 쿼리명만 정리
        cleanedData[cleanQuery] = {
            periods: queryData.periods || [],
            areaSc: queryData.areaSc || [],
            areaCc: queryData.areaCc || [],
            srArea: queryData.srArea || [],
            scGrowthRates: queryData.scGrowthRates || [],
            ccGrowthRates: queryData.ccGrowthRates || [],
            summary: queryData.summary || {}
        };
    });
    
    return cleanedData;
}

// 기존 데이터 중복 제거 및 정리 함수
function cleanExistingDataDuplicates(data) {
    const cleanedData = {};
    
    Object.entries(data).forEach(([query, queryData]) => {
        const periodMap = new Map(); // 기간별로 데이터를 그룹화
        
        queryData.periods.forEach((period, index) => {
            const areaSc = queryData.areaSc[index];
            const areaCc = queryData.areaCc[index];
            const srArea = (queryData.srArea && queryData.srArea[index]) ? queryData.srArea[index] : '';
            
            if (periodMap.has(period)) {
                // 동일한 기간이 있는 경우 중복 처리 로직 적용
                const existing = periodMap.get(period);
                
                // area_sc: 둘 중 큰 값만 취함
                if (areaSc > existing.areaSc) {
                    existing.areaSc = areaSc;
                    // area_sc가 더 큰 경우 sr_area도 업데이트
                    existing.srArea = srArea;
                }
                
                // area_cc: 두 값을 더함
                existing.areaCc += areaCc;
            } else {
                // 새로운 기간은 그대로 추가
                periodMap.set(period, {
                    period: period,
                    areaSc: areaSc,
                    areaCc: areaCc,
                    srArea: srArea
                });
            }
        });
        
        // Map에서 배열로 변환하고 정렬
        const cleanedPeriods = [];
        const cleanedAreaSc = [];
        const cleanedAreaCc = [];
        const cleanedSrArea = [];
        
        const sortedPeriods = Array.from(periodMap.values())
            .sort((a, b) => {
                const startDateA = a.period.split('~')[0] || '';
                const startDateB = b.period.split('~')[0] || '';
                return new Date(startDateA) - new Date(startDateB);
            });
        
        sortedPeriods.forEach(item => {
            cleanedPeriods.push(item.period);
            cleanedAreaSc.push(item.areaSc);
            cleanedAreaCc.push(item.areaCc);
            cleanedSrArea.push(item.srArea);
        });
        
        // 증감율 재계산
        const cleanedScGrowthRates = [0]; // 첫 기간은 0
        const cleanedCcGrowthRates = [0];
        
        for (let i = 1; i < cleanedAreaSc.length; i++) {
            const prevSc = cleanedAreaSc[i - 1];
            const prevCc = cleanedAreaCc[i - 1];
            const currSc = cleanedAreaSc[i];
            const currCc = cleanedAreaCc[i];
            
            const scGrowthRate = prevSc !== 0 ? ((currSc - prevSc) / prevSc * 100) : 0;
            const ccGrowthRate = prevCc !== 0 ? ((currCc - prevCc) / prevCc * 100) : 0;
            
            cleanedScGrowthRates.push(scGrowthRate);
            cleanedCcGrowthRates.push(ccGrowthRate);
        }
        
        // 요약 정보 업데이트
        const summary = {
            totalPeriods: cleanedPeriods.length,
            avgScGrowthRate: cleanedScGrowthRates.length > 1 ? 
                cleanedScGrowthRates.slice(1).reduce((a, b) => a + b, 0) / (cleanedScGrowthRates.length - 1) : 0,
            avgCcGrowthRate: cleanedCcGrowthRates.length > 1 ? 
                cleanedCcGrowthRates.slice(1).reduce((a, b) => a + b, 0) / (cleanedCcGrowthRates.length - 1) : 0
        };
        
        cleanedData[query] = {
            periods: cleanedPeriods,
            areaSc: cleanedAreaSc,
            areaCc: cleanedAreaCc,
            srArea: cleanedSrArea,
            scGrowthRates: cleanedScGrowthRates,
            ccGrowthRates: cleanedCcGrowthRates,
            summary: summary
        };
    });
    
    return cleanedData;
}

// 데이터 저장 (메모리 효율적)
function saveData(data) {
    try {
        ensureDataDirectory();
        
        // 메모리 사용량 체크
        const dataSize = JSON.stringify(data).length;
        const maxSize = 100 * 1024 * 1024; // 100MB 제한
        
        if (dataSize > maxSize) {
            console.warn('데이터 크기가 큽니다:', dataSize, 'bytes');
            // 큰 데이터는 압축 없이 저장 (공백 최소화)
            const dataString = JSON.stringify(data);
            fs.writeFileSync(DATA_FILE, dataString, 'utf8');
        } else {
            // 작은 데이터는 보기 좋게 포맷팅
            const dataString = JSON.stringify(data, null, 2);
            fs.writeFileSync(DATA_FILE, dataString, 'utf8');
        }
        
        console.log('데이터 저장 완료:', DATA_FILE, '크기:', dataSize, 'bytes');
    } catch (error) {
        console.error('데이터 저장 오류:', error);
        console.error('저장 경로:', DATA_FILE);
        
        // 메모리 부족 에러 체크
        if (error.message && error.message.includes('ENOSPC')) {
            throw new Error('디스크 공간이 부족합니다.');
        } else if (error.message && error.message.includes('heap')) {
            throw new Error('메모리가 부족합니다. 데이터가 너무 큽니다.');
        }
        throw new Error('데이터를 저장할 수 없습니다: ' + error.message);
    }
}

// 업로드 히스토리 로드
function loadUploadHistory() {
    try {
        if (fs.existsSync(UPLOAD_HISTORY_FILE)) {
            const history = fs.readFileSync(UPLOAD_HISTORY_FILE, 'utf8');
            return JSON.parse(history);
        }
    } catch (error) {
        console.error('업로드 히스토리 로드 오류:', error);
    }
    return [];
}

// 업로드 히스토리 저장
function saveUploadHistory(history) {
    try {
        ensureDataDirectory();
        fs.writeFileSync(UPLOAD_HISTORY_FILE, JSON.stringify(history, null, 2));
    } catch (error) {
        console.error('업로드 히스토리 저장 오류:', error);
    }
}

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB 제한
        fieldSize: 10 * 1024 * 1024  // 10MB 필드 크기 제한
    },
    fileFilter: (req, file, cb) => {
        console.log('파일 필터 체크:', {
            mimetype: file.mimetype,
            originalname: file.originalname,
            fieldname: file.fieldname
        });
        
        // 파일 확장자로 먼저 체크 (더 안전함)
        const fileName = file.originalname.toLowerCase();
        const isValidExtension = fileName.endsWith('.xlsx') || 
                                  fileName.endsWith('.xls') || 
                                  fileName.endsWith('.csv');
        
        // MIME 타입 체크
        const isValidMimeType = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                                file.mimetype === 'application/vnd.ms-excel' ||
                                file.mimetype === 'text/csv' ||
                                file.mimetype === 'application/csv' ||
                                file.mimetype === 'application/octet-stream'; // curl 등에서 전송 시
        
        if (isValidExtension || isValidMimeType) {
            cb(null, true);
        } else {
            console.error('파일 필터 실패:', file);
            cb(new Error('XLSX 또는 CSV 파일만 업로드 가능합니다.'), false);
        }
    }
});

// 데이터 분석 함수
function analyzeWeeklyData(worksheetData) {
    const results = {};
    
    // 데이터 구조: query, period, area_sc, area_cc, sr_area 컬럼이 있다고 가정
    const queries = [...new Set(worksheetData.map(row => row.query))].filter(Boolean);
    
    queries.forEach(query => {
        const queryData = worksheetData.filter(row => row.query === query);
        
        // Period 기준으로 정렬 (날짜 형식: YYYY-MM-DD~YYYY-MM-DD)
        queryData.sort((a, b) => {
            const periodA = a.period || '';
            const periodB = b.period || '';
            
            // 시작 날짜 추출 (첫 번째 날짜)
            const startDateA = periodA.split('~')[0] || '';
            const startDateB = periodB.split('~')[0] || '';
            
            return new Date(startDateA) - new Date(startDateB);
        });
        
        // 같은 기간의 중복 데이터를 먼저 처리
        const periodMap = new Map();
        
        queryData.forEach(row => {
            const period = row.period || '';
            const areaSc = parseFloat(row.area_sc) || 0;
            const areaCc = parseFloat(row.area_cc) || 0;
            const srArea = row.sr_area || '';
            
            if (periodMap.has(period)) {
                // 동일한 기간이 있는 경우 중복 처리 로직 적용
                const existing = periodMap.get(period);
                
                // area_sc: 둘 중 큰 값만 취함
                if (areaSc > existing.areaSc) {
                    existing.areaSc = areaSc;
                    // area_sc가 더 큰 경우 sr_area도 업데이트
                    existing.srArea = srArea;
                }
                
                // area_cc: 두 값을 더함
                existing.areaCc += areaCc;
            } else {
                // 새로운 기간은 그대로 추가
                periodMap.set(period, {
                    period: period,
                    areaSc: areaSc,
                    areaCc: areaCc,
                    srArea: srArea
                });
            }
        });
        
        // Map에서 배열로 변환하고 정렬
        const sortedData = Array.from(periodMap.values())
            .sort((a, b) => {
                const startDateA = a.period.split('~')[0] || '';
                const startDateB = b.period.split('~')[0] || '';
                return new Date(startDateA) - new Date(startDateB);
            });
        
        const periods = [];
        const scData = [];
        const ccData = [];
        const srAreaData = [];
        const scGrowthRates = [];
        const ccGrowthRates = [];
        
        sortedData.forEach((item, index) => {
            periods.push(item.period);
            scData.push(item.areaSc);
            ccData.push(item.areaCc);
            srAreaData.push(item.srArea);
            
            if (index > 0) {
                const prevSc = scData[index - 1];
                const prevCc = ccData[index - 1];
                const currSc = item.areaSc;
                const currCc = item.areaCc;
                
                const scGrowthRate = prevSc !== 0 ? ((currSc - prevSc) / prevSc * 100) : 0;
                const ccGrowthRate = prevCc !== 0 ? ((currCc - prevCc) / prevCc * 100) : 0;
                
                scGrowthRates.push(scGrowthRate);
                ccGrowthRates.push(ccGrowthRate);
            } else {
                scGrowthRates.push(0); // 첫 기간은 증감율 0
                ccGrowthRates.push(0);
            }
        });
        
        results[query] = {
            periods: periods,
            areaSc: scData,
            areaCc: ccData,
            srArea: srAreaData,
            scGrowthRates: scGrowthRates,
            ccGrowthRates: ccGrowthRates,
            summary: {
                totalPeriods: periods.length,
                avgScGrowthRate: scGrowthRates.length > 1 ? 
                    scGrowthRates.slice(1).reduce((a, b) => a + b, 0) / (scGrowthRates.length - 1) : 0,
                avgCcGrowthRate: ccGrowthRates.length > 1 ? 
                    ccGrowthRates.slice(1).reduce((a, b) => a + b, 0) / (ccGrowthRates.length - 1) : 0
            }
        };
    });
    
    return results;
}

// 기존 데이터와 새 데이터 병합
function mergeData(existingData, newData) {
    const mergedData = { ...existingData };
    
    Object.keys(newData).forEach(query => {
        if (mergedData[query]) {
            // 기존 쿼리가 있으면 데이터 병합
            const existing = mergedData[query];
            const newQueryData = newData[query];
            
            // srArea 배열이 없으면 초기화
            if (!existing.srArea) {
                existing.srArea = new Array(existing.periods.length).fill('');
            }
            
            // Period 기준으로 중복 제거 및 병합
            const existingPeriods = new Set(existing.periods);
            const newPeriods = newQueryData.periods;
            
            newPeriods.forEach((period, index) => {
                if (!existingPeriods.has(period)) {
                    // 새로운 기간 데이터 추가
                    existing.periods.push(period);
                    existing.areaSc.push(newQueryData.areaSc[index]);
                    existing.areaCc.push(newQueryData.areaCc[index]);
                    existing.srArea.push(newQueryData.srArea[index] || '');
                    existing.scGrowthRates.push(newQueryData.scGrowthRates[index]);
                    existing.ccGrowthRates.push(newQueryData.ccGrowthRates[index]);
                } else {
                    // 동일한 기간이 있는 경우 새 데이터로 교체 (같은 파일 재업로드 시)
                    const existingIndex = existing.periods.indexOf(period);
                    
                    // area_sc: 둘 중 큰 값만 취함
                    const existingSc = existing.areaSc[existingIndex];
                    const newSc = newQueryData.areaSc[index];
                    
                    if (newSc > existingSc) {
                        existing.areaSc[existingIndex] = newSc;
                        // area_sc가 더 큰 경우 sr_area도 업데이트
                        existing.srArea[existingIndex] = newQueryData.srArea[index] || '';
                    }
                    
                    // area_cc: 새 데이터로 교체 (같은 파일 재업로드 시 중복 합산 방지)
                    existing.areaCc[existingIndex] = newQueryData.areaCc[index];
                }
            });
            
            // Period 기준으로 재정렬
            const sortedIndices = existing.periods
                .map((period, index) => ({ period, index }))
                .sort((a, b) => {
                    const startDateA = a.period.split('~')[0] || '';
                    const startDateB = b.period.split('~')[0] || '';
                    return new Date(startDateA) - new Date(startDateB);
                })
                .map(item => item.index);
            
            // 데이터 재정렬
            existing.periods = sortedIndices.map(i => existing.periods[i]);
            existing.areaSc = sortedIndices.map(i => existing.areaSc[i]);
            existing.areaCc = sortedIndices.map(i => existing.areaCc[i]);
            existing.srArea = sortedIndices.map(i => existing.srArea[i]);
            existing.scGrowthRates = sortedIndices.map(i => existing.scGrowthRates[i]);
            existing.ccGrowthRates = sortedIndices.map(i => existing.ccGrowthRates[i]);
            
            // 증감율 재계산
            existing.scGrowthRates = [0]; // 첫 기간은 0
            existing.ccGrowthRates = [0];
            
            for (let i = 1; i < existing.areaSc.length; i++) {
                const prevSc = existing.areaSc[i - 1];
                const prevCc = existing.areaCc[i - 1];
                const currSc = existing.areaSc[i];
                const currCc = existing.areaCc[i];
                
                const scGrowthRate = prevSc !== 0 ? ((currSc - prevSc) / prevSc * 100) : 0;
                const ccGrowthRate = prevCc !== 0 ? ((currCc - prevCc) / prevCc * 100) : 0;
                
                existing.scGrowthRates.push(scGrowthRate);
                existing.ccGrowthRates.push(ccGrowthRate);
            }
            
            // 요약 정보 업데이트
            existing.summary.totalPeriods = existing.periods.length;
            existing.summary.avgScGrowthRate = existing.scGrowthRates.length > 1 ? 
                existing.scGrowthRates.slice(1).reduce((a, b) => a + b, 0) / (existing.scGrowthRates.length - 1) : 0;
            existing.summary.avgCcGrowthRate = existing.ccGrowthRates.length > 1 ? 
                existing.ccGrowthRates.slice(1).reduce((a, b) => a + b, 0) / (existing.ccGrowthRates.length - 1) : 0;
        } else {
            // 새로운 쿼리는 그대로 추가
            mergedData[query] = newData[query];
        }
    });
    
    return mergedData;
}

// 대시보드 분석 데이터 생성
function generateDashboardData(data) {
    try {
        // 모든 기간 수집 및 정렬
        const allPeriods = new Set();
        Object.values(data).forEach(queryData => {
            queryData.periods.forEach(period => allPeriods.add(period));
        });
        
        const sortedPeriods = Array.from(allPeriods).sort();
        
        // 주간별 분석 데이터 생성
        const weeklyAnalysis = [];
        const latestWeekAnalysis = [];
        
        // 월간별 분석 데이터 생성
        const monthlyAnalysis = [];
        const latestMonthAnalysis = [];
        
        // 월별 데이터 그룹화
        const monthlyData = {};
        sortedPeriods.forEach(period => {
            const monthKey = period.split('~')[0].substring(0, 7); // YYYY-MM 형식
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = [];
            }
            monthlyData[monthKey].push(period);
        });
        
        // 주간 분석
        sortedPeriods.forEach((period, periodIndex) => {
            // 해당 기간의 모든 쿼리 데이터 수집
            const periodData = [];
            const queryMap = new Map(); // 쿼리별로 데이터를 그룹화
            
            Object.entries(data).forEach(([query, queryData]) => {
                const periodIndexInQuery = queryData.periods.indexOf(period);
                if (periodIndexInQuery !== -1) {
                    const areaSc = queryData.areaSc[periodIndexInQuery];
                    const areaCc = queryData.areaCc[periodIndexInQuery];
                    
                    const periodData = {
                        query: query,
                        areaSc: areaSc,
                        areaCc: areaCc,
                        growthRate: 0 // 기본값
                    };
                    
                    if (queryMap.has(query)) {
                        // 동일한 쿼리가 있는 경우 중복 처리 로직 적용
                        const existing = queryMap.get(query);
                        
                        // area_sc: 둘 중 큰 값만 취함
                        existing.areaSc = Math.max(existing.areaSc, areaSc);
                        
                        // area_cc: 두 값을 더함
                        existing.areaCc += areaCc;
                    } else {
                        // 새로운 쿼리는 그대로 추가
                        queryMap.set(query, periodData);
                    }
                }
            });
            
            // Map에서 배열로 변환하고 area_sc 기준으로 정렬하여 Top 50 선별
            const top50 = Array.from(queryMap.values())
                .sort((a, b) => b.areaSc - a.areaSc)
                .slice(0, 50);
            
            weeklyAnalysis.push({
                period: period,
                top50: top50
            });
        });
        
        // 월간 분석
        Object.entries(monthlyData).forEach(([month, periods]) => {
            const monthData = [];
            const queryMap = new Map();
            
            // 해당 월의 모든 기간 데이터를 합산
            periods.forEach(period => {
                Object.entries(data).forEach(([query, queryData]) => {
                    const periodIndexInQuery = queryData.periods.indexOf(period);
                    if (periodIndexInQuery !== -1) {
                        const areaSc = queryData.areaSc[periodIndexInQuery];
                        const areaCc = queryData.areaCc[periodIndexInQuery];
                        
                        if (queryMap.has(query)) {
                            const existing = queryMap.get(query);
                            existing.areaSc += areaSc;
                            existing.areaCc += areaCc;
                        } else {
                            queryMap.set(query, {
                                query: query,
                                areaSc: areaSc,
                                areaCc: areaCc
                            });
                        }
                    }
                });
            });
            
            // Map에서 배열로 변환하고 area_sc 기준으로 정렬하여 Top 50 선별
            const top50 = Array.from(queryMap.values())
                .sort((a, b) => b.areaSc - a.areaSc)
                .slice(0, 50);
            
            monthlyAnalysis.push({
                month: month,
                top50: top50
            });
        });
        
        // 랭킹 변화 계산 (주간)
        weeklyAnalysis.forEach((week, weekIndex) => {
            if (weekIndex > 0) {
                const previousWeek = weeklyAnalysis[weekIndex - 1];
                week.top50.forEach((currentItem, currentIndex) => {
                    const currentRank = currentIndex + 1;
                    const previousItem = previousWeek.top50.find(prev => prev.query === currentItem.query);
                    
                    if (previousItem) {
                        const previousRank = previousWeek.top50.findIndex(prev => prev.query === currentItem.query) + 1;
                        const rankChange = previousRank - currentRank;
                        currentItem.rankChange = rankChange;
                        currentItem.previousRank = previousRank;
                        
                        // 전주 데이터 추가
                        currentItem.previousSc = previousItem.areaSc;
                        currentItem.previousCc = previousItem.areaCc;
                    } else {
                        currentItem.rankChange = 'new';
                        currentItem.previousRank = '-';
                        currentItem.previousSc = 0;
                        currentItem.previousCc = 0;
                    }
                });
            } else {
                week.top50.forEach(item => {
                    item.rankChange = 0;
                    item.previousRank = '-';
                    item.previousSc = 0;
                    item.previousCc = 0;
                });
            }
        });
        
        // 랭킹 변화 계산 (월간)
        monthlyAnalysis.forEach((month, monthIndex) => {
            if (monthIndex > 0) {
                const previousMonth = monthlyAnalysis[monthIndex - 1];
                month.top50.forEach((currentItem, currentIndex) => {
                    const currentRank = currentIndex + 1;
                    const previousItem = previousMonth.top50.find(prev => prev.query === currentItem.query);
                    
                    if (previousItem) {
                        const previousRank = previousMonth.top50.findIndex(prev => prev.query === currentItem.query) + 1;
                        const rankChange = previousRank - currentRank;
                        currentItem.rankChange = rankChange;
                        currentItem.previousRank = previousRank;
                    } else {
                        currentItem.rankChange = 'new';
                        currentItem.previousRank = '-';
                    }
                });
            } else {
                month.top50.forEach(item => {
                    item.rankChange = 0;
                    item.previousRank = '-';
                });
            }
        });
        
        // 최신 주간 증가율 분석
        if (sortedPeriods.length >= 2) {
            const latestPeriod = sortedPeriods[sortedPeriods.length - 1];
            const previousPeriod = sortedPeriods[sortedPeriods.length - 2];
            
            const latestDataMap = new Map();
            
            Object.entries(data).forEach(([query, queryData]) => {
                const latestIndex = queryData.periods.indexOf(latestPeriod);
                const previousIndex = queryData.periods.indexOf(previousPeriod);
                
                if (latestIndex !== -1 && previousIndex !== -1) {
                    const latestSc = queryData.areaSc[latestIndex];
                    const latestCc = queryData.areaCc[latestIndex];
                    const previousSc = queryData.areaSc[previousIndex];
                    const previousCc = queryData.areaCc[previousIndex];
                    
                    const growthRate = previousSc > 0 ? ((latestSc - previousSc) / previousSc) * 100 : 0;
                    
                    if (latestDataMap.has(query)) {
                        const existing = latestDataMap.get(query);
                        existing.areaSc = Math.max(existing.areaSc, latestSc);
                        existing.areaCc += latestCc;
                        existing.growthRate = previousSc > 0 ? ((existing.areaSc - previousSc) / previousSc) * 100 : 0;
                    } else {
                        latestDataMap.set(query, {
                            query: query,
                            areaSc: latestSc,
                            areaCc: latestCc,
                            growthRate: growthRate,
                            previousSc: previousSc,
                            previousCc: previousCc
                        });
                    }
                }
            });
            
            const latestData = Array.from(latestDataMap.values());
            // 전주 기준 노출 300 이상인 쿼리만 필터링
            const filteredData = latestData.filter(item => item.previousSc >= 300);
            const top50 = filteredData
                .sort((a, b) => b.growthRate - a.growthRate)
                .slice(0, 50);
            
            latestWeekAnalysis.push({
                latestPeriod: latestPeriod,
                previousPeriod: previousPeriod,
                top50: top50
            });
        }
        
        // 최신 월간 증가율 분석
        if (Object.keys(monthlyData).length >= 2) {
            const monthKeys = Object.keys(monthlyData).sort();
            const latestMonth = monthKeys[monthKeys.length - 1];
            const previousMonth = monthKeys[monthKeys.length - 2];
            
            const latestMonthDataMap = new Map();
            
            Object.entries(data).forEach(([query, queryData]) => {
                let latestMonthSc = 0;
                let latestMonthCc = 0;
                let previousMonthSc = 0;
                let previousMonthCc = 0;
                
                // 해당 월의 모든 기간 데이터 합산
                monthlyData[latestMonth].forEach(period => {
                    const periodIndex = queryData.periods.indexOf(period);
                    if (periodIndex !== -1) {
                        latestMonthSc += queryData.areaSc[periodIndex];
                        latestMonthCc += queryData.areaCc[periodIndex];
                    }
                });
                
                monthlyData[previousMonth].forEach(period => {
                    const periodIndex = queryData.periods.indexOf(period);
                    if (periodIndex !== -1) {
                        previousMonthSc += queryData.areaSc[periodIndex];
                        previousMonthCc += queryData.areaCc[periodIndex];
                    }
                });
                
                if (latestMonthSc > 0 && previousMonthSc > 0) {
                    const growthRate = ((latestMonthSc - previousMonthSc) / previousMonthSc) * 100;
                    
                    if (latestMonthDataMap.has(query)) {
                        const existing = latestMonthDataMap.get(query);
                        existing.areaSc += latestMonthSc;
                        existing.areaCc += latestMonthCc;
                        existing.growthRate = ((existing.areaSc - previousMonthSc) / previousMonthSc) * 100;
                    } else {
                        latestMonthDataMap.set(query, {
                            query: query,
                            areaSc: latestMonthSc,
                            areaCc: latestMonthCc,
                            growthRate: growthRate,
                            previousSc: previousMonthSc,
                            previousCc: previousMonthCc
                        });
                    }
                }
            });
            
            const latestMonthData = Array.from(latestMonthDataMap.values());
            // 전월 기준 노출 300 이상인 쿼리만 필터링
            const filteredMonthData = latestMonthData.filter(item => item.previousSc >= 300);
            const top50 = filteredMonthData
                .sort((a, b) => b.growthRate - a.growthRate)
                .slice(0, 50);
            
            latestMonthAnalysis.push({
                latestMonth: latestMonth,
                previousMonth: previousMonth,
                top50: top50
            });
        }
        
        return {
            weeklyAnalysis: weeklyAnalysis,
            latestWeekAnalysis: latestWeekAnalysis,
            monthlyAnalysis: monthlyAnalysis,
            latestMonthAnalysis: latestMonthAnalysis
        };
    } catch (error) {
        console.error('대시보드 데이터 생성 오류:', error);
        return { 
            weeklyAnalysis: [], 
            latestWeekAnalysis: [],
            monthlyAnalysis: [],
            latestMonthAnalysis: []
        };
    }
}

// Multer 에러 핸들러
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error('Multer 에러:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: '파일 크기가 너무 큽니다. 최대 50MB까지 업로드 가능합니다.'
            });
        }
        return res.status(400).json({
            success: false,
            error: '파일 업로드 오류: ' + err.message
        });
    } else if (err) {
        console.error('업로드 미들웨어 에러:', err);
        return res.status(400).json({
            success: false,
            error: err.message || '파일 업로드 중 오류가 발생했습니다.'
        });
    }
    next();
};

// XLSX/CSV 파일 업로드 및 분석 API
app.post('/upload', upload.single('xlsxFile'), handleMulterError, (req, res) => {
    const startTime = Date.now();
    
    // 즉시 응답 전송 (Render 타임아웃 방지)
    res.status(202).json({
        success: true,
        message: '파일 업로드가 시작되었습니다. 처리 중...'
    });
    
    // 백그라운드에서 처리
    setImmediate(async () => {
        try {
        console.log('업로드 요청 받음:', {
            hasFile: !!req.file,
            fileName: req.file?.originalname,
            fileSize: req.file?.size,
            mimetype: req.file?.mimetype,
            timestamp: new Date().toISOString()
        });
        
        logMemoryUsage();
        
        if (!req.file) {
            console.error('파일이 없습니다. 요청 본문:', req.body);
            return;
        }
        
        // 파일 크기 체크
        if (req.file.size > 50 * 1024 * 1024) {
            console.error('파일 크기가 너무 큽니다:', req.file.size);
            return;
        }

        let jsonData;
        
        // 파일 타입에 따라 파싱
        if (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
            // CSV 파일 파싱
            const csvContent = req.file.buffer.toString('utf8');
            const lines = csvContent.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            
            jsonData = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                return row;
            });
        } else {
            // XLSX 파일 파싱
            const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            jsonData = XLSX.utils.sheet_to_json(worksheet);
        }
        
        if (jsonData.length === 0) {
            console.error('파일에 데이터가 없습니다.');
            return;
        }

        // 컬럼명 매핑 및 정규화
        const normalizedData = jsonData.map(row => {
            const normalizedRow = {};
            
            // 컬럼명을 소문자로 변환하고 공백 제거하여 매핑
            Object.keys(row).forEach(key => {
                const normalizedKey = key.toLowerCase().replace(/\s+/g, '');
                
                if (normalizedKey.includes('query') || normalizedKey === 'query') {
                    // 쿼리명에서 불필요한 따옴표와 쉼표 제거
                    let queryValue = String(row[key]).trim();
                    queryValue = queryValue.replace(/^["',\s]+|["',\s]+$/g, ''); // 앞뒤 따옴표, 쉼표, 공백 제거
                    normalizedRow.query = queryValue;
                } else if (normalizedKey.includes('period') || normalizedKey === 'period') {
                    normalizedRow.period = String(row[key]).trim();
                } else if (normalizedKey.includes('area_sc') || normalizedKey.includes('areasc') || normalizedKey === 'sc') {
                    normalizedRow.area_sc = row[key];
                } else if (normalizedKey === 'area_cc' || normalizedKey === 'areacc') {
                    normalizedRow.area_cc = row[key];
                } else if (normalizedKey.includes('sr_area') || normalizedKey.includes('srarea') || normalizedKey.includes('sr')) {
                    normalizedRow.sr_area = String(row[key]).trim();
                }
            });
            
            return normalizedRow;
        }).filter(row => row.query && row.query.length > 0); // 빈 쿼리 제거

        // 필수 컬럼 확인
        const firstRow = normalizedData[0];
        const requiredColumns = ['query', 'area_sc', 'area_cc'];
        const hasRequiredColumns = requiredColumns.every(col => firstRow[col] !== undefined);

        if (!hasRequiredColumns) {
            console.error('필수 컬럼이 없습니다:', {
                availableColumns: Object.keys(jsonData[0]),
                normalizedColumns: Object.keys(firstRow)
            });
            return;
        }

        // 새 데이터 분석
        console.log('데이터 분석 시작, 행 수:', normalizedData.length);
        const newAnalysisResults = analyzeWeeklyData(normalizedData);
        console.log('분석 완료, 쿼리 수:', Object.keys(newAnalysisResults).length);
        
        // 기존 데이터 로드
        console.log('기존 데이터 로드 시작');
        const existingData = loadData();
        console.log('기존 데이터 로드 완료, 쿼리 수:', Object.keys(existingData).length);
        
        // 데이터 병합
        console.log('데이터 병합 시작');
        const mergedData = mergeData(existingData, newAnalysisResults);
        console.log('데이터 병합 완료, 총 쿼리 수:', Object.keys(mergedData).length);
        
        // 병합된 데이터 저장
        console.log('데이터 저장 시작');
        saveData(mergedData);
        console.log('데이터 저장 완료');
        
        // 업로드 히스토리 업데이트
        const uploadHistory = loadUploadHistory();
        uploadHistory.push({
            timestamp: new Date().toISOString(),
            filename: req.file.originalname,
            recordsAdded: jsonData.length,
            queriesProcessed: Object.keys(newAnalysisResults).length
        });
        saveUploadHistory(uploadHistory);

            const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`업로드 완료, 처리 시간: ${processingTime}초`);
            logMemoryUsage();
            
            console.log('업로드 성공:', {
                totalQueries: Object.keys(mergedData).length,
                totalRecords: Object.values(mergedData).reduce((sum, query) => sum + query.periods.length, 0),
                processingTime: processingTime
            });

        } catch (error) {
            console.error('파일 처리 오류:', error);
            console.error('에러 스택:', error.stack);
            logMemoryUsage();
        }
    });
});

// 업로드 엔드포인트 전역 에러 핸들러
app.use((err, req, res, next) => {
    if (req.path === '/upload') {
        console.error('업로드 엔드포인트 전역 에러:', err);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: '서버 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류')
            });
        }
    } else {
        next(err);
    }
});

// 저장된 데이터 조회 API
app.get('/api/data', (req, res) => {
    try {
        const data = loadData();
        const uploadHistory = loadUploadHistory();
        
        res.json({
            success: true,
            data: data,
            uploadHistory: uploadHistory,
            totalQueries: Object.keys(data).length,
            totalRecords: Object.values(data).reduce((sum, query) => sum + query.periods.length, 0)
        });
    } catch (error) {
        console.error('데이터 조회 오류:', error);
        res.status(500).json({ error: '데이터 조회 중 오류가 발생했습니다: ' + error.message });
    }
});

// 업로드 히스토리 조회 API
app.get('/api/history', (req, res) => {
    try {
        const uploadHistory = loadUploadHistory();
        res.json({
            success: true,
            history: uploadHistory
        });
    } catch (error) {
        console.error('히스토리 조회 오류:', error);
        res.status(500).json({ error: '히스토리 조회 중 오류가 발생했습니다: ' + error.message });
    }
});

// 대시보드 데이터 조회 API
app.get('/api/dashboard', (req, res) => {
    try {
        const data = loadData();
        const dashboardData = generateDashboardData(data);
        
        if (!dashboardData) {
            return res.json({
                success: true,
                message: '분석할 데이터가 없습니다.',
                data: null
            });
        }
        
        res.json({
            success: true,
            data: dashboardData
        });
    } catch (error) {
        console.error('대시보드 데이터 생성 오류:', error);
        res.status(500).json({ error: '대시보드 데이터 생성 중 오류가 발생했습니다: ' + error.message });
    }
});

// 필터 분석을 위한 Query 코드 데이터 로드
app.get('/api/filter-data', (req, res) => {
    try {
        const XLSX = require('xlsx');
        const filePath = QUERY_CODE_FILE_PATH;
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Query 코드 파일을 찾을 수 없습니다.' });
        }
        
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // travel_cityCode별로 도시 매핑 생성 (랜덤 선택)
        const cityCodeMap = new Map();
        jsonData.forEach(row => {
            if (row.travel_cityCode && row.travel_city) {
                if (!cityCodeMap.has(row.travel_cityCode)) {
                    cityCodeMap.set(row.travel_cityCode, []);
                }
                cityCodeMap.get(row.travel_cityCode).push(row.travel_city);
            }
        });
        
        // travel_countryCode별로 국가 매핑 생성 (랜덤 선택)
        const countryCodeMap = new Map();
        jsonData.forEach(row => {
            if (row.travel_countryCode && row.travel_country) {
                if (!countryCodeMap.has(row.travel_countryCode)) {
                    countryCodeMap.set(row.travel_countryCode, []);
                }
                countryCodeMap.get(row.travel_countryCode).push(row.travel_country);
            }
        });
        
        // 각 cityCode에 대해 랜덤으로 하나의 도시 선택하고 알파벳 순으로 정렬
        const cityCodeOptions = Array.from(cityCodeMap.entries()).map(([code, cities]) => {
            const randomCity = cities[Math.floor(Math.random() * cities.length)];
            return {
                code: code,
                display: `${code}(${randomCity})`,
                city: randomCity
            };
        });
        
        // 알파벳 순 정렬
        cityCodeOptions.sort((a, b) => a.display.localeCompare(b.display));
        
        // 각 countryCode에 대해 랜덤으로 하나의 국가 선택하고 알파벳 순으로 정렬
        const countryCodeOptions = Array.from(countryCodeMap.entries()).map(([code, countries]) => {
            const randomCountry = countries[Math.floor(Math.random() * countries.length)];
            return {
                code: code,
                display: `${code}(${randomCountry})`,
                country: randomCountry
            };
        });
        
        // 알파벳 순 정렬
        countryCodeOptions.sort((a, b) => a.display.localeCompare(b.display));
        
        // 필터 옵션 추출 (알파벳 순 정렬)
        const travelPtnOptions = [...new Set(jsonData.map(row => row.travel_ptn).filter(Boolean))].sort();
        const travelPtnCodeOptions = [...new Set(jsonData.map(row => row.travel_ptnCode).filter(Boolean))].sort();
        const travelMonthOptions = [...new Set(jsonData.map(row => row.travel_month).filter(Boolean))].sort();

        // 필터 옵션 추출
        const filterOptions = {
            travelCityCode: cityCodeOptions,
            travelPtn: travelPtnOptions,
            travelPtnCode: travelPtnCodeOptions,
            travelCountryCode: countryCodeOptions,
            travelMonth: travelMonthOptions
        };
        
        res.json({
            success: true,
            data: {
                filterOptions,
                queryCodes: jsonData
            }
        });
    } catch (error) {
        console.error('필터 데이터 로드 오류:', error);
        res.status(500).json({ error: '필터 데이터 로드 중 오류가 발생했습니다: ' + error.message });
    }
});

// 필터 적용된 분석 데이터 조회
app.post('/api/filter-analysis', (req, res) => {
    try {
        console.log('Filter analysis request body:', req.body);
        const { filters } = req.body;
        console.log('Parsed filters:', filters);
        
        if (!filters) {
            return res.json({
                success: false,
                message: '필터 정보가 없습니다.',
                data: null
            });
        }
        
        const data = loadData();
        
        if (!data) {
            return res.json({
                success: true,
                message: '분석할 데이터가 없습니다.',
                data: null
            });
        }
        
        // Query 코드 데이터 로드
        const XLSX = require('xlsx');
        const filePath = QUERY_CODE_FILE_PATH;
        let queryCodes = [];
        
        if (fs.existsSync(filePath)) {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            queryCodes = XLSX.utils.sheet_to_json(worksheet);
        }
        
        // Query 코드를 Map으로 변환 (빠른 검색을 위해)
        const queryCodeMap = new Map();
        queryCodes.forEach(row => {
            if (row.query) {
                queryCodeMap.set(row.query, {
                    travel_city: row.travel_city || '',
                    travel_cityCode: row.travel_cityCode || '',
                    travel_ptn: row.travel_ptn || '',
                    travel_ptnCode: row.travel_ptnCode || '',
                    travel_country: row.travel_country || '',
                    travel_countryCode: row.travel_countryCode || '',
                    travel_month: row.travel_month || ''
                });
            }
        });
        
        // 필터 조건에 맞는 쿼리 찾기
        const filteredQueries = [];
        
        for (const [query, queryData] of Object.entries(data)) {
            if (typeof queryData === 'object' && queryData.periods) {
                const queryCode = queryCodeMap.get(query);
                
                // 필터 조건 확인
                let matchesFilter = true;
                
                if (filters.travelCityCode && filters.travelCityCode.length > 0) {
                    if (!queryCode || !filters.travelCityCode.includes(queryCode.travel_cityCode)) {
                        matchesFilter = false;
                    }
                }
                
                if (filters.travelPtn && filters.travelPtn.length > 0) {
                    if (!queryCode || !filters.travelPtn.includes(queryCode.travel_ptn)) {
                        matchesFilter = false;
                    }
                }
                
                if (filters.travelPtnCode && filters.travelPtnCode.length > 0) {
                    if (!queryCode || !filters.travelPtnCode.includes(queryCode.travel_ptnCode)) {
                        matchesFilter = false;
                    }
                }
                
                if (filters.travelCountryCode && filters.travelCountryCode.length > 0) {
                    if (!queryCode || !filters.travelCountryCode.includes(queryCode.travel_countryCode)) {
                        matchesFilter = false;
                    }
                }
                
                if (filters.travelMonth && filters.travelMonth.length > 0) {
                    if (!queryCode || !filters.travelMonth.includes(queryCode.travel_month)) {
                        matchesFilter = false;
                    }
                }
                
                if (matchesFilter) {
                    const totalAreaSc = queryData.areaSc ? queryData.areaSc.reduce((a, b) => a + b, 0) : 0;
                    const totalAreaCc = queryData.areaCc ? queryData.areaCc.reduce((a, b) => a + b, 0) : 0;
                    
                    // 주간 추이 데이터 생성
                    const weeklyTrend = queryData.periods ? queryData.periods.map((period, index) => ({
                        period,
                        areaSc: queryData.areaSc ? queryData.areaSc[index] || 0 : 0,
                        areaCc: queryData.areaCc ? queryData.areaCc[index] || 0 : 0
                    })) : [];
                    
                    filteredQueries.push({
                        query,
                        totalAreaSc,
                        totalAreaCc,
                        periods: queryData.periods || [],
                        areaSc: queryData.areaSc || [],
                        areaCc: queryData.areaCc || [],
                        weeklyTrend,
                        queryCode: queryCode || {}
                    });
                }
            }
        }
        
        // Area SC 기준으로 정렬
        filteredQueries.sort((a, b) => b.totalAreaSc - a.totalAreaSc);
        
        // 요약 통계 계산
        const totalQueries = filteredQueries.length;
        const totalAreaSc = filteredQueries.reduce((sum, q) => sum + q.totalAreaSc, 0);
        const totalAreaCc = filteredQueries.reduce((sum, q) => sum + q.totalAreaCc, 0);
        
        // 주간 추이 데이터 집계
        const weeklyTrendData = aggregateWeeklyTrend(filteredQueries);
        
        // 필터별 분포 데이터
        const distributionData = calculateDistribution(filteredQueries);
        
        res.json({
            success: true,
            data: {
                summary: {
                    totalQueries,
                    totalAreaSc,
                    totalAreaCc,
                    avgGrowthRate: 0 // TODO: 실제 증가율 계산
                },
                queries: filteredQueries.slice(0, 100), // 상위 100개만 반환
                weeklyTrend: weeklyTrendData,
                distribution: distributionData
            }
        });
    } catch (error) {
        console.error('필터 분석 오류:', error);
        res.status(500).json({ error: '필터 분석 중 오류가 발생했습니다: ' + error.message });
    }
});

// 주간 추이 데이터 집계
function aggregateWeeklyTrend(queries) {
    const trendMap = new Map();
    
    queries.forEach(query => {
        query.weeklyTrend.forEach(week => {
            if (!trendMap.has(week.period)) {
                trendMap.set(week.period, { areaSc: 0, areaCc: 0 });
            }
            const trend = trendMap.get(week.period);
            trend.areaSc += week.areaSc;
            trend.areaCc += week.areaCc;
        });
    });
    
    return Array.from(trendMap.entries())
        .map(([period, data]) => ({ period, ...data }))
        .sort((a, b) => new Date(a.period.split('~')[0]) - new Date(b.period.split('~')[0]));
}

// 필터별 분포 계산
function calculateDistribution(queries) {
    const cityCount = {};
    const countryCount = {};
    const monthCount = {};
    
    queries.forEach(query => {
        const code = query.queryCode;
        
        if (code.travel_city) {
            cityCount[code.travel_city] = (cityCount[code.travel_city] || 0) + 1;
        }
        if (code.travel_country) {
            countryCount[code.travel_country] = (countryCount[code.travel_country] || 0) + 1;
        }
        if (code.travel_month) {
            monthCount[code.travel_month] = (monthCount[code.travel_month] || 0) + 1;
        }
    });
    
    return {
        cities: Object.entries(cityCount).sort((a, b) => b[1] - a[1]).slice(0, 10),
        countries: Object.entries(countryCount).sort((a, b) => b[1] - a[1]).slice(0, 10),
        months: Object.entries(monthCount).sort((a, b) => b[1] - a[1]).slice(0, 10)
    };
}

// CSV 파일 다운로드 엔드포인트
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const allowedFiles = [
        'query_summary_by_exposure.csv',
        'Top_20_queries.csv',
        'Top_50_queries.csv',
        'Top_100_queries.csv'
    ];
    
    if (!allowedFiles.includes(filename)) {
        return res.status(400).json({ error: '허용되지 않은 파일입니다.' });
    }
    
    const filePath = path.join(__dirname, filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
    }
    
    res.download(filePath, filename, (err) => {
        if (err) {
            console.error('파일 다운로드 오류:', err);
            res.status(500).json({ error: '파일 다운로드 중 오류가 발생했습니다.' });
        }
    });
});

// 정적 파일 서빙
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 특정 cityCode의 총 노출수 계산 함수
function calculateCityCodeTotalSc(data, cityCode) {
    let totalSc = 0;
    
    // Query 코드 데이터 로드
    const XLSX = require('xlsx');
    const filePath = QUERY_CODE_FILE_PATH;
    let queryCodes = [];
    
    if (fs.existsSync(filePath)) {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        queryCodes = XLSX.utils.sheet_to_json(worksheet);
    }
    
    // Query 코드를 Map으로 변환
    const queryCodeMap = new Map();
    queryCodes.forEach(row => {
        if (row.query) {
            queryCodeMap.set(row.query, {
                travel_cityCode: row.travel_cityCode || ''
            });
        }
    });
    
    for (const [query, queryData] of Object.entries(data)) {
        if (typeof queryData === 'object' && queryData.periods) {
            // Query 코드 데이터에서 해당 cityCode 확인
            const queryCode = queryCodeMap.get(query);
            if (queryCode && queryCode.travel_cityCode === cityCode) {
                // 해당 쿼리의 모든 기간의 area_sc 합계
                queryData.periods.forEach(period => {
                    totalSc += period.area_sc || 0;
                });
            }
        }
    }
    
    return totalSc;
}

// 특정 기간 데이터 제거 API
app.delete('/api/remove-period/:period', (req, res) => {
    try {
        const targetPeriod = req.params.period;
        console.log(`제거할 기간: ${targetPeriod}`);
        
        // 데이터 로드
        const weeklyData = loadData();
        const uploadHistory = loadUploadHistory();
        
        let removedQueries = 0;
        let removedFiles = 0;
        
        // 업로드 히스토리에서 해당 기간 파일 제거
        const filteredHistory = uploadHistory.filter(history => {
            if (history.filename && history.filename.includes(targetPeriod)) {
                removedFiles++;
                console.log(`제거된 파일: ${history.filename}`);
                return false;
            }
            return true;
        });
        
        // weekly_data에서 해당 기간의 데이터 제거
        for (const [query, data] of Object.entries(weeklyData)) {
            if (data && data.periods && Array.isArray(data.periods)) {
                const originalLength = data.periods.length;
                data.periods = data.periods.filter(period => {
                    if (typeof period === 'string' && period === targetPeriod) {
                        removedQueries++;
                        console.log(`제거된 쿼리: ${query} - ${targetPeriod}`);
                        return false;
                    }
                    return true;
                });
                
                // periods가 비어있으면 해당 쿼리 전체 제거
                if (data.periods.length === 0) {
                    delete weeklyData[query];
                    console.log(`쿼리 전체 제거: ${query}`);
                }
            }
        }
        
        // 수정된 데이터 저장
        saveData(weeklyData);
        saveUploadHistory(filteredHistory);
        
        res.json({
            success: true,
            message: `기간 ${targetPeriod} 데이터 제거 완료`,
            removedQueries,
            removedFiles,
            remainingQueries: Object.keys(weeklyData).length
        });
        
    } catch (error) {
        console.error('데이터 제거 중 오류:', error);
        res.status(500).json({
            success: false,
            message: '데이터 제거 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

// 메모리 사용량 모니터링
function logMemoryUsage() {
    const used = process.memoryUsage();
    console.log('메모리 사용량:', {
        rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(used.external / 1024 / 1024)}MB`
    });
}

// 서버 시작
app.listen(PORT, () => {
    console.log(`주간지표 트래킹 서버가 http://localhost:${PORT}에서 실행 중입니다.`);
    console.log('환경:', process.env.NODE_ENV || 'development');
    console.log('데이터 파일 경로:', DATA_FILE);
    console.log('업로드 히스토리 파일 경로:', UPLOAD_HISTORY_FILE);
    logMemoryUsage();
    
    try {
        ensureDataDirectory();
        console.log('서버 초기화 완료');
    } catch (error) {
        console.error('서버 초기화 실패:', error);
        console.error('데이터 저장 기능이 작동하지 않을 수 있습니다.');
    }
    
    // 주기적으로 메모리 사용량 로깅 (프로덕션에서만)
    if (process.env.NODE_ENV === 'production') {
        setInterval(() => {
            logMemoryUsage();
        }, 60000); // 1분마다
    }
});

