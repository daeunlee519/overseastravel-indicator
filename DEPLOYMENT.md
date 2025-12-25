# 주간지표 트래킹 서버 배포 가이드

이 문서는 주간지표 트래킹 서버를 오픈 환경에 배포하는 방법을 설명합니다.

## 배포 전 준비사항

### 1. 환경 변수 설정

`.env` 파일을 생성하고 다음 변수를 설정하세요:

```bash
PORT=3000
QUERY_CODE_FILE_PATH=/path/to/top_20000_query_분리.xlsx
```

**중요**: `QUERY_CODE_FILE_PATH`는 선택사항입니다. 이 파일이 없어도 기본 기능은 작동하지만, 필터 분석 기능은 사용할 수 없습니다.

### 2. Query 코드 파일 처리

배포 환경에서 `/Users/user/Documents/쿼리별 주간지표/top_20000_query_분리.xlsx` 파일을 사용하려면:

**옵션 1**: 파일을 프로젝트 내부로 복사
```bash
mkdir -p data
cp /Users/user/Documents/쿼리별\ 주간지표/top_20000_query_분리.xlsx data/
```

그리고 `.env`에서:
```
QUERY_CODE_FILE_PATH=./data/top_20000_query_분리.xlsx
```

**옵션 2**: 파일을 클라우드 스토리지에 업로드하고 URL로 접근하도록 수정

## 배포 옵션

### 옵션 1: Railway (추천 - 가장 간단)

1. **Railway 계정 생성**
   - https://railway.app 접속
   - GitHub 계정으로 로그인

2. **프로젝트 배포**
   - "New Project" 클릭
   - "Deploy from GitHub repo" 선택
   - 저장소 선택
   - 자동으로 배포 시작

3. **환경 변수 설정**
   - 프로젝트 설정 → Variables
   - `PORT`는 자동 설정됨
   - `QUERY_CODE_FILE_PATH` 설정 (필요한 경우)

4. **도메인 설정**
   - Settings → Generate Domain
   - 생성된 도메인으로 접속 가능

**장점**: 
- 무료 티어 제공 ($5 크레딧/월)
- 자동 HTTPS
- GitHub 연동으로 자동 배포
- 매우 간단한 설정

### 옵션 2: Render

1. **Render 계정 생성**
   - https://render.com 접속
   - GitHub 계정으로 로그인

2. **프로젝트 배포**
   - "New +" → "Web Service"
   - GitHub 저장소 연결
   - 설정:
     - Build Command: `npm install`
     - Start Command: `npm start`
     - Environment: `Node`

3. **환경 변수 설정**
   - Environment → Environment Variables
   - 필요한 변수 추가

4. **도메인 설정**
   - Settings → Custom Domain (무료 서브도메인 제공)

**장점**:
- 무료 티어 제공
- 자동 HTTPS
- 쉬운 설정

### 옵션 3: Heroku

1. **Heroku CLI 설치**
   ```bash
   npm install -g heroku
   ```

2. **Heroku 계정 생성 및 로그인**
   ```bash
   heroku login
   ```

3. **프로젝트 생성**
   ```bash
   cd /Users/user/cursor/weekly-tracker
   heroku create weekly-tracker
   ```

4. **환경 변수 설정**
   ```bash
   heroku config:set QUERY_CODE_FILE_PATH=/app/data/top_20000_query_분리.xlsx
   ```

5. **배포**
   ```bash
   git push heroku main
   ```

**참고**: Heroku는 무료 티어를 중단했으므로 유료 플랜이 필요합니다.

### 옵션 4: VPS (AWS EC2, DigitalOcean 등)

1. **서버 설정**
   ```bash
   # Node.js 설치
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # PM2 설치 (프로세스 관리)
   sudo npm install -g pm2
   ```

2. **프로젝트 배포**
   ```bash
   git clone <your-repo>
   cd weekly-tracker
   npm install
   ```

3. **환경 변수 설정**
   ```bash
   cp .env.example .env
   # .env 파일 편집
   ```

4. **PM2로 실행**
   ```bash
   pm2 start server.js --name weekly-tracker
   pm2 save
   pm2 startup
   ```

5. **Nginx 설정** (리버스 프록시)
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 배포 후 확인사항

1. **서버 상태 확인**
   ```bash
   curl http://your-domain.com/api/data
   ```

2. **데이터 디렉토리 권한 확인**
   - `data/` 디렉토리가 쓰기 가능한지 확인

3. **파일 업로드 테스트**
   - 대시보드에서 XLSX 파일 업로드 테스트

## 문제 해결

### 데이터 파일이 저장되지 않는 경우
- `data/` 디렉토리 권한 확인
- 환경 변수 `QUERY_CODE_FILE_PATH` 경로 확인

### 포트 에러
- `PORT` 환경 변수가 올바르게 설정되었는지 확인
- 배포 플랫폼의 기본 포트 사용 (Railway, Render는 자동 설정)

### Query 코드 파일을 찾을 수 없는 경우
- 필터 기능만 사용 불가, 기본 기능은 정상 작동
- 파일을 프로젝트 내부로 복사하거나 경로 수정

## 보안 고려사항

1. **환경 변수**: 민감한 정보는 절대 코드에 하드코딩하지 마세요
2. **CORS**: 필요시 특정 도메인만 허용하도록 설정
3. **파일 업로드**: 파일 크기 제한 설정 고려
4. **HTTPS**: 프로덕션 환경에서는 반드시 HTTPS 사용

## 모니터링

배포 후 다음을 모니터링하세요:
- 서버 로그
- 메모리 사용량
- 디스크 사용량 (데이터 파일)
- 응답 시간

