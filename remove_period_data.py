#!/usr/bin/env python3
import json
import os

def remove_period_data():
    """2025-02-09~2025-02-16 기간의 데이터를 제거합니다."""
    
    # 데이터 파일 경로
    weekly_data_path = '/Users/user/cursor/weekly-tracker/data/weekly_data.json'
    upload_history_path = '/Users/user/cursor/weekly-tracker/data/upload_history.json'
    
    print("데이터 파일을 로드하는 중...")
    
    # weekly_data.json 로드
    with open(weekly_data_path, 'r', encoding='utf-8') as f:
        weekly_data = json.load(f)
    
    # upload_history.json 로드
    with open(upload_history_path, 'r', encoding='utf-8') as f:
        upload_history = json.load(f)
    
    print(f"로드된 쿼리 수: {len(weekly_data)}")
    print(f"업로드 히스토리 수: {len(upload_history)}")
    
    # 제거할 기간
    target_period = "2025-02-09~2025-02-16"
    
    # 업로드 히스토리에서 해당 파일 찾기
    removed_files = []
    for i, history in enumerate(upload_history):
        if target_period in history.get('filename', ''):
            removed_files.append(history)
            print(f"제거할 파일 발견: {history['filename']}")
    
    # 업로드 히스토리에서 해당 항목들 제거
    upload_history = [h for h in upload_history if target_period not in h.get('filename', '')]
    
    # weekly_data에서 해당 기간의 데이터 제거
    removed_queries = 0
    for query, data in list(weekly_data.items()):
        if 'periods' in data and isinstance(data['periods'], list):
            # 해당 기간이 있는지 확인
            if target_period in data['periods']:
                data['periods'].remove(target_period)
                removed_queries += 1
                print(f"제거된 쿼리: {query} - {target_period}")
            
            # periods가 비어있으면 해당 쿼리 전체 제거
            if not data['periods']:
                del weekly_data[query]
                print(f"쿼리 전체 제거: {query}")
    
    print(f"\n제거 완료:")
    print(f"- 제거된 파일 수: {len(removed_files)}")
    print(f"- 제거된 쿼리 데이터 수: {removed_queries}")
    print(f"- 남은 쿼리 수: {len(weekly_data)}")
    print(f"- 남은 업로드 히스토리 수: {len(upload_history)}")
    
    # 백업 생성
    print("\n백업 생성 중...")
    os.rename(weekly_data_path, weekly_data_path + '.backup')
    os.rename(upload_history_path, upload_history_path + '.backup')
    
    # 수정된 데이터 저장
    print("수정된 데이터 저장 중...")
    with open(weekly_data_path, 'w', encoding='utf-8') as f:
        json.dump(weekly_data, f, ensure_ascii=False, indent=2)
    
    with open(upload_history_path, 'w', encoding='utf-8') as f:
        json.dump(upload_history, f, ensure_ascii=False, indent=2)
    
    print("데이터 제거 완료!")

if __name__ == "__main__":
    remove_period_data()
