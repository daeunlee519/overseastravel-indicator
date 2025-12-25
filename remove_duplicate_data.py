#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import subprocess
import os
from datetime import datetime

def remove_duplicate_data():
    """중복된 2025-04-07~2025-04-13 데이터를 제거"""
    
    print("🔍 중복 데이터 확인 중...")
    
    # 1. 현재 데이터 로드
    try:
        result = subprocess.run(['curl', '-s', 'http://localhost:3000/api/data'], 
                              capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)
    except Exception as e:
        print(f"❌ 데이터 로드 실패: {e}")
        return
    
    # 2. 업로드 히스토리 로드
    try:
        result = subprocess.run(['curl', '-s', 'http://localhost:3000/api/history'], 
                              capture_output=True, text=True, check=True)
        history_response = json.loads(result.stdout)
        history = history_response['history'] if 'history' in history_response else history_response
    except Exception as e:
        print(f"❌ 히스토리 로드 실패: {e}")
        return
    
    # 3. 2025-04-07~2025-04-13 파일의 업로드 기록 찾기
    target_file = "2025-04-07~2025-04-13.xlsx"
    duplicate_uploads = [h for h in history if h['filename'] == target_file]
    
    print(f"📁 {target_file} 업로드 기록: {len(duplicate_uploads)}개")
    for i, upload in enumerate(duplicate_uploads):
        print(f"  {i+1}. {upload['timestamp']} - {upload['recordsAdded']:,}개 레코드")
    
    if len(duplicate_uploads) < 2:
        print("✅ 중복 데이터가 없습니다.")
        return
    
    # 4. 가장 최근 업로드를 제외하고 나머지 제거
    # 타임스탬프 기준으로 정렬 (오래된 것부터)
    duplicate_uploads.sort(key=lambda x: x['timestamp'])
    
    # 가장 오래된 업로드 제거 (첫 번째 업로드)
    upload_to_remove = duplicate_uploads[0]
    print(f"🗑️  제거할 업로드: {upload_to_remove['timestamp']}")
    
    # 5. 데이터에서 해당 기간의 데이터 제거
    period_to_remove = "2025-04-07~2025-04-13"
    removed_queries = 0
    
    # 각 query에서 해당 기간의 데이터 제거
    for query, query_data in data['data'].items():
        if isinstance(query_data, dict) and 'periods' in query_data:
            periods = query_data['periods']
            if period_to_remove in periods:
                # 해당 기간의 인덱스 찾기
                period_index = periods.index(period_to_remove)
                
                # 해당 기간의 데이터 제거
                if 'areaSc' in query_data and len(query_data['areaSc']) > period_index:
                    query_data['areaSc'].pop(period_index)
                if 'areaCc' in query_data and len(query_data['areaCc']) > period_index:
                    query_data['areaCc'].pop(period_index)
                if 'srArea' in query_data and len(query_data['srArea']) > period_index:
                    query_data['srArea'].pop(period_index)
                if 'scGrowthRates' in query_data and len(query_data['scGrowthRates']) > period_index:
                    query_data['scGrowthRates'].pop(period_index)
                if 'ccGrowthRates' in query_data and len(query_data['ccGrowthRates']) > period_index:
                    query_data['ccGrowthRates'].pop(period_index)
                
                # periods에서도 제거
                periods.pop(period_index)
                removed_queries += 1
    
    # 6. 업로드 히스토리에서도 제거
    history = [h for h in history if h['timestamp'] != upload_to_remove['timestamp']]
    
    # 7. 데이터 저장
    data_file = 'data/weekly_data.json'
    history_file = 'data/upload_history.json'
    
    # 데이터 디렉토리 생성
    os.makedirs('data', exist_ok=True)
    
    # 데이터 저장
    with open(data_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    with open(history_file, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 중복 데이터 제거 완료!")
    print(f"📊 제거된 쿼리 수: {removed_queries:,}개")
    print(f"📁 제거된 업로드: {upload_to_remove['timestamp']}")
    print(f"💾 데이터 파일 업데이트: {data_file}")
    print(f"💾 히스토리 파일 업데이트: {history_file}")
    
    # 8. 서버 재시작 필요 안내
    print("\n🔄 서버를 재시작해야 변경사항이 적용됩니다.")
    print("   서버를 재시작하시겠습니까? (y/n): ", end="")
    
    # 사용자 입력 대기
    response = input().strip().lower()
    if response == 'y':
        print("🔄 서버 재시작 중...")
        # 서버 프로세스 종료
        subprocess.run(['pkill', '-f', 'node server.js'], capture_output=True)
        # 서버 재시작
        subprocess.Popen(['node', 'server.js'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("✅ 서버 재시작 완료!")

if __name__ == "__main__":
    remove_duplicate_data()
