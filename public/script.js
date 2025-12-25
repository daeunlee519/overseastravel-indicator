class WeeklyTracker {
    constructor() {
        this.data = null;
        this.currentChart = null;
        this.currentQuery = null;
        this.currentSection = 'upload';
        this.isLoadingDashboard = false;
        this.init();
    }

    init() {
        console.log('WeeklyTracker 초기화 시작...');
        
        // DOM이 완전히 로드된 후 이벤트 리스너 설정
        setTimeout(() => {
            this.setupEventListeners();
            this.setupDashboardTabs();
            this.loadExistingData();
            this.loadUploadHistory(); // 업로드 히스토리 자동 로드
            console.log('WeeklyTracker 초기화 완료');
        }, 100);
    }

    setupEventListeners() {
        console.log('이벤트 리스너 설정 시작...');
        
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');
        const querySelect = document.getElementById('querySelect');
        const dataQuerySelect = document.getElementById('dataQuerySelect');
        const chartTypeButtons = document.querySelectorAll('.chart-type-btn');
        const showUploadBtn = document.getElementById('showUploadBtn');
        const showDataBtn = document.getElementById('showDataBtn');
        const showDashboardBtn = document.getElementById('showDashboardBtn');
        const showFilterBtn = document.getElementById('showFilterBtn');

        // 엘리먼트 존재 확인
        if (!fileInput) console.error('fileInput을 찾을 수 없습니다.');
        if (!uploadArea) console.error('uploadArea를 찾을 수 없습니다.');
        if (!showUploadBtn) console.error('showUploadBtn을 찾을 수 없습니다.');
        if (!showDataBtn) console.error('showDataBtn을 찾을 수 없습니다.');
        if (!showDashboardBtn) console.error('showDashboardBtn을 찾을 수 없습니다.');

        // 파일 입력 처리
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e.target.files[0]));
        }

        // 드래그 앤 드롭 처리
        if (uploadArea) {
            uploadArea.addEventListener('click', () => fileInput.click());
            uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            uploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));
        }

        // 쿼리 선택 처리
        if (querySelect) {
            querySelect.addEventListener('change', (e) => this.handleQueryChange(e.target.value));
        }
        if (dataQuerySelect) {
            dataQuerySelect.addEventListener('change', (e) => this.handleDataQueryChange(e.target.value));
        }

        // 차트 타입 버튼 처리
        chartTypeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleChartTypeChange(e.target.dataset.type));
        });

        // 섹션 전환 버튼 처리
        if (showUploadBtn) {
            showUploadBtn.addEventListener('click', () => {
                console.log('업로드 버튼 클릭됨');
                this.showSection('upload');
            });
        }
        if (showDataBtn) {
            showDataBtn.addEventListener('click', () => {
                console.log('데이터 조회 버튼 클릭됨');
                this.showSection('data');
            });
        }
        if (showDashboardBtn) {
            showDashboardBtn.addEventListener('click', () => {
                console.log('대시보드 버튼 클릭됨');
                this.showSection('dashboard');
            });
        }
        if (showFilterBtn) {
            showFilterBtn.addEventListener('click', () => {
                console.log('필터 분석 버튼 클릭됨');
                this.showSection('filter');
            });
        }

        console.log('이벤트 리스너 설정 완료');
    }

    showSection(sectionName) {
        console.log('섹션 전환:', sectionName);
        
        // 모든 섹션 숨기기
        const sections = ['uploadSection', 'dataSection', 'dashboardSection', 'filterSection', 'resultsSection'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
            }
        });

        // 선택된 섹션만 보이기
        const targetSection = document.getElementById(`${sectionName}Section`);
        if (targetSection) {
            targetSection.style.display = 'block';
            console.log(`${sectionName} 섹션 표시됨`);
        } else {
            console.error(`${sectionName}Section을 찾을 수 없습니다.`);
        }

        // 버튼 활성화 상태 변경
        document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
        const targetBtn = document.getElementById(`show${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}Btn`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        this.currentSection = sectionName;

        // 섹션별 초기화
        if (sectionName === 'data') {
            console.log('기존 데이터 로드 시작...');
            this.loadExistingData();
        } else if (sectionName === 'dashboard') {
            console.log('대시보드 섹션 표시...');
            // 대시보드 데이터가 이미 로드되어 있다면 현재 선택된 기간의 데이터만 다시 로드
            if (this.dashboardData) {
                this.loadWeeklyData();
                this.loadMonthlyData();
            } else {
                this.loadDashboardData();
            }
        } else if (sectionName === 'filter') {
            console.log('필터 분석 데이터 로드 시작...');
            this.loadFilterData();
        }
    }

    async loadExistingData() {
        try {
            console.log('기존 데이터 로드 시작...');
            const response = await fetch('/api/data');
            const result = await response.json();
            console.log('API 응답 성공:', result.success);

            if (result.success) {
                this.data = result.data;
                const queryCount = Object.keys(this.data).length;
                console.log('데이터 설정 완료:', queryCount, '개 쿼리');
                
                // 후쿠오카날씨 쿼리 확인
                const hasFukuokaWeather = this.data.hasOwnProperty('후쿠오카날씨');
                console.log('후쿠오카날씨 쿼리 존재 여부:', hasFukuokaWeather);
                
                if (hasFukuokaWeather) {
                    console.log('후쿠오카날씨 쿼리 데이터:', this.data['후쿠오카날씨']);
                }
                
                // 후쿠오카날씨 관련 모든 쿼리 찾기
                const fukuokaQueries = Object.keys(this.data).filter(key => key.includes('후쿠오카날씨'));
                console.log('후쿠오카날씨 관련 쿼리 수:', fukuokaQueries.length);
                console.log('후쿠오카날씨 관련 쿼리 목록:', fukuokaQueries.slice(0, 10));
                
                this.updateDataSummary(result);
                this.setupDataQuerySelector();
                if (this.currentQuery) {
                    this.updateDataChart();
                    this.updateDataTable();
                }
            } else {
                console.error('API 응답 실패:', result);
            }
        } catch (error) {
            console.error('기존 데이터 로드 오류:', error);
        }
    }

    loadDashboardData() {
        // 이미 로딩 중이면 중복 호출 방지
        if (this.isLoadingDashboard) {
            console.log('대시보드 데이터 로딩 중... 중복 호출 방지');
            return;
        }
        
        this.isLoadingDashboard = true;
        console.log('대시보드 데이터 로드 시작...');
        
        fetch('/api/dashboard')
            .then(response => response.json())
            .then(result => {
                console.log('대시보드 API 응답:', result);
                if (result.success) {
                    this.dashboardData = result.data;
                    console.log('대시보드 데이터 설정 완료:', this.dashboardData);
                    this.updateDashboardSummary();
                    this.setupWeeklyPeriodSelector();
                    this.setupMonthlyPeriodSelector();
                    this.updateLatestPeriodInfo();
                    
                    // 초기 데이터 로드
                    this.loadWeeklyData();
                } else {
                    console.error('대시보드 API 응답 실패:', result);
                }
            })
            .catch(error => {
                console.error('대시보드 데이터 로드 오류:', error);
            })
            .finally(() => {
                this.isLoadingDashboard = false;
            });
    }

    setupDashboardTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                
                // 모든 탭 버튼 비활성화
                tabBtns.forEach(b => b.classList.remove('active'));
                // 모든 탭 콘텐츠 숨기기
                tabContents.forEach(content => content.classList.remove('active'));
                
                // 선택된 탭 활성화
                btn.classList.add('active');
                document.getElementById(targetTab + 'Tab').classList.add('active');
                
                // 해당 탭의 데이터 로드
                if (targetTab === 'weekly') {
                    this.loadWeeklyData();
                } else if (targetTab === 'monthly') {
                    this.loadMonthlyData();
                }
            });
        });
    }

    setupWeeklyPeriodSelector() {
        const periodSelect = document.getElementById('weeklyPeriodSelect');
        if (!periodSelect) {
            console.error('weeklyPeriodSelect 엘리먼트를 찾을 수 없습니다.');
            return;
        }
        
        if (!this.dashboardData || !this.dashboardData.weeklyAnalysis) {
            console.error('주간 분석 데이터가 없습니다:', this.dashboardData);
            return;
        }
        
        console.log('주간 기간 선택기 설정 중:', this.dashboardData.weeklyAnalysis.length, '개 기간');
        
        periodSelect.innerHTML = '<option value="">기간을 선택하세요</option>';
        
        this.dashboardData.weeklyAnalysis.forEach((week, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = week.period;
            periodSelect.appendChild(option);
        });
        
        // 첫 번째 기간을 기본으로 선택
        if (this.dashboardData.weeklyAnalysis.length > 0) {
            periodSelect.value = '0';
            this.updateWeeklyAnalysisTable(this.dashboardData.weeklyAnalysis[0].top50);
        }
        
        // 기존 이벤트 리스너 제거 후 새로 추가 (중복 방지)
        periodSelect.removeEventListener('change', this.handleWeeklyPeriodChange);
        this.handleWeeklyPeriodChange = (e) => {
            const selectedIndex = parseInt(e.target.value);
            console.log('선택된 기간 인덱스:', selectedIndex);
            if (selectedIndex >= 0 && this.dashboardData.weeklyAnalysis[selectedIndex]) {
                this.updateWeeklyAnalysisTable(this.dashboardData.weeklyAnalysis[selectedIndex].top50);
            }
        };
        periodSelect.addEventListener('change', this.handleWeeklyPeriodChange);
        
        // 정렬 기준 선택 이벤트 리스너
        this.setupWeeklyCriteriaButtons();
    }

    setupWeeklyCriteriaButtons() {
        const scBtn = document.getElementById('weeklyScBtn');
        const ccBtn = document.getElementById('weeklyCcBtn');
        
        if (scBtn && ccBtn) {
            // 기존 이벤트 리스너 제거 후 새로 추가 (중복 방지)
            scBtn.removeEventListener('click', this.handleWeeklyScClick);
            ccBtn.removeEventListener('click', this.handleWeeklyCcClick);
            
            this.handleWeeklyScClick = () => this.setWeeklyCriteria('sc');
            this.handleWeeklyCcClick = () => this.setWeeklyCriteria('cc');
            
            scBtn.addEventListener('click', this.handleWeeklyScClick);
            ccBtn.addEventListener('click', this.handleWeeklyCcClick);
        }
    }

    setWeeklyCriteria(criteria) {
        // 버튼 활성화 상태 변경
        const scBtn = document.getElementById('weeklyScBtn');
        const ccBtn = document.getElementById('weeklyCcBtn');
        
        if (scBtn && ccBtn) {
            scBtn.classList.toggle('active', criteria === 'sc');
            ccBtn.classList.toggle('active', criteria === 'cc');
        }
        
        // 현재 선택된 기간의 데이터를 새로운 기준으로 정렬하여 표시
        const periodSelect = document.getElementById('weeklyPeriodSelect');
        if (periodSelect && periodSelect.value !== '') {
            const selectedIndex = parseInt(periodSelect.value);
            if (selectedIndex >= 0 && this.dashboardData.weeklyAnalysis[selectedIndex]) {
                this.updateWeeklyAnalysisTable(this.dashboardData.weeklyAnalysis[selectedIndex].top50, criteria);
            }
        }
    }

    setupMonthlyPeriodSelector() {
        const periodSelect = document.getElementById('monthlyPeriodSelect');
        if (!periodSelect) {
            console.error('monthlyPeriodSelect 엘리먼트를 찾을 수 없습니다.');
            return;
        }
        
        if (!this.dashboardData || !this.dashboardData.monthlyAnalysis) {
            console.error('월간 분석 데이터가 없습니다:', this.dashboardData);
            return;
        }
        
        console.log('월간 선택기 설정 중:', this.dashboardData.monthlyAnalysis.length, '개 월');
        
        periodSelect.innerHTML = '<option value="">월을 선택하세요</option>';
        
        this.dashboardData.monthlyAnalysis.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = month.month;
            periodSelect.appendChild(option);
        });
        
        // 첫 번째 월을 기본으로 선택
        if (this.dashboardData.monthlyAnalysis.length > 0) {
            periodSelect.value = '0';
            this.updateMonthlyAnalysisTable(this.dashboardData.monthlyAnalysis[0].top50);
        }
        
        // 기존 이벤트 리스너 제거 후 새로 추가 (중복 방지)
        periodSelect.removeEventListener('change', this.handleMonthlyPeriodChange);
        this.handleMonthlyPeriodChange = (e) => {
            const selectedIndex = parseInt(e.target.value);
            console.log('선택된 월 인덱스:', selectedIndex);
            if (selectedIndex >= 0 && this.dashboardData.monthlyAnalysis[selectedIndex]) {
                this.updateMonthlyAnalysisTable(this.dashboardData.monthlyAnalysis[selectedIndex].top50);
            }
        };
        periodSelect.addEventListener('change', this.handleMonthlyPeriodChange);
    }

    loadWeeklyData() {
        // 현재 선택된 주간 기간 확인
        const periodSelect = document.getElementById('weeklyPeriodSelect');
        let selectedIndex = 0;
        
        if (periodSelect && periodSelect.value !== '') {
            selectedIndex = parseInt(periodSelect.value);
        }
        
        if (this.dashboardData.weeklyAnalysis && this.dashboardData.weeklyAnalysis.length > 0) {
            const selectedWeek = this.dashboardData.weeklyAnalysis[selectedIndex] || this.dashboardData.weeklyAnalysis[0];
            this.updateWeeklyAnalysisTable(selectedWeek.top50);
        }
        
        if (this.dashboardData.latestWeekAnalysis && this.dashboardData.latestWeekAnalysis.length > 0) {
            this.updateLatestWeekTable(this.dashboardData.latestWeekAnalysis[0].top50);
            this.updateLatestWeeklyPeriodInfo(this.dashboardData.latestWeekAnalysis[0]);
        }
    }

    loadMonthlyData() {
        // 현재 선택된 월간 기간 확인
        const periodSelect = document.getElementById('monthlyPeriodSelect');
        let selectedIndex = 0;
        
        if (periodSelect && periodSelect.value !== '') {
            selectedIndex = parseInt(periodSelect.value);
        }
        
        if (this.dashboardData.monthlyAnalysis && this.dashboardData.monthlyAnalysis.length > 0) {
            const selectedMonth = this.dashboardData.monthlyAnalysis[selectedIndex] || this.dashboardData.monthlyAnalysis[0];
            this.updateMonthlyAnalysisTable(selectedMonth.top50);
        }
        
        if (this.dashboardData.latestMonthAnalysis && this.dashboardData.latestMonthAnalysis.length > 0) {
            this.updateLatestMonthTable(this.dashboardData.latestMonthAnalysis[0].top50);
            this.updateLatestMonthlyPeriodInfo(this.dashboardData.latestMonthAnalysis[0]);
        }
    }

    updateLatestPeriodInfo() {
        // 주간 정보 업데이트
        if (this.dashboardData.latestWeekAnalysis && this.dashboardData.latestWeekAnalysis.length > 0) {
            this.updateLatestWeeklyPeriodInfo(this.dashboardData.latestWeekAnalysis[0]);
        }
        
        // 월간 정보 업데이트
        if (this.dashboardData.latestMonthAnalysis && this.dashboardData.latestMonthAnalysis.length > 0) {
            this.updateLatestMonthlyPeriodInfo(this.dashboardData.latestMonthAnalysis[0]);
        }
    }

    updateLatestWeeklyPeriodInfo(weekData) {
        const latestPeriodInfo = document.getElementById('latestWeeklyPeriodInfo');
        if (latestPeriodInfo) {
            latestPeriodInfo.innerHTML = `
                <h4>📅 주간 비교</h4>
                <p>최신: ${weekData.latestPeriod} | 이전: ${weekData.previousPeriod}</p>
            `;
        }
    }

    updateLatestMonthlyPeriodInfo(monthData) {
        const latestPeriodInfo = document.getElementById('latestMonthlyPeriodInfo');
        if (latestPeriodInfo) {
            latestPeriodInfo.innerHTML = `
                <h4>📅 월간 비교</h4>
                <p>최신: ${monthData.latestMonth} | 이전: ${monthData.previousMonth}</p>
            `;
        }
    }

    async loadUploadHistory() {
        try {
            const response = await fetch('/api/history');
            const result = await response.json();

            if (result.success) {
                this.displayUploadHistory(result.history);
            }
        } catch (error) {
            console.error('업로드 히스토리 로드 오류:', error);
        }
    }

    displayUploadHistory(history) {
        const historyList = document.getElementById('historyList');
        
        if (history.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: #666;">아직 업로드된 파일이 없습니다.</p>';
            return;
        }

        historyList.innerHTML = history.map(item => `
            <div class="history-item">
                <div class="history-item-header">
                    <div class="history-item-icon">📁</div>
                    <div class="history-item-title">${item.filename}</div>
                </div>
                <div class="history-item-details">
                    <div class="history-detail">
                        <div class="history-detail-label">처리된 쿼리</div>
                        <div class="history-detail-value">${item.queriesProcessed}개</div>
                    </div>
                    <div class="history-detail">
                        <div class="history-detail-label">추가된 레코드</div>
                        <div class="history-detail-value">${item.recordsAdded}개</div>
                    </div>
                </div>
                <div class="history-item-time">${new Date(item.timestamp).toLocaleString('ko-KR')}</div>
            </div>
        `).join('');
    }

    updateDataSummary(result) {
        const dataSummary = document.getElementById('dataSummary');
        console.log('데이터 요약 업데이트:', result);
        
        if (!dataSummary) {
            console.error('dataSummary 엘리먼트를 찾을 수 없습니다.');
            return;
        }
        
        dataSummary.innerHTML = `
            <div class="summary-item">
                <h4>총 쿼리 수</h4>
                <div class="value">${result.totalQueries || 0}</div>
            </div>
            <div class="summary-item">
                <h4>총 기간 수</h4>
                <div class="value">${result.totalRecords || 0}</div>
            </div>
            <div class="summary-item">
                <h4>업로드 횟수</h4>
                <div class="value">${result.uploadHistory ? result.uploadHistory.length : 0}</div>
            </div>
        `;
        console.log('데이터 요약 업데이트 완료');
    }

    updateDashboardSummary() {
        const dashboardSummary = document.getElementById('dashboardSummary');
        
        if (!this.dashboardData) {
            dashboardSummary.innerHTML = '<p style="text-align: center; color: #666;">대시보드 데이터를 불러오는 중...</p>';
            return;
        }
        
        const weeklyCount = this.dashboardData.weeklyAnalysis ? this.dashboardData.weeklyAnalysis.length : 0;
        const monthlyCount = this.dashboardData.monthlyAnalysis ? this.dashboardData.monthlyAnalysis.length : 0;
        const latestWeekly = this.dashboardData.weeklyAnalysis && this.dashboardData.weeklyAnalysis.length > 0 
            ? this.dashboardData.weeklyAnalysis[this.dashboardData.weeklyAnalysis.length - 1].period : 'N/A';
        const latestMonthly = this.dashboardData.monthlyAnalysis && this.dashboardData.monthlyAnalysis.length > 0 
            ? this.dashboardData.monthlyAnalysis[this.dashboardData.monthlyAnalysis.length - 1].month : 'N/A';
        
        dashboardSummary.innerHTML = `
            <div class="summary-item">
                <h4>주간 분석 기간</h4>
                <div class="value">${weeklyCount}</div>
            </div>
            <div class="summary-item">
                <h4>월간 분석 월</h4>
                <div class="value">${monthlyCount}</div>
            </div>
            <div class="summary-item">
                <h4>최신 주간</h4>
                <div class="value">${latestWeekly}</div>
            </div>
            <div class="summary-item">
                <h4>최신 월간</h4>
                <div class="value">${latestMonthly}</div>
            </div>
        `;
    }

    setupDataQuerySelector() {
        const dataQuerySelect = document.getElementById('dataQuerySelect');
        console.log('데이터 쿼리 선택기 설정 시작...');
        
        if (!dataQuerySelect) {
            console.error('dataQuerySelect 엘리먼트를 찾을 수 없습니다.');
            return;
        }
        
        dataQuerySelect.innerHTML = '';

        if (!this.data || Object.keys(this.data).length === 0) {
            console.log('데이터가 없습니다.');
            dataQuerySelect.innerHTML = '<option value="">데이터가 없습니다</option>';
            return;
        }

        const queries = Object.keys(this.data);
        console.log('쿼리 목록:', queries.length, '개');
        
        queries.forEach(query => {
            const option = document.createElement('option');
            option.value = query;
            option.textContent = query;
            dataQuerySelect.appendChild(option);
        });

        // 검색 기능 설정
        this.setupDataQuerySearchListeners();

        if (queries.length > 0) {
            this.currentQuery = queries[0];
            console.log('현재 쿼리 설정:', this.currentQuery);
            this.updateDataChart();
            this.updateDataTable();
        }
        
        console.log('데이터 쿼리 선택기 설정 완료');
    }

    setupDataQuerySearchListeners() {
        const querySearch = document.getElementById('dataQuerySearch');
        const queryDropdown = document.getElementById('dataQueryDropdown');
        const queryList = document.getElementById('dataQueryList');
        
        console.log('검색 리스너 설정 시작:', { querySearch: !!querySearch, queryDropdown: !!queryDropdown, queryList: !!queryList });
        
        if (querySearch && queryDropdown && queryList) {
            // 기존 이벤트 리스너 제거
            querySearch.removeEventListener('input', this.handleDataQuerySearch);
            querySearch.removeEventListener('focus', this.handleDataQueryFocus);
            querySearch.removeEventListener('blur', this.handleDataQueryBlur);
            querySearch.removeEventListener('keydown', this.handleDataQueryKeydown);
            
            // 새로운 이벤트 핸들러 생성
            this.handleDataQuerySearch = (e) => {
                console.log('검색 입력 이벤트 발생:', e.target.value);
                this.showQueryDropdown(e.target.value);
            };
            
            this.handleDataQueryFocus = () => {
                console.log('검색창 포커스');
                this.showQueryDropdown(querySearch.value);
            };
            
            this.handleDataQueryBlur = (e) => {
                console.log('검색창 블러');
                setTimeout(() => {
                    if (!queryDropdown.contains(document.activeElement)) {
                        this.hideQueryDropdown();
                    }
                }, 150);
            };
            
            this.handleDataQueryKeydown = (e) => {
                this.handleQueryKeydown(e);
            };
            
            // 이벤트 리스너 추가
            querySearch.addEventListener('input', this.handleDataQuerySearch);
            querySearch.addEventListener('focus', this.handleDataQueryFocus);
            querySearch.addEventListener('blur', this.handleDataQueryBlur);
            querySearch.addEventListener('keydown', this.handleDataQueryKeydown);
            
            // 모든 쿼리 보기 버튼 이벤트
            const showAllBtn = document.getElementById('showAllQueriesBtn');
            if (showAllBtn) {
                showAllBtn.addEventListener('click', () => {
                    console.log('모든 쿼리 보기 버튼 클릭');
                    this.showAllQueries();
                });
            }
            
            console.log('검색 이벤트 리스너 추가 완료');
        } else {
            console.error('검색 요소를 찾을 수 없습니다');
        }
    }

    showQueryDropdown(searchTerm = '') {
        const queryDropdown = document.getElementById('dataQueryDropdown');
        const queryList = document.getElementById('dataQueryList');
        
        console.log('showQueryDropdown 호출됨:', { searchTerm, hasData: !!this.data, dataKeys: this.data ? Object.keys(this.data).length : 0 });
        
        if (!queryDropdown || !queryList || !this.data) {
            console.log('드롭다운 표시 실패:', { queryDropdown: !!queryDropdown, queryList: !!queryList, data: !!this.data });
            return;
        }
        
        const queries = Object.keys(this.data);
        const searchLower = searchTerm.toLowerCase();
        
        console.log('검색어:', searchTerm, '전체 쿼리 수:', queries.length);
        
        // 검색어에 맞는 쿼리 필터링
        let filteredQueries;
        if (searchTerm === '') {
            // 검색어가 없으면 모든 쿼리 표시 (알파벳순 정렬)
            filteredQueries = queries.sort();
        } else {
            // 정확한 매치를 우선으로 하는 스마트 정렬
            const exactMatch = queries.filter(query => 
                query.toLowerCase() === searchLower
            );
            const startsWith = queries.filter(query => 
                query.toLowerCase().startsWith(searchLower) && query.toLowerCase() !== searchLower
            );
            const contains = queries.filter(query => 
                query.toLowerCase().includes(searchLower) && 
                !query.toLowerCase().startsWith(searchLower) && 
                query.toLowerCase() !== searchLower
            );
            
            // 정확한 매치 → 시작하는 매치 → 포함하는 매치 순서로 정렬
            filteredQueries = [...exactMatch, ...startsWith, ...contains];
        }
        
        console.log('필터링된 쿼리 수:', filteredQueries.length);
        
        // 후쿠오카날씨 관련 쿼리 확인
        const fukuokaQueries = filteredQueries.filter(query => query.includes('후쿠오카날씨'));
        console.log('후쿠오카날씨 관련 쿼리 수:', fukuokaQueries.length);
        if (fukuokaQueries.length > 0) {
            console.log('후쿠오카날씨 관련 쿼리 목록:', fukuokaQueries.slice(0, 5));
        }
        
        // 드롭다운 리스트 업데이트
        queryList.innerHTML = '';
        
        if (filteredQueries.length === 0) {
            const noResult = document.createElement('div');
            noResult.className = 'query-dropdown-item';
            noResult.textContent = '검색 결과가 없습니다';
            noResult.style.color = '#a0aec0';
            noResult.style.cursor = 'default';
            queryList.appendChild(noResult);
        } else {
            // 정확한 매치가 있으면 우선 표시, 없으면 상위 50개 표시
            let displayQueries;
            const exactMatches = filteredQueries.filter(query => 
                query.toLowerCase() === searchLower
            );
            
            if (exactMatches.length > 0) {
                // 정확한 매치가 있으면 그것만 표시
                displayQueries = exactMatches;
                console.log('정확한 매치 발견:', exactMatches.length, '개');
            } else {
                // 정확한 매치가 없으면 상위 50개 표시
                displayQueries = filteredQueries.slice(0, 50);
                console.log('상위 50개 표시:', displayQueries.length, '개');
            }
            
            displayQueries.forEach((query, index) => {
                const item = document.createElement('div');
                item.className = 'query-dropdown-item';
                item.textContent = query;
                
                // 정확한 매치는 특별히 하이라이트
                if (query.toLowerCase() === searchLower) {
                    item.style.backgroundColor = '#4a90e2';
                    item.style.color = 'white';
                    item.style.fontWeight = 'bold';
                }
                // 검색어로 시작하는 쿼리는 연한 하이라이트
                else if (query.toLowerCase().startsWith(searchLower)) {
                    item.style.backgroundColor = '#e6f3ff';
                    item.style.fontWeight = 'bold';
                }
                // 후쿠오카날씨 관련 쿼리는 별도 하이라이트
                else if (query.includes('후쿠오카날씨')) {
                    item.style.backgroundColor = '#fff2e6';
                    item.style.fontWeight = 'bold';
                }
                
                item.addEventListener('click', () => {
                    console.log('쿼리 선택됨:', query);
                    this.selectQuery(query);
                });
                queryList.appendChild(item);
            });
            
            // 더 많은 결과가 있는 경우 안내 메시지 (정확한 매치가 없을 때만)
            if (exactMatches.length === 0 && filteredQueries.length > 50) {
                const moreResult = document.createElement('div');
                moreResult.className = 'query-dropdown-item';
                moreResult.textContent = `... 및 ${filteredQueries.length - 50}개 더 (검색어를 더 구체적으로 입력하세요)`;
                moreResult.style.color = '#a0aec0';
                moreResult.style.cursor = 'default';
                moreResult.style.fontStyle = 'italic';
                queryList.appendChild(moreResult);
            }
        }
        
        queryDropdown.style.display = 'block';
    }

    hideQueryDropdown() {
        const queryDropdown = document.getElementById('dataQueryDropdown');
        if (queryDropdown) {
            queryDropdown.style.display = 'none';
        }
    }

    selectQuery(query) {
        const querySearch = document.getElementById('dataQuerySearch');
        if (querySearch) {
            querySearch.value = query;
        }
        
        this.hideQueryDropdown();
        this.handleQueryChange(query);
    }

    handleQueryKeydown(e) {
        const queryDropdown = document.getElementById('dataQueryDropdown');
        const queryList = document.getElementById('dataQueryList');
        
        if (!queryDropdown || queryDropdown.style.display === 'none') return;
        
        const items = queryList.querySelectorAll('.query-dropdown-item');
        const currentIndex = Array.from(items).findIndex(item => item.classList.contains('selected'));
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                this.highlightQueryItem(items, nextIndex);
                break;
            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                this.highlightQueryItem(items, prevIndex);
                break;
            case 'Enter':
                e.preventDefault();
                if (currentIndex >= 0 && items[currentIndex]) {
                    const query = items[currentIndex].textContent;
                    if (query !== '검색 결과가 없습니다') {
                        this.selectQuery(query);
                    }
                }
                break;
            case 'Escape':
                this.hideQueryDropdown();
                break;
        }
    }

    highlightQueryItem(items, index) {
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === index);
        });
    }

    showAllQueries() {
        console.log('모든 쿼리 표시 시작');
        if (!this.data) {
            console.error('데이터가 없습니다');
            return;
        }
        
        const queries = Object.keys(this.data);
        console.log('전체 쿼리 수:', queries.length);
        
        // 후쿠오카날씨 관련 쿼리 찾기
        const fukuokaQueries = queries.filter(query => query.includes('후쿠오카날씨'));
        console.log('후쿠오카날씨 관련 쿼리:', fukuokaQueries);
        
        // 정확히 "후쿠오카날씨"가 있는지 확인
        const exactMatch = queries.find(query => query === '후쿠오카날씨');
        console.log('정확한 "후쿠오카날씨" 쿼리:', exactMatch);
        
        // 드롭다운에 모든 쿼리 표시 (최대 50개)
        this.showQueryDropdown('');
    }

    setupPeriodSelector(weeklyAnalysis) {
        const periodSelect = document.getElementById('periodSelect');
        if (!periodSelect) return;
        
        periodSelect.innerHTML = '<option value="">기간을 선택하세요</option>';
        
        if (weeklyAnalysis && weeklyAnalysis.length > 0) {
            weeklyAnalysis.forEach((week, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = week.period;
                periodSelect.appendChild(option);
            });
            
            // 첫 번째 기간을 기본으로 선택
            if (weeklyAnalysis.length > 0) {
                periodSelect.value = '0';
                this.updateWeeklyAnalysisTable(weeklyAnalysis[0].top30);
            }
        }
        
        // 기간 변경 이벤트 리스너
        periodSelect.addEventListener('change', (e) => {
            const selectedIndex = parseInt(e.target.value);
            if (selectedIndex >= 0 && weeklyAnalysis[selectedIndex]) {
                this.updateWeeklyAnalysisTable(weeklyAnalysis[selectedIndex].top30);
            }
        });
    }

    handleDataQueryChange(query) {
        this.currentQuery = query;
        this.updateDataChart();
        this.updateDataTable();
    }

    handleDragOver(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
    }

    handleFileDrop(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFileUpload(files[0]);
        }
    }

    async handleFileUpload(file) {
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.xlsx')) {
            this.showError('XLSX 파일만 업로드 가능합니다.');
            return;
        }

        // 진행 상황 표시 시작
        this.showUploadProgress();
        this.hideError();
        this.hideSuccess();

        const formData = new FormData();
        formData.append('xlsxFile', file);

        try {
            // XMLHttpRequest를 사용하여 진행 상황 추적
            const response = await this.uploadWithProgress(formData);
            const result = JSON.parse(response.responseText);

            if (result.success) {
                this.data = result.data;
                this.showSuccess(result.message);
                this.displayResults();
                this.setupQuerySelector();
                this.updateSummaryCards(result);
                this.loadExistingData(); // 기존 데이터 새로고침
                this.loadUploadHistory(); // 업로드 히스토리 새로고침
            } else {
                this.showError(result.error || '파일 처리 중 오류가 발생했습니다.');
            }
        } catch (error) {
            this.showError('서버 연결 오류: ' + error.message);
        } finally {
            this.hideUploadProgress();
        }
    }

    showUploadProgress() {
        const progressDiv = document.getElementById('uploadProgress');
        const progressBar = document.getElementById('progressBar');
        const progressPercentage = document.getElementById('progressPercentage');
        const progressStatus = document.getElementById('progressStatus');
        
        if (progressDiv) {
            progressDiv.style.display = 'block';
            progressBar.style.width = '0%';
            progressPercentage.textContent = '0%';
            progressStatus.textContent = '파일을 서버로 전송 중...';
        }
    }

    hideUploadProgress() {
        const progressDiv = document.getElementById('uploadProgress');
        if (progressDiv) {
            progressDiv.style.display = 'none';
        }
    }

    updateUploadProgress(percent, status) {
        const progressBar = document.getElementById('progressBar');
        const progressPercentage = document.getElementById('progressPercentage');
        const progressStatus = document.getElementById('progressStatus');
        
        if (progressBar) {
            progressBar.style.width = percent + '%';
        }
        if (progressPercentage) {
            progressPercentage.textContent = Math.round(percent) + '%';
        }
        if (progressStatus) {
            progressStatus.textContent = status;
        }
    }

    uploadWithProgress(formData) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            // 업로드 진행 상황 추적
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    this.updateUploadProgress(percentComplete, '파일을 서버로 전송 중...');
                }
            });

            // 서버 응답 처리
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    this.updateUploadProgress(100, '서버에서 파일 처리 중...');
                    resolve(xhr);
                } else {
                    reject(new Error('업로드 실패: ' + xhr.status));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('네트워크 오류가 발생했습니다.'));
            });

            xhr.open('POST', '/upload');
            xhr.send(formData);
        });
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        const errorText = errorDiv.querySelector('.error-text');
        errorText.textContent = message;
        errorDiv.style.display = 'block';
    }

    showSuccess(message) {
        const successDiv = document.getElementById('successMessage');
        const successText = successDiv.querySelector('.success-text');
        successText.textContent = message;
        successDiv.style.display = 'block';
        
        // 5초 후 자동으로 숨기기
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 5000);
    }

    hideError() {
        document.getElementById('errorMessage').style.display = 'none';
    }

    hideSuccess() {
        document.getElementById('successMessage').style.display = 'none';
    }

    displayResults() {
        document.getElementById('resultsSection').style.display = 'block';
    }

    setupQuerySelector() {
        const querySelect = document.getElementById('querySelect');
        const dataQuerySelect = document.getElementById('dataQuerySelect');
        
        if (querySelect) {
            querySelect.innerHTML = '';
            this.populateQuerySelect(querySelect);
        }
        
        if (dataQuerySelect) {
            dataQuerySelect.innerHTML = '';
            this.populateQuerySelect(dataQuerySelect);
        }

        // 검색 기능 설정
        this.setupQuerySearchListeners();

        const queries = Object.keys(this.data);
        if (queries.length > 0) {
            this.currentQuery = queries[0];
            this.updateChart();
            this.updateResultsTable();
        }
    }

    populateQuerySelect(selectElement) {
        const queries = Object.keys(this.data);
        queries.forEach(query => {
            const option = document.createElement('option');
            option.value = query;
            option.textContent = query;
            selectElement.appendChild(option);
        });
    }

    setupQuerySearchListeners() {
        const querySearch = document.getElementById('dataQuerySearch');
        const querySelect = document.getElementById('dataQuerySelect');
        
        if (querySearch && querySelect) {
            querySearch.addEventListener('input', (e) => {
                this.filterQueryOptions(querySelect, e.target.value);
            });
            
            querySearch.addEventListener('focus', () => {
                this.showAllQueryOptions(querySelect);
            });
        }
    }

    filterQueryOptions(selectElement, searchTerm) {
        const options = Array.from(selectElement.options);
        const searchLower = searchTerm.toLowerCase();

        options.forEach(option => {
            const optionText = option.textContent.toLowerCase();
            if (optionText.includes(searchLower)) {
                option.style.display = 'block';
            } else {
                option.style.display = 'none';
            }
        });
    }

    showAllQueryOptions(selectElement) {
        const options = Array.from(selectElement.options);
        options.forEach(option => {
            option.style.display = 'block';
        });
    }

    handleQueryChange(query) {
        this.currentQuery = query;
        
        // 현재 섹션에 따라 적절한 업데이트 함수 호출
        if (this.currentSection === 'data') {
            this.updateDataChart();
            this.updateDataTable();
        } else {
            this.updateChart();
            this.updateResultsTable();
        }
    }

    handleChartTypeChange(type) {
        // 버튼 활성화 상태 변경
        document.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('active');

        if (this.currentSection === 'data') {
            this.updateDataChart(type);
        } else {
            this.updateChart(type);
        }
    }

    updateChart(chartType = 'line') {
        if (!this.data || !this.currentQuery) return;

        const queryData = this.data[this.currentQuery];
        const ctx = document.getElementById('mainChart').getContext('2d');

        if (this.currentChart) {
            this.currentChart.destroy();
        }

        const chartConfig = this.getChartConfig(queryData, chartType, 'mainChart');
        this.currentChart = new Chart(ctx, chartConfig);
    }

    updateDataChart(chartType = 'line') {
        console.log('데이터 차트 업데이트 시작...');
        
        if (!this.data) {
            console.error('데이터가 설정되지 않았습니다.');
            return;
        }
        
        if (!this.currentQuery) {
            console.error('현재 쿼리가 설정되지 않았습니다.');
            return;
        }

        const queryData = this.data[this.currentQuery];
        if (!queryData) {
            console.error('쿼리 데이터를 찾을 수 없습니다:', this.currentQuery);
            return;
        }
        
        console.log('차트 데이터:', queryData);

        const chartElement = document.getElementById('dataChart');
        if (!chartElement) {
            console.error('dataChart 엘리먼트를 찾을 수 없습니다.');
            return;
        }
        
        const ctx = chartElement.getContext('2d');

        if (this.currentChart) {
            this.currentChart.destroy();
        }

        const chartConfig = this.getChartConfig(queryData, chartType, 'dataChart');
        this.currentChart = new Chart(ctx, chartConfig);
        console.log('데이터 차트 업데이트 완료');
    }

    getChartConfig(queryData, chartType, chartId) {
        const { periods, areaSc, areaCc, scGrowthRates, ccGrowthRates } = queryData;

        if (chartType === 'growth') {
            return {
                type: 'line',
                data: {
                    labels: periods,
                    datasets: [
                        {
                            label: 'Area SC 증감율 (%)',
                            data: scGrowthRates,
                            borderColor: 'rgb(255, 99, 132)',
                            backgroundColor: 'rgba(255, 99, 132, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Area CC 증감율 (%)',
                            data: ccGrowthRates,
                            borderColor: 'rgb(54, 162, 235)',
                            backgroundColor: 'rgba(54, 162, 235, 0.1)',
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: `${this.currentQuery} - 기간별 증감율`
                        },
                        legend: {
                            display: true
                        }
                    },
                    scales: {
                        y: {
                            title: {
                                display: true,
                                text: '증감율 (%)'
                            },
                            grid: {
                                display: true
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '기간'
                            }
                        }
                    }
                }
            };
        }

        return {
            type: chartType,
            data: {
                labels: periods,
                datasets: [
                    {
                        label: 'Area SC',
                        data: areaSc,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: chartType === 'bar' ? 'rgba(255, 99, 132, 0.8)' : 'rgba(255, 99, 132, 0.1)',
                        tension: chartType === 'line' ? 0.4 : 0,
                        fill: chartType === 'line'
                    },
                    {
                        label: 'Area CC',
                        data: areaCc,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: chartType === 'bar' ? 'rgba(54, 162, 235, 0.8)' : 'rgba(54, 162, 235, 0.1)',
                        tension: chartType === 'line' ? 0.4 : 0,
                        fill: chartType === 'line'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `${this.currentQuery} - 기간별 지표 추이`
                    },
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: '값'
                        },
                        grid: {
                            display: true
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '기간'
                        }
                    }
                }
            }
        };
    }

    updateResultsTable() {
        if (!this.data || !this.currentQuery) return;

        const queryData = this.data[this.currentQuery];
        const { periods, areaSc, areaCc, srArea, scGrowthRates, ccGrowthRates } = queryData;

        const table = document.getElementById('resultsTable');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        // 헤더는 이미 HTML에 정의되어 있음

        // 데이터 행 생성
        tbody.innerHTML = '';
        periods.forEach((period, index) => {
            const row = document.createElement('tr');
            const scGrowth = scGrowthRates[index];
            const ccGrowth = ccGrowthRates[index];
            const srAreaValue = (srArea && srArea[index]) ? srArea[index] : '';

            row.innerHTML = `
                <td>${period}</td>
                <td>${areaSc[index].toLocaleString()}</td>
                <td>${areaCc[index].toLocaleString()}</td>
                <td class="${this.getGrowthClass(scGrowth)}">${scGrowth.toFixed(2)}%</td>
                <td class="${this.getGrowthClass(ccGrowth)}">${ccGrowth.toFixed(2)}%</td>
            `;
            tbody.appendChild(row);
        });
    }

    updateDataTable() {
        const table = document.getElementById('dataTable');
        console.log('데이터 테이블 업데이트 시작...');
        
        if (!table) {
            console.error('dataTable 엘리먼트를 찾을 수 없습니다.');
            return;
        }
        
        if (!this.currentQuery) {
            console.error('현재 쿼리가 설정되지 않았습니다.');
            return;
        }
        
        if (!this.data[this.currentQuery]) {
            console.error('쿼리 데이터를 찾을 수 없습니다:', this.currentQuery);
            return;
        }

        const queryData = this.data[this.currentQuery];
        console.log('쿼리 데이터:', queryData);
        
        const { periods, areaSc, areaCc, scGrowthRates, ccGrowthRates } = queryData;
        const tbody = table.querySelector('tbody');
        
        if (!tbody) {
            console.error('테이블 tbody를 찾을 수 없습니다.');
            return;
        }
        
        tbody.innerHTML = '';
        
        if (!periods || periods.length === 0) {
            console.log('기간 데이터가 없습니다.');
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="6" style="text-align: center; padding: 20px;">데이터가 없습니다.</td>';
            tbody.appendChild(row);
            return;
        }
        
        periods.forEach((period, index) => {
            const row = document.createElement('tr');
            const scGrowthRate = scGrowthRates[index] || 0;
            const ccGrowthRate = ccGrowthRates[index] || 0;
            const sc = areaSc[index] || 0;
            const cc = areaCc[index] || 0;
            const ctr = sc > 0 ? ((cc / sc) * 100).toFixed(2) : '0.00';
            
            row.innerHTML = `
                <td>${period}</td>
                <td>${sc.toLocaleString()}</td>
                <td>${cc.toLocaleString()}</td>
                <td>${ctr}%</td>
                <td class="${this.getGrowthClass(scGrowthRate)}">${scGrowthRate.toFixed(2)}%</td>
                <td class="${this.getGrowthClass(ccGrowthRate)}">${ccGrowthRate.toFixed(2)}%</td>
            `;
            tbody.appendChild(row);
        });
        
        console.log('데이터 테이블 업데이트 완료:', periods.length, '개 행');
    }

    updateDataTableFromExisting() {
        const table = document.getElementById('dataTable');
        if (!table || !this.currentQuery || !this.data[this.currentQuery]) return;

        const queryData = this.data[this.currentQuery];
        const { periods, areaSc, areaCc, scGrowthRates, ccGrowthRates } = queryData;
        const tbody = table.querySelector('tbody');
        
        tbody.innerHTML = '';
        
        periods.forEach((period, index) => {
            const row = document.createElement('tr');
            const scGrowthRate = scGrowthRates[index] || 0;
            const ccGrowthRate = ccGrowthRates[index] || 0;
            
            row.innerHTML = `
                <td>${period}</td>
                <td>${areaSc[index].toLocaleString()}</td>
                <td>${areaCc[index].toLocaleString()}</td>
                <td class="${this.getGrowthClass(scGrowthRate)}">${scGrowthRate.toFixed(2)}%</td>
                <td class="${this.getGrowthClass(ccGrowthRate)}">${ccGrowthRate.toFixed(2)}%</td>
            `;
            tbody.appendChild(row);
        });
    }

    updateWeeklyAnalysisTable(weeklyData, criteria = 'sc') {
        const table = document.getElementById('weeklyAnalysisTable');
        if (!table) return;

        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        if (!weeklyData || weeklyData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="11" style="text-align: center; padding: 20px;">데이터가 없습니다.</td>';
            tbody.appendChild(row);
            return;
        }

        // 선택된 기준에 따라 데이터 정렬
        let sortedData = [...weeklyData];
        if (criteria === 'cc') {
            sortedData.sort((a, b) => b.areaCc - a.areaCc);
        } else {
            sortedData.sort((a, b) => b.areaSc - a.areaSc);
        }

        sortedData.forEach((item, index) => {
            const row = document.createElement('tr');
            const rank = index + 1; // Current rank based on display order
            const rankChangeHtml = this.generateRankChangeHtml(item.rankChange, item.previousRank);
            const ctr = item.areaSc > 0 ? ((item.areaCc / item.areaSc) * 100).toFixed(2) : '0.00';
            
            // 전주 데이터 계산
            const previousSc = item.previousSc || 0;
            const previousCc = item.previousCc || 0;
            
            // 감소율 계산 (전주 대비) - 감소율 = ((현재값 - 전주값) / 전주값) × 100
            const scDecreaseRate = previousSc > 0 ? (((item.areaSc - previousSc) / previousSc) * 100).toFixed(2) : '0.00';
            const ccDecreaseRate = previousCc > 0 ? (((item.areaCc - previousCc) / previousCc) * 100).toFixed(2) : '0.00';
            
            // 감소율에 따른 색상 클래스
            const scRateClass = parseFloat(scDecreaseRate) < 0 ? 'decrease' : parseFloat(scDecreaseRate) > 0 ? 'increase' : 'neutral';
            const ccRateClass = parseFloat(ccDecreaseRate) < 0 ? 'decrease' : parseFloat(ccDecreaseRate) > 0 ? 'increase' : 'neutral';
            
            row.innerHTML = `
                <td><span class="rank-badge rank-${this.getRankClass(rank)}">${rank}</span></td>
                <td>${item.query}</td>
                <td>${item.areaSc.toLocaleString()}</td>
                <td>${item.areaCc.toLocaleString()}</td>
                <td>${ctr}%</td>
                <td class="previous-rank">${item.previousRank}</td>
                <td>${rankChangeHtml}</td>
                <td>${previousSc.toLocaleString()}</td>
                <td>${previousCc.toLocaleString()}</td>
                <td class="rate-change ${scRateClass}">${scDecreaseRate}%</td>
                <td class="rate-change ${ccRateClass}">${ccDecreaseRate}%</td>
            `;
            tbody.appendChild(row);
        });

        // 분석 요약 생성
        this.generateWeeklyAnalysisSummary(sortedData, criteria);
    }

    generateWeeklyAnalysisSummary(data, criteria) {
        const summaryElement = document.getElementById('weeklyAnalysisSummary');
        const contentElement = document.getElementById('weeklySummaryContent');
        
        if (!summaryElement || !contentElement) return;

        if (!data || data.length === 0) {
            summaryElement.style.display = 'none';
            return;
        }

        // 분석 데이터 생성
        const analysis = this.analyzeWeeklyData(data, criteria);
        
        // 요약 HTML 생성
        let summaryHtml = `
            <div class="insight-section">
                <div class="insight-title">📈 주간 분석 요약</div>
                <p>이번 주 ${criteria === 'cc' ? '클릭' : '노출'} 기준 Top 50 쿼리 분석 결과, 다음과 같은 특징을 보입니다:</p>
        `;

        // 상위 키워드 분석
        if (analysis.topKeywords.length > 0) {
            const topKeywordsWithData = analysis.topKeywords.slice(0, 5).map(keyword => {
                const keywordData = data.find(d => d.query === keyword);
                const scValue = keywordData ? keywordData.areaSc.toLocaleString() : 'N/A';
                const ccValue = keywordData ? keywordData.areaCc.toLocaleString() : 'N/A';
                return `${keyword} <span class="metric-badge">📊 ${scValue} 노출, ${ccValue} 클릭</span>`;
            });
            
            summaryHtml += `
                <div class="trend-item">
                    <div class="trend-keyword">🔥 핵심 키워드</div>
                    <div class="trend-analysis">${topKeywordsWithData.join(', ')} - 이 키워드들이 검색량 상위를 차지하고 있습니다.</div>
                </div>
            `;
        }

        // 신규 진입 쿼리 분석
        if (analysis.newEntries.length > 0) {
            const newEntriesWithData = analysis.newEntries.slice(0, 5).map(query => {
                const queryData = data.find(d => d.query === query);
                const scValue = queryData ? queryData.areaSc.toLocaleString() : 'N/A';
                const ccValue = queryData ? queryData.areaCc.toLocaleString() : 'N/A';
                return `${query} <span class="metric-badge new-badge">🆕 ${scValue} 노출, ${ccValue} 클릭</span>`;
            });
            
            summaryHtml += `
                <div class="trend-item">
                    <div class="trend-keyword">🆕 신규 진입 쿼리</div>
                    <div class="trend-analysis">${newEntriesWithData.join(', ')} - 이전 주에 없던 새로운 검색어들이 상위권에 진입했습니다.</div>
                </div>
            `;
        }

        // 순위 상승 쿼리 분석
        if (analysis.risingQueries.length > 0) {
            const risingQueriesWithData = analysis.risingQueries.slice(0, 5).map(query => {
                const queryData = data.find(d => d.query === query);
                const scValue = queryData ? queryData.areaSc.toLocaleString() : 'N/A';
                const ccValue = queryData ? queryData.areaCc.toLocaleString() : 'N/A';
                const rankChange = queryData && typeof queryData.rankChange === 'number' ? queryData.rankChange : 0;
                const previousRank = queryData ? queryData.previousRank : '-';
                return `${query} <span class="metric-badge rising-badge">📈 +${rankChange}순위 (${previousRank}→${queryData ? (queryData.previousRank !== '-' ? parseInt(queryData.previousRank) - rankChange : 'N/A') : 'N/A'}) ${scValue} 노출</span>`;
            });
            
            summaryHtml += `
                <div class="trend-item">
                    <div class="trend-keyword">📈 급상승 쿼리</div>
                    <div class="trend-analysis">${risingQueriesWithData.join(', ')} - 이전 주 대비 크게 순위가 상승한 검색어들입니다.</div>
                </div>
            `;
        }

        // 카테고리별 분석
        if (analysis.categories.length > 0) {
            summaryHtml += `
                <div class="trend-item">
                    <div class="trend-keyword">🏷️ 주요 카테고리</div>
                    <div class="trend-analysis">${analysis.categories.join(', ')} - 이러한 주제의 검색이 활발합니다.</div>
                </div>
            `;
        }

        summaryHtml += `</div>`;

        contentElement.innerHTML = summaryHtml;
        summaryElement.style.display = 'block';
    }


    analyzeWeeklyData(data, criteria) {
        // 상위 키워드 추출
        const topKeywords = data.slice(0, 10).map(item => item.query);
        
        // 신규 진입 쿼리 (이전 순위가 없는 것)
        const newEntries = data.filter(item => item.previousRank === '-' || item.previousRank === '신규').map(item => item.query);
        
        // 급상승 쿼리 (순위 변화가 큰 것)
        const risingQueries = data
            .filter(item => typeof item.rankChange === 'number' && item.rankChange > 0)
            .sort((a, b) => b.rankChange - a.rankChange)
            .slice(0, 10)
            .map(item => item.query);

        // 카테고리 분석 (키워드 패턴 분석)
        const categories = this.extractCategories(data);
        
        // 예측 생성
        const prediction = this.generatePrediction(data, criteria, topKeywords, newEntries, risingQueries);

        return {
            topKeywords,
            newEntries,
            risingQueries,
            categories,
            prediction
        };
    }

    extractCategories(data) {
        const categoryMap = new Map();
        
        data.forEach(item => {
            const query = item.query.toLowerCase();
            
            // 여행 관련 카테고리
            if (query.includes('여행') || query.includes('travel')) {
                categoryMap.set('여행', (categoryMap.get('여행') || 0) + 1);
            }
            if (query.includes('날씨') || query.includes('weather')) {
                categoryMap.set('날씨', (categoryMap.get('날씨') || 0) + 1);
            }
            if (query.includes('맛집') || query.includes('restaurant')) {
                categoryMap.set('맛집', (categoryMap.get('맛집') || 0) + 1);
            }
            if (query.includes('쇼핑') || query.includes('shopping')) {
                categoryMap.set('쇼핑', (categoryMap.get('쇼핑') || 0) + 1);
            }
            if (query.includes('경비') || query.includes('cost')) {
                categoryMap.set('경비', (categoryMap.get('경비') || 0) + 1);
            }
            if (query.includes('가볼만한곳') || query.includes('attraction')) {
                categoryMap.set('관광지', (categoryMap.get('관광지') || 0) + 1);
            }
        });

        return Array.from(categoryMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([category]) => category);
    }

    generatePrediction(data, criteria, topKeywords, newEntries, risingQueries) {
        const criteriaText = criteria === 'cc' ? '클릭' : '노출';
        
        let prediction = `<div class="analysis-summary-content">
            <h4>📊 이번 주 ${criteriaText} 데이터 분석 결과</h4>
            
            <div class="analysis-section">
                <h5>📈 데이터 통계</h5>
                <p>${this.analyzeDataStatistics(data, criteria)}</p>
            </div>`;
        
        // 2. 신규 진입 쿼리 분석 (실제 데이터 기반)
        if (newEntries.length > 0) {
            const newEntryAnalysis = this.analyzeNewEntriesData(data, newEntries);
            prediction += `
            <div class="analysis-section">
                <h5>🆕 신규 진입 분석</h5>
                <p>${newEntryAnalysis}</p>
            </div>`;
        }
        
        // 3. 급상승 쿼리 분석 (실제 수치 기반)
        if (risingQueries.length > 0) {
            const risingAnalysis = this.analyzeRisingQueriesData(data, risingQueries);
            prediction += `
            <div class="analysis-section">
                <h5>📈 급상승 분석</h5>
                <p>${risingAnalysis}</p>
            </div>`;
        }
        
        // 4. 카테고리별 분포 분석 (실제 카운트 기반)
        const categoryDistribution = this.analyzeCategoryDistribution(data, topKeywords);
        if (categoryDistribution) {
            prediction += `
            <div class="analysis-section">
                <h5>🏷️ 카테고리 분포</h5>
                <p>${categoryDistribution}</p>
            </div>`;
        }
        
        // 5. 데이터 기반 전략 제안
        prediction += `
            <div class="analysis-section recommendations">
                <h5>🔮 데이터 기반 제안</h5>
                <p>${this.generateDataBasedRecommendations(data, criteria)}</p>
            </div>
        </div>`;
        
        return prediction;
    }

    analyzeDataStatistics(data, criteria) {
        const totalQueries = data.length;
        const totalSc = data.reduce((sum, item) => sum + (item.areaSc || 0), 0);
        const totalCc = data.reduce((sum, item) => sum + (item.areaCc || 0), 0);
        const avgSc = totalSc / totalQueries;
        const avgCc = totalCc / totalQueries;
        
        // 상위 10개 쿼리의 비중
        const top10Sc = data.slice(0, 10).reduce((sum, item) => sum + (item.areaSc || 0), 0);
        const top10Cc = data.slice(0, 10).reduce((sum, item) => sum + (item.areaCc || 0), 0);
        const top10ScRatio = ((top10Sc / totalSc) * 100).toFixed(1);
        const top10CcRatio = ((top10Cc / totalCc) * 100).toFixed(1);
        
        return `총 ${totalQueries}개 쿼리, 평균 노출 ${avgSc.toLocaleString()}, 평균 클릭 ${avgCc.toLocaleString()}. ` +
               `상위 10개 쿼리가 전체 노출의 ${top10ScRatio}%, 전체 클릭의 ${top10CcRatio}%를 차지합니다.`;
    }

    analyzeNewEntriesData(data, newEntries) {
        const newEntryData = newEntries.slice(0, 5).map(query => {
            const queryData = data.find(d => d.query === query);
            const scValue = queryData ? queryData.areaSc : 0;
            const ccValue = queryData ? queryData.areaCc : 0;
            return `${query} (${scValue.toLocaleString()} 노출, ${ccValue.toLocaleString()} 클릭)`;
        });
        
        const totalNewSc = newEntries.reduce((sum, query) => {
            const queryData = data.find(d => d.query === query);
            return sum + (queryData ? queryData.areaSc : 0);
        }, 0);
        
        const totalNewCc = newEntries.reduce((sum, query) => {
            const queryData = data.find(d => d.query === query);
            return sum + (queryData ? queryData.areaCc : 0);
        }, 0);
        
        return `신규 진입 ${newEntries.length}개 쿼리 (총 ${totalNewSc.toLocaleString()} 노출, ${totalNewCc.toLocaleString()} 클릭). ` +
               `주요 신규 쿼리: ${newEntryData.join(', ')}`;
    }

    analyzeRisingQueriesData(data, risingQueries) {
        const risingData = risingQueries.slice(0, 5).map(query => {
            const queryData = data.find(d => d.query === query);
            const rankChange = queryData ? queryData.rankChange : 0;
            const scValue = queryData ? queryData.areaSc : 0;
            const previousRank = queryData ? queryData.previousRank : '-';
            return `${query} (+${rankChange}순위, ${previousRank}→${queryData ? (previousRank !== '-' ? parseInt(previousRank) - rankChange : 'N/A') : 'N/A'}, ${scValue.toLocaleString()} 노출)`;
        });
        
        const avgRankChange = risingQueries.reduce((sum, query) => {
            const queryData = data.find(d => d.query === query);
            return sum + (queryData ? queryData.rankChange : 0);
        }, 0) / risingQueries.length;
        
        return `급상승 쿼리 ${risingQueries.length}개 (평균 ${avgRankChange.toFixed(1)}순위 상승). ` +
               `주요 급상승: ${risingData.join(', ')}`;
    }

    analyzeCategoryDistribution(data, topKeywords) {
        const categoryCounts = {
            '여행': 0,
            '날씨': 0,
            '맛집': 0,
            '쇼핑': 0,
            '교통': 0,
            '문화': 0
        };
        
        topKeywords.forEach(keyword => {
            const query = keyword.toLowerCase();
            if (query.includes('여행') || query.includes('travel')) categoryCounts['여행']++;
            if (query.includes('날씨') || query.includes('weather')) categoryCounts['날씨']++;
            if (query.includes('맛집') || query.includes('restaurant')) categoryCounts['맛집']++;
            if (query.includes('쇼핑') || query.includes('shopping')) categoryCounts['쇼핑']++;
            if (query.includes('교통') || query.includes('traffic')) categoryCounts['교통']++;
            if (query.includes('전시') || query.includes('공연')) categoryCounts['문화']++;
        });
        
        const topCategories = Object.entries(categoryCounts)
            .filter(([, count]) => count > 0)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);
        
        if (topCategories.length > 0) {
            const categoryText = topCategories.map(([category, count]) => `${category} ${count}개`).join(', ');
            return `상위 키워드 중 ${categoryText}가 포함되어 있습니다.`;
        }
        
        return null;
    }

    generateDataBasedRecommendations(data, criteria) {
        const recommendations = [];
        
        // 상위 쿼리 기반 제안
        const topQuery = data[0];
        if (topQuery) {
            recommendations.push(`'${topQuery.query}' (${topQuery.areaSc.toLocaleString()} 노출) 관련 콘텐츠 최적화`);
        }
        
        // 고성과 쿼리 기반 제안
        const highPerformingQueries = data.filter(item => item.areaSc > 1000).slice(0, 3);
        if (highPerformingQueries.length > 0) {
            const queryNames = highPerformingQueries.map(q => `'${q.query}'`).join(', ');
            recommendations.push(`고성과 쿼리 ${queryNames} 관련 상세 정보 강화`);
        }
        
        // 신규 쿼리 기반 제안
        const newQueries = data.filter(item => item.previousRank === '-' || item.previousRank === '신규');
        if (newQueries.length > 0) {
            recommendations.push(`신규 쿼리 ${newQueries.length}개에 대한 모니터링 강화`);
        }
        
        return recommendations.length > 0 ? 
               recommendations.join(', ') + '을 권장합니다.' : 
               '현재 데이터를 기반으로 한 특별한 제안사항이 없습니다.';
    }

    analyzeSeasonalFactors(data, currentMonth) {
        const factors = [];
        
        data.forEach(item => {
            const query = item.query.toLowerCase();
            
            // 계절별 분석
            if (currentMonth >= 3 && currentMonth <= 5) { // 봄
                if (query.includes('벚꽃') || query.includes('cherry') || query.includes('꽃놀이')) {
                    factors.push('벚꽃 시즌');
                }
                if (query.includes('봄') || query.includes('spring')) {
                    factors.push('봄 여행');
                }
            } else if (currentMonth >= 6 && currentMonth <= 8) { // 여름
                if (query.includes('여름') || query.includes('summer') || query.includes('휴가')) {
                    factors.push('여름 휴가');
                }
                if (query.includes('바다') || query.includes('해변') || query.includes('beach')) {
                    factors.push('해변 여행');
                }
                if (query.includes('에어컨') || query.includes('시원한')) {
                    factors.push('더위 대비');
                }
            } else if (currentMonth >= 9 && currentMonth <= 11) { // 가을
                if (query.includes('가을') || query.includes('autumn') || query.includes('단풍')) {
                    factors.push('가을 단풍');
                }
                if (query.includes('감자') || query.includes('고구마') || query.includes('수확')) {
                    factors.push('가을 수확');
                }
            } else { // 겨울
                if (query.includes('겨울') || query.includes('winter') || query.includes('눈')) {
                    factors.push('겨울 여행');
                }
                if (query.includes('스키') || query.includes('snow') || query.includes('눈사람')) {
                    factors.push('겨울 스포츠');
                }
            }
        });
        
        return [...new Set(factors)];
    }

    analyzeEventFactors(data, currentDate) {
        const factors = [];
        const currentMonth = currentDate.getMonth() + 1;
        const currentDay = currentDate.getDate();
        
        data.forEach(item => {
            const query = item.query.toLowerCase();
            
            // 특정 월/일 이벤트
            if (currentMonth === 2 && currentDay >= 10 && currentDay <= 20) {
                if (query.includes('발렌타인') || query.includes('valentine') || query.includes('초콜릿')) {
                    factors.push('발렌타인데이');
                }
            }
            if (currentMonth === 3 && currentDay >= 1 && currentDay <= 15) {
                if (query.includes('화이트데이') || query.includes('white day')) {
                    factors.push('화이트데이');
                }
            }
            if (currentMonth === 5 && currentDay >= 1 && currentDay <= 15) {
                if (query.includes('어버이') || query.includes('어머니') || query.includes('아버지')) {
                    factors.push('어버이날');
                }
            }
            if (currentMonth === 6 && currentDay >= 1 && currentDay <= 15) {
                if (query.includes('어린이') || query.includes('children') || query.includes('놀이공원')) {
                    factors.push('어린이날');
                }
            }
            if (currentMonth === 12 && currentDay >= 20) {
                if (query.includes('크리스마스') || query.includes('christmas') || query.includes('성탄절')) {
                    factors.push('크리스마스');
                }
            }
            
            // 일반적인 이벤트 키워드
            if (query.includes('축제') || query.includes('festival')) {
                factors.push('지역 축제');
            }
            if (query.includes('콘서트') || query.includes('공연') || query.includes('concert')) {
                factors.push('공연/콘서트');
            }
            if (query.includes('전시') || query.includes('exhibition') || query.includes('박물관')) {
                factors.push('문화 전시');
            }
        });
        
        return [...new Set(factors)];
    }

    analyzeNewTrends(data, newEntries) {
        const trendAnalysis = [];
        
        newEntries.forEach(query => {
            const queryLower = query.toLowerCase();
            
            if (queryLower.includes('신규') || queryLower.includes('new')) {
                trendAnalysis.push('새로운 관광지나 시설이 개장하여 주목받고 있습니다');
            }
            if (queryLower.includes('리뷰') || queryLower.includes('review')) {
                trendAnalysis.push('사용자 리뷰와 평가가 검색 동기에 영향을 미치고 있습니다');
            }
            if (queryLower.includes('할인') || queryLower.includes('sale') || queryLower.includes('프로모션')) {
                trendAnalysis.push('할인 이벤트나 프로모션이 검색량 증가를 유도하고 있습니다');
            }
            if (queryLower.includes('인스타') || queryLower.includes('instagram') || queryLower.includes('sns')) {
                trendAnalysis.push('SNS 유행이 검색 트렌드에 직접적인 영향을 미치고 있습니다');
            }
        });
        
        return trendAnalysis.length > 0 ? trendAnalysis[0] : '새로운 사용자 니즈나 관심사가 형성되고 있습니다';
    }

    analyzeRisingQueries(data, risingQueries) {
        const topRising = risingQueries[0];
        const risingData = data.find(d => d.query === topRising);
        
        if (!risingData) return '급상승 쿼리의 구체적 분석이 어렵습니다';
        
        const query = topRising.toLowerCase();
        const rankChange = risingData.rankChange || 0;
        const scValue = risingData.areaSc || 0;
        const previousSc = risingData.previousSc || 0;
        const growthRate = previousSc > 0 ? ((scValue - previousSc) / previousSc * 100).toFixed(1) : 0;
        
        let analysis = `'${topRising}'이 ${rankChange}순위 상승하며 ${growthRate}% 증가했습니다. `;
        
        // 구체적 원인 분석
        if (query.includes('날씨') || query.includes('weather')) {
            analysis += '기상 이변이나 특별한 날씨 현상이 검색량 증가의 주요 원인으로 보입니다.';
        } else if (query.includes('교통') || query.includes('traffic') || query.includes('지하철')) {
            analysis += '교통 상황 변화나 대중교통 이슈가 검색량 증가를 유도했습니다.';
        } else if (query.includes('맛집') || query.includes('restaurant') || query.includes('카페')) {
            analysis += '음식점 리뷰나 새로운 오픈 소식이 SNS를 통해 확산되어 검색량이 급증했습니다.';
        } else if (query.includes('쇼핑') || query.includes('shopping') || query.includes('할인')) {
            analysis += '할인 이벤트나 쇼핑몰 프로모션이 검색량 증가의 주요 동력입니다.';
        } else if (query.includes('여행') || query.includes('travel') || query.includes('관광')) {
            analysis += '여행 계획 수립이나 관광지 정보 수요가 증가하여 검색량이 상승했습니다.';
        } else {
            analysis += '소셜 미디어나 뉴스에서의 노출, 또는 사용자 관심사 변화가 주요 원인으로 추정됩니다.';
        }
        
        return analysis;
    }

    analyzeCategoryShifts(data, topKeywords) {
        const categoryCounts = {
            '여행': 0,
            '날씨': 0,
            '맛집': 0,
            '쇼핑': 0,
            '교통': 0,
            '문화': 0
        };
        
        topKeywords.forEach(keyword => {
            const query = keyword.toLowerCase();
            if (query.includes('여행') || query.includes('travel')) categoryCounts['여행']++;
            if (query.includes('날씨') || query.includes('weather')) categoryCounts['날씨']++;
            if (query.includes('맛집') || query.includes('restaurant')) categoryCounts['맛집']++;
            if (query.includes('쇼핑') || query.includes('shopping')) categoryCounts['쇼핑']++;
            if (query.includes('교통') || query.includes('traffic')) categoryCounts['교통']++;
            if (query.includes('전시') || query.includes('공연')) categoryCounts['문화']++;
        });
        
        const topCategory = Object.entries(categoryCounts)
            .sort(([,a], [,b]) => b - a)[0];
        
        if (topCategory[1] > 0) {
            return `${topCategory[0]} 관련 검색이 ${topCategory[1]}개로 가장 높은 비중을 차지하며, 이는 사용자 관심사의 변화를 반영합니다.`;
        }
        
        return null;
    }

    getSeasonalInsight(month, factors) {
        if (month >= 3 && month <= 5) {
            return '봄철 벚꽃 시즌과 신학기로 인한 여행 수요가 증가하고 있습니다.';
        } else if (month >= 6 && month <= 8) {
            return '여름 휴가철을 맞아 해변과 피서지 관련 검색이 급증하고 있습니다.';
        } else if (month >= 9 && month <= 11) {
            return '가을 단풍 시즌과 수확철로 인한 관광 수요가 높아지고 있습니다.';
        } else {
            return '겨울철 스키장과 온천 관련 검색이 증가하고 있습니다.';
        }
    }

    getEventInsight(factors) {
        if (factors.some(f => f.includes('발렌타인') || f.includes('화이트데이'))) {
            return '연인 관련 이벤트로 인한 로맨틱 여행지와 맛집 검색이 증가했습니다.';
        }
        if (factors.some(f => f.includes('어린이'))) {
            return '가족 단위 여행과 놀이공원, 체험 시설 검색이 급증했습니다.';
        }
        if (factors.some(f => f.includes('크리스마스'))) {
            return '연말 연시 이벤트로 인한 쇼핑과 여행 검색이 증가하고 있습니다.';
        }
        return '특별한 이벤트나 축제가 지역 관광과 관련 검색량에 긍정적 영향을 미치고 있습니다.';
    }

    generateStrategicRecommendations(data, criteria, currentMonth) {
        let recommendations = [];
        
        // 계절별 전략
        if (currentMonth >= 6 && currentMonth <= 8) {
            recommendations.push('여름 휴가 관련 콘텐츠와 해변/피서지 정보를 우선적으로 제공');
        } else if (currentMonth >= 9 && currentMonth <= 11) {
            recommendations.push('가을 단풍 명소와 수확 체험 관련 콘텐츠 강화');
        }
        
        // 데이터 기반 전략
        const highGrowthQueries = data.filter(item => item.areaSc > 1000).slice(0, 5);
        if (highGrowthQueries.length > 0) {
            recommendations.push(`상위 검색어 '${highGrowthQueries[0].query}' 관련 상세 정보 페이지 최적화`);
        }
        
        const newTrendQueries = data.filter(item => item.previousRank === '-' || item.previousRank === '신규').slice(0, 3);
        if (newTrendQueries.length > 0) {
            recommendations.push(`신규 트렌드 '${newTrendQueries[0].query}' 관련 콘텐츠 신속 개발`);
        }
        
        return recommendations.length > 0 ? recommendations.join(', ') + '을 권장합니다.' : '기존 콘텐츠의 품질 향상과 사용자 경험 개선에 집중하시기 바랍니다.';
    }
    
    generateRankChangeHtml(rankChange, previousRank) {
        if (rankChange === 'new') {
            return '<span class="rank-change new"><span class="rank-change-icon">🆕</span><span class="rank-change-text">신규</span></span>';
        }
        
        if (rankChange === 0) {
            return '<span class="rank-change same"><span class="rank-change-icon">➖</span><span class="rank-change-text">동일</span></span>';
        }
        
        if (rankChange > 0) {
            return `<span class="rank-change up"><span class="rank-change-icon">⬆️</span><span class="rank-change-text">+${rankChange}</span></span>`;
        }
        
        if (rankChange < 0) {
            return `<span class="rank-change down"><span class="rank-change-icon">⬇️</span><span class="rank-change-text">${rankChange}</span></span>`;
        }
        
        return '<span class="rank-change same">-</span>';
    }
    
    getRankClass(rank) {
        if (rank <= 3) return 'top-3';
        if (rank <= 10) return 'top-10';
        return 'other';
    }

    // 필터 분석 관련 메서드들
    async loadFilterData() {
        try {
            console.log('필터 데이터 로드 시작...');
            
            // 필터 옵션 로드
            const response = await fetch('/api/filter-data');
            const result = await response.json();
            
            if (result.success) {
                this.filterData = result.data;
                this.populateFilterOptions();
                this.setupFilterEventListeners();
                this.applyFilter(); // 초기 로드
            } else {
                console.error('필터 데이터 로드 실패:', result.error);
            }
        } catch (error) {
            console.error('필터 데이터 로드 오류:', error);
        }
    }

    populateFilterOptions() {
        if (!this.filterData || !this.filterData.filterOptions) return;

        const options = this.filterData.filterOptions;
        
        // 각 필터 드롭다운에 옵션 추가
        this.populateCityCodeSelect('travelCityCodeFilter', options.travelCityCode);
        this.populateSelect('travelPtnFilter', options.travelPtn);
        this.populateSelect('travelPtnCodeFilter', options.travelPtnCode);
        this.populateCountryCodeSelect('travelCountryCodeFilter', options.travelCountryCode);
        this.populateSelect('travelMonthFilter', options.travelMonth);
    }

    populateSelect(selectId, options) {
        const select = document.getElementById(selectId);
        if (!select) return;

        // 기존 옵션 제거 (전체 옵션 제외)
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        // 새 옵션 추가
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
    }

    populateCityCodeSelect(selectId, options) {
        const select = document.getElementById(selectId);
        if (!select) return;

        // 기존 옵션 제거 (전체 옵션 제외)
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        // 새 옵션 추가 (코드(도시) 형식으로 표시)
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.code;
            optionElement.textContent = option.display;
            select.appendChild(optionElement);
        });
    }

    populateCountryCodeSelect(selectId, options) {
        const select = document.getElementById(selectId);
        if (!select) return;

        // 기존 옵션 제거 (전체 옵션 제외)
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        // 새 옵션 추가 (코드(국가) 형식으로 표시)
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.code;
            optionElement.textContent = option.display;
            select.appendChild(optionElement);
        });
    }

    setupFilterEventListeners() {
        const applyBtn = document.getElementById('applyFilterBtn');
        const resetBtn = document.getElementById('resetFilterBtn');
        const clearAllBtn = document.getElementById('clearAllFilters');

        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyFilter());
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetFilter());
        }
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAllFilters());
        }
        
        // 필터 선택 변경 시 버블 업데이트
        const filterSelects = ['travelCityCodeFilter', 'travelPtnFilter', 'travelPtnCodeFilter', 'travelCountryCodeFilter', 'travelMonthFilter'];
        filterSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.addEventListener('change', () => this.updateFilterBubbles());
            }
        });
        
        // 검색 입력창 이벤트 리스너 설정
        this.setupFilterSearchListeners();
    }

    setupFilterSearchListeners() {
        const searchInputs = [
            { inputId: 'travelCityCodeSearch', selectId: 'travelCityCodeFilter' },
            { inputId: 'travelPtnSearch', selectId: 'travelPtnFilter' },
            { inputId: 'travelPtnCodeSearch', selectId: 'travelPtnCodeFilter' },
            { inputId: 'travelCountryCodeSearch', selectId: 'travelCountryCodeFilter' },
            { inputId: 'travelMonthSearch', selectId: 'travelMonthFilter' }
        ];

        searchInputs.forEach(({ inputId, selectId }) => {
            const searchInput = document.getElementById(inputId);
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.filterSelectOptions(selectId, e.target.value);
                });
                
                // 검색창 포커스 시 모든 옵션 표시
                searchInput.addEventListener('focus', () => {
                    this.showAllSelectOptions(selectId);
                });
            }
        });
    }

    filterSelectOptions(selectId, searchTerm) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const options = Array.from(select.options);
        const searchLower = searchTerm.toLowerCase();

        options.forEach(option => {
            if (option.value === '') {
                // "전체" 옵션은 항상 표시
                option.style.display = 'block';
            } else {
                const optionText = option.textContent.toLowerCase();
                if (optionText.includes(searchLower)) {
                    option.style.display = 'block';
                } else {
                    option.style.display = 'none';
                }
            }
        });
    }

    showAllSelectOptions(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const options = Array.from(select.options);
        options.forEach(option => {
            option.style.display = 'block';
        });
    }

    async applyFilter() {
        try {
            const filters = this.getFilterValues();
            
            const response = await fetch('/api/filter-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ filters })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.updateFilterSummary(result.data.summary);
                this.updateFilterResults(result.data.queries);
                this.updateFilterCharts(result.data);
            }
        } catch (error) {
            console.error('필터 적용 오류:', error);
        }
    }

    getFilterValues() {
        return {
            travelCityCode: Array.from(document.getElementById('travelCityCodeFilter').selectedOptions).map(o => o.value).filter(v => v),
            travelPtn: Array.from(document.getElementById('travelPtnFilter').selectedOptions).map(o => o.value).filter(v => v),
            travelPtnCode: Array.from(document.getElementById('travelPtnCodeFilter').selectedOptions).map(o => o.value).filter(v => v),
            travelCountryCode: Array.from(document.getElementById('travelCountryCodeFilter').selectedOptions).map(o => o.value).filter(v => v),
            travelMonth: Array.from(document.getElementById('travelMonthFilter').selectedOptions).map(o => o.value).filter(v => v)
        };
    }

    resetFilter() {
        // 모든 필터 초기화
        ['travelCityCodeFilter', 'travelPtnFilter', 'travelPtnCodeFilter', 'travelCountryCodeFilter', 'travelMonthFilter'].forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                Array.from(select.options).forEach(option => option.selected = false);
            }
        });
        
        // 검색창 초기화
        const searchInputs = ['travelCityCodeSearch', 'travelPtnSearch', 'travelPtnCodeSearch', 'travelCountryCodeSearch', 'travelMonthSearch'];
        searchInputs.forEach(inputId => {
            const searchInput = document.getElementById(inputId);
            if (searchInput) {
                searchInput.value = '';
                // 모든 옵션 다시 표시
                const selectId = inputId.replace('Search', 'Filter');
                this.showAllSelectOptions(selectId);
            }
        });
        
        this.updateFilterBubbles();
        this.applyFilter();
    }
    
    clearAllFilters() {
        this.resetFilter();
    }
    
    updateFilterBubbles() {
        console.log('updateFilterBubbles 호출됨');
        const bubblesContainer = document.getElementById('filterBubbles');
        if (!bubblesContainer) {
            console.log('filterBubbles 컨테이너를 찾을 수 없음');
            return;
        }
        
        bubblesContainer.innerHTML = '';
        
        const filters = this.getFilterValues();
        console.log('현재 필터 값:', filters);
        
        const filterLabels = {
            travelCityCode: 'Travel City Code',
            travelPtn: 'Travel Pattern',
            travelPtnCode: 'Travel Pattern Code',
            travelCountryCode: 'Travel Country Code',
            travelMonth: 'Travel Month'
        };
        
        Object.keys(filters).forEach(filterKey => {
            const values = filters[filterKey];
            console.log(`필터 ${filterKey}:`, values);
            if (values && values.length > 0) {
                console.log(`${filterKey}에 ${values.length}개 값 있음`);
                values.forEach(value => {
                    const bubble = document.createElement('div');
                    bubble.className = 'filter-bubble';
                    
                    // City Code와 Country Code의 경우 display 텍스트 사용
                    let displayText = value;
                    if ((filterKey === 'travelCityCode' || filterKey === 'travelCountryCode') && this.filterData && this.filterData.filterOptions) {
                        const optionKey = filterKey === 'travelCityCode' ? 'travelCityCode' : 'travelCountryCode';
                        const codeOption = this.filterData.filterOptions[optionKey].find(opt => opt.code === value);
                        if (codeOption) {
                            displayText = codeOption.display;
                        }
                    }
                    
                    bubble.innerHTML = `
                        <span>${filterLabels[filterKey]}: ${displayText}</span>
                        <button class="remove-btn" onclick="app.removeFilterBubble('${filterKey}', '${value}')">×</button>
                    `;
                    
                    bubblesContainer.appendChild(bubble);
                });
            }
        });
    }
    
    removeFilterBubble(filterKey, value) {
        const select = document.getElementById(filterKey + 'Filter');
        if (select) {
            const option = Array.from(select.options).find(opt => opt.value === value);
            if (option) {
                option.selected = false;
            }
        }
        
        this.updateFilterBubbles();
        this.applyFilter();
    }

    updateFilterSummary(summary) {
        document.getElementById('filteredQueryCount').textContent = summary.totalQueries.toLocaleString();
        document.getElementById('filteredTotalSC').textContent = summary.totalAreaSc.toLocaleString();
        document.getElementById('filteredTotalCC').textContent = summary.totalAreaCc.toLocaleString();
        document.getElementById('filteredAvgGrowth').textContent = summary.avgGrowthRate ? summary.avgGrowthRate.toFixed(2) + '%' : '0%';
    }

    updateFilterResults(queries) {
        const tbody = document.querySelector('#filterResultsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        queries.forEach((query, index) => {
            const row = document.createElement('tr');
            const queryCode = query.queryCode || {};
            const ctr = query.totalAreaSc > 0 ? ((query.totalAreaCc / query.totalAreaSc) * 100).toFixed(2) : '0.00';
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${query.query}</td>
                <td>${queryCode.travel_cityCode || '-'}</td>
                <td>${queryCode.travel_ptn || '-'}</td>
                <td>${queryCode.travel_countryCode || '-'}</td>
                <td>${queryCode.travel_month || '-'}</td>
                <td>${query.totalAreaSc.toLocaleString()}</td>
                <td>${query.totalAreaCc.toLocaleString()}</td>
                <td>${ctr}%</td>
                <td>0%</td>
            `;
            tbody.appendChild(row);
        });
    }

    updateFilterCharts(data) {
        // 추이 차트
        this.updateTrendChart(data.weeklyTrend);
    }

    updateTrendChart(weeklyTrend) {
        const ctx = document.getElementById('filterTrendChart');
        if (!ctx) return;

        // 기존 차트 제거
        if (this.trendChart) {
            this.trendChart.destroy();
        }

        // 실제 주간 추이 데이터 사용
        if (weeklyTrend && weeklyTrend.length > 0) {
            const labels = weeklyTrend.map(week => week.period);
            const scData = weeklyTrend.map(week => week.areaSc);
            const ccData = weeklyTrend.map(week => week.areaCc);

            this.trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Area SC',
                        data: scData,
                        borderColor: '#3182ce',
                        backgroundColor: 'rgba(49, 130, 206, 0.1)',
                        tension: 0.4,
                        fill: true
                    }, {
                        label: 'Area CC',
                        data: ccData,
                        borderColor: '#38a169',
                        backgroundColor: 'rgba(56, 161, 105, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        } else {
            // 데이터가 없는 경우 빈 차트
            this.trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: []
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    }


    updateLatestWeekTable(latestData) {
        const table = document.getElementById('latestWeekTable');
        if (!table) return;

        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        if (!latestData || latestData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="8" style="text-align: center; padding: 20px;">데이터가 없습니다.</td>';
            tbody.appendChild(row);
            return;
        }

        latestData.forEach((item, index) => {
            const row = document.createElement('tr');
            const rank = index + 1;
            const ctr = item.areaSc > 0 ? ((item.areaCc / item.areaSc) * 100).toFixed(2) : '0.00';
            
            row.innerHTML = `
                <td><span class="rank-badge rank-${this.getRankClass(rank)}">${rank}</span></td>
                <td>${item.query}</td>
                <td>${item.areaSc.toLocaleString()}</td>
                <td>${item.areaCc.toLocaleString()}</td>
                <td>${ctr}%</td>
                <td class="${this.getGrowthClass(item.growthRate)}">${item.growthRate.toFixed(2)}%</td>
                <td>${item.previousSc ? item.previousSc.toLocaleString() : '-'}</td>
                <td>${item.previousCc ? item.previousCc.toLocaleString() : '-'}</td>
            `;
            tbody.appendChild(row);
        });

        // 최신 주간 증가율 분석 요약 생성
        this.generateLatestWeekAnalysisSummary(latestData);
    }

    generateLatestWeekAnalysisSummary(data) {
        const summaryElement = document.getElementById('latestWeekAnalysisSummary');
        const contentElement = document.getElementById('latestWeekSummaryContent');
        
        if (!summaryElement || !contentElement) return;

        if (!data || data.length === 0) {
            summaryElement.style.display = 'none';
            return;
        }

        // 분석 데이터 생성
        const analysis = this.analyzeLatestWeekData(data);
        
        // 요약 HTML 생성 (기존 스타일)
        let summaryHtml = `
            <div class="insight-section">
                <div class="insight-title">📈 최신 주간 증가율 분석 요약</div>
                <p>전주 대비 증가율 Top 50 쿼리 분석 결과, 다음과 같은 급상승 패턴을 보입니다:</p>
        `;

        // 최고 증가율 쿼리 분석
        if (analysis.topGrowthQueries.length > 0) {
            const topGrowthWithData = analysis.topGrowthQueries.slice(0, 5).map(item => {
                const queryData = data.find(d => d.query === item.query);
                const scValue = queryData ? queryData.areaSc.toLocaleString() : 'N/A';
                const ccValue = queryData ? queryData.areaCc.toLocaleString() : 'N/A';
                const previousSc = queryData && queryData.previousSc ? queryData.previousSc.toLocaleString() : 'N/A';
                return `${item.query} <span class="metric-badge growth-badge">🚀 +${item.growthRate.toFixed(1)}% (${previousSc}→${scValue} 노출, ${ccValue} 클릭)</span>`;
            });
            
            summaryHtml += `
                <div class="trend-item">
                    <div class="trend-keyword">🔥 최고 증가율 쿼리</div>
                    <div class="trend-analysis">${topGrowthWithData.join(', ')} - 이 쿼리들이 가장 큰 증가세를 보이고 있습니다.</div>
                </div>
            `;
        }

        // 급상승 카테고리 분석
        if (analysis.growthCategories.length > 0) {
            summaryHtml += `
                <div class="trend-item">
                    <div class="trend-keyword">📈 급상승 카테고리</div>
                    <div class="trend-analysis">${analysis.growthCategories.join(', ')} - 이러한 주제의 검색이 급격히 증가하고 있습니다.</div>
                </div>
            `;
        }

        // 계절적/이벤트적 요인 분석
        if (analysis.seasonalFactors.length > 0) {
            summaryHtml += `
                <div class="trend-item">
                    <div class="trend-keyword">🌤️ 계절적/이벤트 요인</div>
                    <div class="trend-analysis">${analysis.seasonalFactors.join(', ')} - 이러한 요인들이 검색 증가에 영향을 미치고 있습니다.</div>
                </div>
            `;
        }

        // 신규 트렌드 분석
        if (analysis.newTrends.length > 0) {
            summaryHtml += `
                <div class="trend-item">
                    <div class="trend-keyword">🆕 신규 트렌드</div>
                    <div class="trend-analysis">${analysis.newTrends.slice(0, 5).join(', ')} - 새롭게 주목받고 있는 검색어들입니다.</div>
                </div>
            `;
        }

        summaryHtml += `</div>`;

        contentElement.innerHTML = summaryHtml;
        summaryElement.style.display = 'block';
    }


    analyzeLatestWeekData(data) {
        // 최고 증가율 쿼리 (상위 10개)
        const topGrowthQueries = data.slice(0, 10).map(item => ({
            query: item.query,
            growthRate: item.growthRate
        }));
        
        // 급상승 카테고리 분석
        const growthCategories = this.extractGrowthCategories(data);
        
        // 계절적/이벤트적 요인 분석
        const seasonalFactors = this.extractSeasonalFactors(data);
        
        // 신규 트렌드 분석 (특정 패턴의 검색어)
        const newTrends = this.extractNewTrends(data);
        
        return {
            topGrowthQueries,
            growthCategories,
            seasonalFactors,
            newTrends
        };
    }

    extractGrowthCategories(data) {
        const categoryMap = new Map();
        
        data.forEach(item => {
            const query = item.query.toLowerCase();
            const growthRate = item.growthRate;
            
            // 여행 관련
            if (query.includes('여행') || query.includes('travel')) {
                categoryMap.set('여행', (categoryMap.get('여행') || 0) + growthRate);
            }
            // 날씨 관련
            if (query.includes('날씨') || query.includes('weather')) {
                categoryMap.set('날씨', (categoryMap.get('날씨') || 0) + growthRate);
            }
            // 맛집 관련
            if (query.includes('맛집') || query.includes('restaurant')) {
                categoryMap.set('맛집', (categoryMap.get('맛집') || 0) + growthRate);
            }
            // 쇼핑 관련
            if (query.includes('쇼핑') || query.includes('shopping')) {
                categoryMap.set('쇼핑', (categoryMap.get('쇼핑') || 0) + growthRate);
            }
            // 관광지 관련
            if (query.includes('가볼만한곳') || query.includes('attraction')) {
                categoryMap.set('관광지', (categoryMap.get('관광지') || 0) + growthRate);
            }
        });

        return Array.from(categoryMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([category]) => category);
    }

    extractSeasonalFactors(data) {
        const factors = [];
        const currentMonth = new Date().getMonth() + 1;
        
        data.forEach(item => {
            const query = item.query.toLowerCase();
            
            // 계절적 요인
            if (query.includes('여름') || query.includes('summer')) {
                factors.push('여름 시즌');
            }
            if (query.includes('겨울') || query.includes('winter')) {
                factors.push('겨울 시즌');
            }
            if (query.includes('봄') || query.includes('spring')) {
                factors.push('봄 시즌');
            }
            if (query.includes('가을') || query.includes('autumn') || query.includes('fall')) {
                factors.push('가을 시즌');
            }
            
            // 특정 월 관련
            if (query.includes(`${currentMonth}월`)) {
                factors.push(`${currentMonth}월 관련 검색`);
            }
            
            // 휴일/이벤트 관련
            if (query.includes('휴일') || query.includes('holiday')) {
                factors.push('휴일 관련');
            }
            if (query.includes('축제') || query.includes('festival')) {
                factors.push('축제 관련');
            }
        });

        return [...new Set(factors)].slice(0, 5);
    }

    extractNewTrends(data) {
        const trends = [];
        
        data.forEach(item => {
            const query = item.query.toLowerCase();
            
            // 새로운 여행지나 관광지
            if (query.includes('신규') || query.includes('new')) {
                trends.push('신규 관광지');
            }
            
            // 특정 브랜드나 시설
            if (query.includes('리조트') || query.includes('resort')) {
                trends.push('리조트 트렌드');
            }
            if (query.includes('호텔') || query.includes('hotel')) {
                trends.push('호텔 트렌드');
            }
            
            // 특정 활동
            if (query.includes('체험') || query.includes('experience')) {
                trends.push('체험 활동');
            }
        });

        return [...new Set(trends)].slice(0, 5);
    }


    analyzeGrowthStatistics(data) {
        const totalQueries = data.length;
        const avgGrowthRate = data.reduce((sum, item) => sum + item.growthRate, 0) / totalQueries;
        const maxGrowthRate = Math.max(...data.map(item => item.growthRate));
        const minGrowthRate = Math.min(...data.map(item => item.growthRate));
        
        // 증가율 구간별 분포
        const highGrowth = data.filter(item => item.growthRate > 100).length;
        const moderateGrowth = data.filter(item => item.growthRate > 50 && item.growthRate <= 100).length;
        const lowGrowth = data.filter(item => item.growthRate > 0 && item.growthRate <= 50).length;
        
        return `총 ${totalQueries}개 쿼리, 평균 증가율 ${avgGrowthRate.toFixed(1)}% ` +
               `(최고 ${maxGrowthRate.toFixed(1)}%, 최저 ${minGrowthRate.toFixed(1)}%). ` +
               `고성장(100%+) ${highGrowth}개, 중성장(50-100%) ${moderateGrowth}개, 저성장(50% 미만) ${lowGrowth}개입니다.`;
    }

    analyzeTopGrowthData(data, topGrowthQueries) {
        const topQuery = topGrowthQueries[0];
        const topQueryData = data.find(d => d.query === topQuery.query);
        
        if (!topQueryData) return '상세 분석 데이터가 부족합니다.';
        
        const currentSc = topQueryData.areaSc || 0;
        const previousSc = topQueryData.previousSc || 0;
        const currentCc = topQueryData.areaCc || 0;
        const previousCc = topQueryData.previousCc || 0;
        
        return `'${topQuery.query}'이 ${topQuery.growthRate.toFixed(1)}% 증가 ` +
               `(${previousSc.toLocaleString()} → ${currentSc.toLocaleString()} 노출, ` +
               `${previousCc.toLocaleString()} → ${currentCc.toLocaleString()} 클릭). ` +
               `상위 5개 쿼리의 평균 증가율은 ${topGrowthQueries.slice(0, 5).reduce((sum, q) => sum + q.growthRate, 0) / 5}%입니다.`;
    }

    analyzeGrowthDistribution(data) {
        const growthRanges = {
            '100% 이상': data.filter(item => item.growthRate >= 100).length,
            '50-99%': data.filter(item => item.growthRate >= 50 && item.growthRate < 100).length,
            '20-49%': data.filter(item => item.growthRate >= 20 && item.growthRate < 50).length,
            '20% 미만': data.filter(item => item.growthRate > 0 && item.growthRate < 20).length
        };
        
        const totalQueries = data.length;
        const distributionText = Object.entries(growthRanges)
            .filter(([, count]) => count > 0)
            .map(([range, count]) => `${range} ${count}개`)
            .join(', ');
        
        return `증가율 분포: ${distributionText} (총 ${totalQueries}개 쿼리).`;
    }

    analyzeCategoryGrowthData(data, growthCategories) {
        const categoryAnalysis = growthCategories.map(category => {
            const categoryQueries = data.filter(item => {
                const query = item.query.toLowerCase();
                switch(category) {
                    case '여행': return query.includes('여행') || query.includes('travel');
                    case '날씨': return query.includes('날씨') || query.includes('weather');
                    case '맛집': return query.includes('맛집') || query.includes('restaurant');
                    case '쇼핑': return query.includes('쇼핑') || query.includes('shopping');
                    case '관광지': return query.includes('가볼만한곳') || query.includes('attraction');
                    default: return false;
                }
            });
            
            if (categoryQueries.length > 0) {
                const avgGrowth = categoryQueries.reduce((sum, item) => sum + item.growthRate, 0) / categoryQueries.length;
                const totalSc = categoryQueries.reduce((sum, item) => sum + item.areaSc, 0);
                return `${category} ${categoryQueries.length}개 (평균 ${avgGrowth.toFixed(1)}% 증가, ${totalSc.toLocaleString()} 노출)`;
            }
            return null;
        }).filter(Boolean);
        
        return categoryAnalysis.length > 0 ? 
               `${categoryAnalysis.join(', ')} 카테고리가 증가세를 보이고 있습니다.` : 
               '특정 카테고리의 증가 패턴이 명확하지 않습니다.';
    }

    generateGrowthBasedRecommendations(data, topGrowthQueries) {
        const recommendations = [];
        
        // 최고 증가율 쿼리 기반 제안
        if (topGrowthQueries.length > 0) {
            const topQuery = topGrowthQueries[0];
            recommendations.push(`'${topQuery.query}' (${topQuery.growthRate.toFixed(1)}% 증가) 관련 콘텐츠 우선 개발`);
        }
        
        // 고성장 쿼리 기반 제안
        const highGrowthQueries = data.filter(item => item.growthRate > 100);
        if (highGrowthQueries.length > 0) {
            recommendations.push(`고성장 쿼리 ${highGrowthQueries.length}개에 대한 즉시 대응 콘텐츠 개발`);
        }
        
        // 안정적 증가 쿼리 기반 제안
        const stableGrowthQueries = data.filter(item => item.growthRate > 20 && item.growthRate <= 50);
        if (stableGrowthQueries.length > 0) {
            recommendations.push(`안정적 증가 쿼리 ${stableGrowthQueries.length}개에 대한 지속적 모니터링`);
        }
        
        return recommendations.length > 0 ? 
               recommendations.join(', ') + '을 권장합니다.' : 
               '현재 데이터를 기반으로 한 특별한 제안사항이 없습니다.';
    }

    analyzeTopGrowthQuery(queryData, topQuery) {
        if (!queryData) return '상세 분석 데이터가 부족합니다.';
        
        const query = topQuery.query.toLowerCase();
        const growthRate = topQuery.growthRate;
        const currentSc = queryData.areaSc || 0;
        const previousSc = queryData.previousSc || 0;
        const currentCc = queryData.areaCc || 0;
        const previousCc = queryData.previousCc || 0;
        
        let analysis = `'${topQuery.query}'이 ${growthRate.toFixed(1)}% 급증했습니다 `;
        analysis += `(${previousSc.toLocaleString()} → ${currentSc.toLocaleString()} 노출, `;
        analysis += `${previousCc.toLocaleString()} → ${currentCc.toLocaleString()} 클릭). `;
        
        // 구체적 원인 분석
        if (query.includes('날씨') || query.includes('weather')) {
            analysis += '기상 이변이나 특별한 날씨 현상이 주요 원인으로, 사용자들이 실시간 날씨 정보를 급히 찾고 있습니다.';
        } else if (query.includes('교통') || query.includes('traffic') || query.includes('지하철')) {
            analysis += '교통 상황 변화나 대중교통 이슈가 원인으로, 실시간 교통 정보 수요가 급증했습니다.';
        } else if (query.includes('맛집') || query.includes('restaurant') || query.includes('카페')) {
            analysis += '음식점 리뷰나 새로운 오픈 소식이 SNS를 통해 확산되어 검색량이 급증했습니다.';
        } else if (query.includes('쇼핑') || query.includes('shopping') || query.includes('할인')) {
            analysis += '할인 이벤트나 쇼핑몰 프로모션이 검색량 증가의 주요 동력입니다.';
        } else if (query.includes('여행') || query.includes('travel') || query.includes('관광')) {
            analysis += '여행 계획 수립이나 관광지 정보 수요가 증가하여 검색량이 상승했습니다.';
        } else if (query.includes('인스타') || query.includes('instagram') || query.includes('sns')) {
            analysis += 'SNS 유행이나 바이럴 콘텐츠가 검색 트렌드에 직접적인 영향을 미치고 있습니다.';
        } else {
            analysis += '소셜 미디어나 뉴스에서의 노출, 또는 사용자 관심사 변화가 주요 원인으로 추정됩니다.';
        }
        
        return analysis;
    }

    analyzeSeasonalImpact(data, currentMonth) {
        const seasonalQueries = data.filter(item => {
            const query = item.query.toLowerCase();
            if (currentMonth >= 6 && currentMonth <= 8) {
                return query.includes('여름') || query.includes('summer') || query.includes('휴가') || 
                       query.includes('바다') || query.includes('해변') || query.includes('beach');
            } else if (currentMonth >= 9 && currentMonth <= 11) {
                return query.includes('가을') || query.includes('autumn') || query.includes('단풍');
            } else if (currentMonth >= 12 || currentMonth <= 2) {
                return query.includes('겨울') || query.includes('winter') || query.includes('눈') ||
                       query.includes('스키') || query.includes('snow');
            } else {
                return query.includes('봄') || query.includes('spring') || query.includes('벚꽃');
            }
        });
        
        if (seasonalQueries.length > 0) {
            const avgGrowth = seasonalQueries.reduce((sum, item) => sum + item.growthRate, 0) / seasonalQueries.length;
            return `계절적 요인으로 인한 검색량 증가가 평균 ${avgGrowth.toFixed(1)}%에 달하며, ` +
                   `이는 계절별 관심사 변화를 명확히 반영하고 있습니다.`;
        }
        
        return null;
    }

    analyzeExternalFactors(data, currentDate) {
        const currentMonth = currentDate.getMonth() + 1;
        const currentDay = currentDate.getDate();
        
        const eventQueries = data.filter(item => {
            const query = item.query.toLowerCase();
            
            // 특정 이벤트 기간 체크
            if (currentMonth === 2 && currentDay >= 10 && currentDay <= 20) {
                return query.includes('발렌타인') || query.includes('valentine') || query.includes('초콜릿');
            }
            if (currentMonth === 5 && currentDay >= 1 && currentDay <= 15) {
                return query.includes('어버이') || query.includes('어머니') || query.includes('아버지');
            }
            if (currentMonth === 6 && currentDay >= 1 && currentDay <= 15) {
                return query.includes('어린이') || query.includes('children') || query.includes('놀이공원');
            }
            if (currentMonth === 12 && currentDay >= 20) {
                return query.includes('크리스마스') || query.includes('christmas') || query.includes('성탄절');
            }
            
            return query.includes('축제') || query.includes('festival') || query.includes('이벤트');
        });
        
        if (eventQueries.length > 0) {
            const totalGrowth = eventQueries.reduce((sum, item) => sum + item.growthRate, 0);
            return `특별한 이벤트나 축제가 ${eventQueries.length}개 쿼리에 영향을 미쳐 ` +
                   `총 ${totalGrowth.toFixed(1)}%의 검색량 증가를 유도했습니다.`;
        }
        
        return null;
    }

    analyzeCategoryGrowth(data, growthCategories) {
        const categoryAnalysis = growthCategories.map(category => {
            const categoryQueries = data.filter(item => {
                const query = item.query.toLowerCase();
                switch(category) {
                    case '여행': return query.includes('여행') || query.includes('travel');
                    case '날씨': return query.includes('날씨') || query.includes('weather');
                    case '맛집': return query.includes('맛집') || query.includes('restaurant');
                    case '쇼핑': return query.includes('쇼핑') || query.includes('shopping');
                    case '관광지': return query.includes('가볼만한곳') || query.includes('attraction');
                    default: return false;
                }
            });
            
            if (categoryQueries.length > 0) {
                const avgGrowth = categoryQueries.reduce((sum, item) => sum + item.growthRate, 0) / categoryQueries.length;
                return `${category} (평균 ${avgGrowth.toFixed(1)}% 증가)`;
            }
            return null;
        }).filter(Boolean);
        
        return categoryAnalysis.length > 0 ? 
               `${categoryAnalysis.join(', ')} 카테고리가 두드러진 증가세를 보이고 있습니다.` : 
               '특정 카테고리의 급상승 패턴이 명확하지 않습니다.';
    }

    analyzeNewTrendImpact(data, newTrends) {
        const trendImpact = newTrends.map(trend => {
            const trendQueries = data.filter(item => {
                const query = item.query.toLowerCase();
                switch(trend) {
                    case '신규 관광지': return query.includes('신규') || query.includes('new');
                    case '리조트 트렌드': return query.includes('리조트') || query.includes('resort');
                    case '호텔 트렌드': return query.includes('호텔') || query.includes('hotel');
                    case '체험 활동': return query.includes('체험') || query.includes('experience');
                    default: return false;
                }
            });
            
            if (trendQueries.length > 0) {
                const avgGrowth = trendQueries.reduce((sum, item) => sum + item.growthRate, 0) / trendQueries.length;
                return `${trend} (${trendQueries.length}개 쿼리, 평균 ${avgGrowth.toFixed(1)}% 증가)`;
            }
            return null;
        }).filter(Boolean);
        
        return trendImpact.length > 0 ? 
               `${trendImpact.join(', ')} 트렌드가 새로운 검색 패턴을 형성하고 있습니다.` : 
               '신규 트렌드의 영향이 제한적입니다.';
    }

    analyzeUserBehavior(data) {
        const highGrowthQueries = data.filter(item => item.growthRate > 100);
        const moderateGrowthQueries = data.filter(item => item.growthRate > 50 && item.growthRate <= 100);
        const lowGrowthQueries = data.filter(item => item.growthRate > 0 && item.growthRate <= 50);
        
        let behaviorAnalysis = '';
        
        if (highGrowthQueries.length > 0) {
            behaviorAnalysis += `극도로 높은 증가율(100% 이상)을 보인 쿼리가 ${highGrowthQueries.length}개로, `;
            behaviorAnalysis += '사용자들의 관심사가 급격히 변화하고 있음을 나타냅니다. ';
        }
        
        if (moderateGrowthQueries.length > 0) {
            behaviorAnalysis += `중간 수준의 증가율(50-100%)을 보인 쿼리가 ${moderateGrowthQueries.length}개로, `;
            behaviorAnalysis += '점진적인 관심사 변화가 진행되고 있습니다. ';
        }
        
        if (lowGrowthQueries.length > 0) {
            behaviorAnalysis += `소폭 증가(50% 미만)를 보인 쿼리가 ${lowGrowthQueries.length}개로, `;
            behaviorAnalysis += '안정적인 검색 패턴을 유지하고 있습니다.';
        }
        
        return behaviorAnalysis || '사용자 행동 패턴 분석이 어렵습니다.';
    }

    generateAdvancedRecommendations(data, currentMonth, topGrowthQueries) {
        let recommendations = [];
        
        // 계절별 맞춤 전략
        if (currentMonth >= 6 && currentMonth <= 8) {
            recommendations.push('여름 휴가 관련 콘텐츠와 해변/피서지 정보를 우선적으로 제공하고, 실시간 날씨 정보를 강화');
        } else if (currentMonth >= 9 && currentMonth <= 11) {
            recommendations.push('가을 단풍 명소와 수확 체험 관련 콘텐츠를 강화하고, 계절별 특화 정보 제공');
        } else if (currentMonth >= 12 || currentMonth <= 2) {
            recommendations.push('겨울 스포츠와 온천 관련 콘텐츠를 강화하고, 실내 활동 정보 제공');
        }
        
        // 데이터 기반 맞춤 전략
        if (topGrowthQueries.length > 0) {
            const topQuery = topGrowthQueries[0];
            recommendations.push(`'${topQuery.query}' 관련 상세 정보 페이지를 최적화하고, 관련 키워드 콘텐츠 확장`);
        }
        
        // 고성장 쿼리 기반 전략
        const highGrowthQueries = data.filter(item => item.growthRate > 100);
        if (highGrowthQueries.length > 0) {
            recommendations.push(`고성장 쿼리 ${highGrowthQueries.length}개에 대한 즉시 대응 콘텐츠 개발`);
        }
        
        // 신규 트렌드 대응 전략
        const newTrendQueries = data.filter(item => item.previousSc < 100 && item.areaSc > 500);
        if (newTrendQueries.length > 0) {
            recommendations.push(`신규 트렌드 쿼리 ${newTrendQueries.length}개에 대한 선제적 콘텐츠 준비`);
        }
        
        return recommendations.length > 0 ? 
               recommendations.join(', ') + '을 권장합니다.' : 
               '기존 콘텐츠의 품질 향상과 사용자 경험 개선에 집중하시기 바랍니다.';
    }

    updateMonthlyAnalysisTable(monthlyData) {
        const table = document.getElementById('monthlyAnalysisTable');
        if (!table) return;

        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        if (!monthlyData || monthlyData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align: center; padding: 20px;">데이터가 없습니다.</td>';
            tbody.appendChild(row);
            return;
        }

        monthlyData.forEach((item, index) => {
            const row = document.createElement('tr');
            const rank = index + 1; // Current rank based on display order
            const rankChangeHtml = this.generateRankChangeHtml(item.rankChange, item.previousRank);
            const ctr = item.areaSc > 0 ? ((item.areaCc / item.areaSc) * 100).toFixed(2) : '0.00';
            
            row.innerHTML = `
                <td><span class="rank-badge rank-${this.getRankClass(rank)}">${rank}</span></td>
                <td>${item.query}</td>
                <td>${item.areaSc.toLocaleString()}</td>
                <td>${item.areaCc.toLocaleString()}</td>
                <td>${ctr}%</td>
                <td class="previous-rank">${item.previousRank}</td>
                <td>${rankChangeHtml}</td>
            `;
            tbody.appendChild(row);
        });

        // 월간 분석 요약 생성
        this.generateMonthlyAnalysisSummary(monthlyData);
    }

    generateMonthlyAnalysisSummary(monthlyData) {
        const summaryElement = document.getElementById('monthlyAnalysisSummary');
        const contentElement = document.getElementById('monthlySummaryContent');
        
        if (!summaryElement || !contentElement || !monthlyData || monthlyData.length === 0) {
            if (summaryElement) summaryElement.style.display = 'none';
            return;
        }

        // 월간 데이터 분석
        const analysis = this.analyzeMonthlyData(monthlyData);
        
        let summaryHtml = `
            <div class="insight-section">
                <div class="insight-title">📈 월간 분석 요약</div>
                <p>이번 월 노출 기준 Top 50 쿼리 분석 결과, 다음과 같은 특징을 보입니다:</p>
        `;

        // 핵심 키워드 분석
        if (analysis.topKeywords.length > 0) {
            summaryHtml += `
                <div class="trend-item">
                    <div class="trend-keyword">🔥 핵심 키워드</div>
                    <div class="trend-analysis">
                        ${analysis.topKeywords.slice(0, 5).map(keyword => 
                            `${keyword.query} <span class="metric-badge">${keyword.areaSc.toLocaleString()} 노출</span>, <span class="metric-badge">${keyword.areaCc.toLocaleString()} 클릭</span>`
                        ).join(', ')} - 이 키워드들이 검색량 상위를 차지하고 있습니다.
                    </div>
                </div>
            `;
        }

        // 신규 진입 쿼리
        if (analysis.newQueries.length > 0) {
            summaryHtml += `
                <div class="trend-item">
                    <div class="trend-keyword">🆕 신규 진입 쿼리</div>
                    <div class="trend-analysis">
                        ${analysis.newQueries.slice(0, 3).map(query => 
                            `${query.query} <span class="metric-badge new-badge">${query.areaSc.toLocaleString()} 노출</span>, <span class="metric-badge new-badge">${query.areaCc.toLocaleString()} 클릭</span>`
                        ).join(', ')} - 이전 월에 없던 새로운 검색어들이 상위권에 진입했습니다.
                    </div>
                </div>
            `;
        }

        // 급상승 쿼리
        if (analysis.risingQueries.length > 0) {
            summaryHtml += `
                <div class="trend-item">
                    <div class="trend-keyword">📈 급상승 쿼리</div>
                    <div class="trend-analysis">
                        ${analysis.risingQueries.slice(0, 5).map(query => 
                            `${query.query} <span class="metric-badge rising-badge">+${query.rankChange}순위</span> (${query.previousRank}→${query.currentRank}) <span class="metric-badge">${query.areaSc.toLocaleString()} 노출</span>`
                        ).join(', ')} - 이전 월 대비 크게 순위가 상승한 검색어들입니다.
                    </div>
                </div>
            `;
        }

        // 순위 하락 쿼리
        if (analysis.fallingQueries.length > 0) {
            summaryHtml += `
                <div class="trend-item">
                    <div class="trend-keyword">📉 순위 하락 쿼리</div>
                    <div class="trend-analysis">
                        ${analysis.fallingQueries.slice(0, 3).map(query => 
                            `${query.query} <span class="metric-badge">${query.rankChange}순위 하락</span> (${query.previousRank}→${query.currentRank}) - 경쟁이 치열해진 검색어들입니다.
                        `).join(', ')}
                    </div>
                </div>
            `;
        }

        // 클릭률 분석
        if (analysis.avgClickRate > 0) {
            summaryHtml += `
                <div class="trend-item">
                    <div class="trend-keyword">📊 클릭률 분석</div>
                    <div class="trend-analysis">
                        평균 클릭률 <span class="metric-badge">${analysis.avgClickRate.toFixed(2)}%</span>로, 
                        ${analysis.avgClickRate > 3 ? '높은' : analysis.avgClickRate > 1.5 ? '적정한' : '낮은'} 수준입니다. 
                        ${analysis.avgClickRate > 3 ? '사용자 관심도가 높은 검색어들이 상위권을 차지하고 있습니다.' : 
                          analysis.avgClickRate > 1.5 ? '검색어와 콘텐츠 간의 적절한 매칭이 이루어지고 있습니다.' : 
                          '검색어와 콘텐츠 간의 매칭도를 개선할 필요가 있습니다.'}
                    </div>
                </div>
            `;
        }

        summaryHtml += `</div>`;
        
        contentElement.innerHTML = summaryHtml;
        summaryElement.style.display = 'block';
    }

    analyzeMonthlyData(monthlyData) {
        const topKeywords = monthlyData.slice(0, 10).map(item => ({
            query: item.query,
            areaSc: item.areaSc,
            areaCc: item.areaCc
        }));

        const newQueries = monthlyData.filter(item => 
            item.previousRank === null || item.previousRank === undefined || item.previousRank === 0
        ).slice(0, 5);

        const risingQueries = monthlyData.filter(item => 
            item.rankChange && item.rankChange > 0
        ).map(item => ({
            query: item.query,
            rankChange: item.rankChange,
            previousRank: item.previousRank,
            currentRank: monthlyData.indexOf(item) + 1,
            areaSc: item.areaSc
        })).sort((a, b) => b.rankChange - a.rankChange).slice(0, 5);

        const fallingQueries = monthlyData.filter(item => 
            item.rankChange && item.rankChange < 0
        ).map(item => ({
            query: item.query,
            rankChange: Math.abs(item.rankChange),
            previousRank: item.previousRank,
            currentRank: monthlyData.indexOf(item) + 1
        })).sort((a, b) => b.rankChange - a.rankChange).slice(0, 3);

        const totalSc = monthlyData.reduce((sum, item) => sum + item.areaSc, 0);
        const totalCc = monthlyData.reduce((sum, item) => sum + item.areaCc, 0);
        const avgClickRate = totalSc > 0 ? (totalCc / totalSc) * 100 : 0;

        return {
            topKeywords,
            newQueries,
            risingQueries,
            fallingQueries,
            avgClickRate,
            totalSc,
            totalCc
        };
    }

    updateLatestMonthTable(latestData) {
        const table = document.getElementById('latestMonthTable');
        if (!table) return;

        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        if (!latestData || latestData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="8" style="text-align: center; padding: 20px;">데이터가 없습니다.</td>';
            tbody.appendChild(row);
            return;
        }

        latestData.forEach((item, index) => {
            const row = document.createElement('tr');
            const rank = index + 1;
            const ctr = item.areaSc > 0 ? ((item.areaCc / item.areaSc) * 100).toFixed(2) : '0.00';
            
            row.innerHTML = `
                <td><span class="rank-badge rank-${this.getRankClass(rank)}">${rank}</span></td>
                <td>${item.query}</td>
                <td>${item.areaSc.toLocaleString()}</td>
                <td>${item.areaCc.toLocaleString()}</td>
                <td>${ctr}%</td>
                <td class="${this.getGrowthClass(item.growthRate)}">${item.growthRate.toFixed(2)}%</td>
                <td>${item.previousSc ? item.previousSc.toLocaleString() : '-'}</td>
                <td>${item.previousCc ? item.previousCc.toLocaleString() : '-'}</td>
            `;
            tbody.appendChild(row);
        });

        // 최신 월간 분석 요약 생성
        this.generateLatestMonthAnalysisSummary(latestData);
    }

    generateLatestMonthAnalysisSummary(latestData) {
        const summaryElement = document.getElementById('latestMonthAnalysisSummary');
        const contentElement = document.getElementById('latestMonthSummaryContent');
        
        if (!summaryElement || !contentElement || !latestData || latestData.length === 0) {
            if (summaryElement) summaryElement.style.display = 'none';
            return;
        }

        // 최신 월간 데이터 분석
        const analysis = this.analyzeLatestMonthData(latestData);
        
        let summaryHtml = `
            <div class="insight-section">
                <div class="insight-title">📈 최신 월간 증가율 분석 요약</div>
                <p>전월 대비 증가율 Top 50 쿼리 분석 결과, 다음과 같은 급상승 패턴을 보입니다:</p>
        `;

        // 최고 증가율 쿼리
        if (analysis.topGrowthQueries.length > 0) {
            summaryHtml += `
                <div class="trend-item">
                    <div class="trend-keyword">🚀 최고 증가율 쿼리</div>
                    <div class="trend-analysis">
                        ${analysis.topGrowthQueries.slice(0, 5).map(query => 
                            `${query.query} <span class="metric-badge growth-badge">+${query.growthRate.toFixed(1)}%</span> <span class="metric-badge">${query.areaSc.toLocaleString()} 노출</span>`
                        ).join(', ')} - 전월 대비 가장 큰 성장을 보인 검색어들입니다.
                    </div>
                </div>
            `;
        }

        // 고성장 쿼리 카테고리
        if (analysis.growthCategories.length > 0) {
            summaryHtml += `
                <div class="trend-item">
                    <div class="trend-keyword">📊 고성장 카테고리</div>
                    <div class="trend-analysis">
                        ${analysis.growthCategories.slice(0, 3).map(category => 
                            `${category.category} <span class="metric-badge">${category.count}개</span> (평균 <span class="metric-badge">+${category.avgGrowth.toFixed(1)}%</span>)`
                        ).join(', ')} - 이러한 주제의 검색어들이 집중적으로 성장하고 있습니다.
                    </div>
                </div>
            `;
        }

        // 계절적 요인
        if (analysis.seasonalFactors.length > 0) {
            summaryHtml += `
                <div class="trend-item">
                    <div class="trend-keyword">🌍 계절적 요인</div>
                    <div class="trend-analysis">
                        ${analysis.seasonalFactors.slice(0, 3).map(factor => 
                            `${factor.factor} <span class="metric-badge">${factor.count}개</span> 쿼리가 증가세를 보이며, 
                            ${factor.description}`
                        ).join(' ')}
                    </div>
                </div>
            `;
        }

        // 신규 트렌드
        if (analysis.newTrends.length > 0) {
            summaryHtml += `
                <div class="trend-item">
                    <div class="trend-keyword">🆕 신규 트렌드</div>
                    <div class="trend-analysis">
                        ${analysis.newTrends.slice(0, 3).map(trend => 
                            `${trend.trend} <span class="metric-badge new-badge">${trend.count}개</span> - 새로운 검색 패턴이 나타나고 있습니다.`
                        ).join(' ')}
                    </div>
                </div>
            `;
        }

        // 평균 증가율 분석
        if (analysis.avgGrowthRate > 0) {
            summaryHtml += `
                <div class="trend-item">
                    <div class="trend-keyword">📈 성장률 분석</div>
                    <div class="trend-analysis">
                        평균 증가율 <span class="metric-badge">+${analysis.avgGrowthRate.toFixed(1)}%</span>로, 
                        ${analysis.avgGrowthRate > 50 ? '매우 높은' : analysis.avgGrowthRate > 20 ? '높은' : '적정한'} 성장세를 보입니다. 
                        ${analysis.avgGrowthRate > 50 ? '시장의 급격한 변화나 새로운 트렌드가 나타나고 있습니다.' : 
                          analysis.avgGrowthRate > 20 ? '안정적인 성장 패턴을 보이고 있습니다.' : 
                          '점진적인 성장이 이루어지고 있습니다.'}
                    </div>
                </div>
            `;
        }

        summaryHtml += `</div>`;
        
        contentElement.innerHTML = summaryHtml;
        summaryElement.style.display = 'block';
    }

    analyzeLatestMonthData(latestData) {
        const topGrowthQueries = latestData.slice(0, 10).map(item => ({
            query: item.query,
            growthRate: item.growthRate,
            areaSc: item.areaSc,
            areaCc: item.areaCc
        }));

        // 카테고리별 분석 (간단한 키워드 기반)
        const categories = {};
        latestData.forEach(item => {
            const query = item.query.toLowerCase();
            let category = '기타';
            
            if (query.includes('여행') || query.includes('관광') || query.includes('여행지')) {
                category = '여행/관광';
            } else if (query.includes('맛집') || query.includes('음식') || query.includes('식당')) {
                category = '맛집/음식';
            } else if (query.includes('쇼핑') || query.includes('백화점') || query.includes('몰')) {
                category = '쇼핑';
            } else if (query.includes('호텔') || query.includes('숙박') || query.includes('리조트')) {
                category = '숙박';
            } else if (query.includes('날씨') || query.includes('기온') || query.includes('계절')) {
                category = '날씨/계절';
            }
            
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(item.growthRate);
        });

        const growthCategories = Object.entries(categories)
            .map(([category, rates]) => ({
                category,
                count: rates.length,
                avgGrowth: rates.reduce((sum, rate) => sum + rate, 0) / rates.length
            }))
            .sort((a, b) => b.avgGrowth - a.avgGrowth)
            .slice(0, 5);

        // 계절적 요인 분석
        const seasonalFactors = [];
        const currentMonth = new Date().getMonth() + 1;
        
        if (currentMonth >= 3 && currentMonth <= 5) {
            seasonalFactors.push({
                factor: '봄철 여행',
                count: latestData.filter(item => 
                    item.query.includes('봄') || item.query.includes('벚꽃') || item.query.includes('4월') || item.query.includes('5월')
                ).length,
                description: '봄철 특성을 반영한 검색어들이 증가하고 있습니다.'
            });
        } else if (currentMonth >= 6 && currentMonth <= 8) {
            seasonalFactors.push({
                factor: '여름휴가',
                count: latestData.filter(item => 
                    item.query.includes('여름') || item.query.includes('휴가') || item.query.includes('해변') || item.query.includes('7월') || item.query.includes('8월')
                ).length,
                description: '여름휴가 관련 검색어들이 급증하고 있습니다.'
            });
        } else if (currentMonth >= 9 && currentMonth <= 11) {
            seasonalFactors.push({
                factor: '가을여행',
                count: latestData.filter(item => 
                    item.query.includes('가을') || item.query.includes('단풍') || item.query.includes('10월') || item.query.includes('11월')
                ).length,
                description: '가을철 특성을 반영한 검색어들이 증가하고 있습니다.'
            });
        } else {
            seasonalFactors.push({
                factor: '겨울여행',
                count: latestData.filter(item => 
                    item.query.includes('겨울') || item.query.includes('스키') || item.query.includes('12월') || item.query.includes('1월') || item.query.includes('2월')
                ).length,
                description: '겨울철 특성을 반영한 검색어들이 증가하고 있습니다.'
            });
        }

        // 신규 트렌드 분석
        const newTrends = [];
        const trendKeywords = ['신규', '새로운', '최신', '2025', '올해'];
        
        trendKeywords.forEach(keyword => {
            const count = latestData.filter(item => 
                item.query.includes(keyword)
            ).length;
            if (count > 0) {
                newTrends.push({
                    trend: keyword + ' 관련',
                    count
                });
            }
        });

        const avgGrowthRate = latestData.reduce((sum, item) => sum + item.growthRate, 0) / latestData.length;

        return {
            topGrowthQueries,
            growthCategories,
            seasonalFactors,
            newTrends,
            avgGrowthRate
        };
    }

    getGrowthClass(rate) {
        if (rate > 0) return 'positive';
        if (rate < 0) return 'negative';
        return 'neutral';
    }

    updateSummaryCards(result) {
        const summaryCards = document.getElementById('summaryCards');
        
        // 전체 통계 계산
        const queries = Object.keys(this.data);
        let totalScGrowth = 0;
        let totalCcGrowth = 0;
        let positiveScTrends = 0;
        let positiveCcTrends = 0;

        queries.forEach(query => {
            const queryData = this.data[query];
            const { scGrowthRates, ccGrowthRates } = queryData;
            
            // 마지막 증감율
            const lastScGrowth = scGrowthRates[scGrowthRates.length - 1] || 0;
            const lastCcGrowth = ccGrowthRates[ccGrowthRates.length - 1] || 0;
            
            totalScGrowth += lastScGrowth;
            totalCcGrowth += lastCcGrowth;
            
            if (lastScGrowth > 0) positiveScTrends++;
            if (lastCcGrowth > 0) positiveCcTrends++;
        });

        const avgScGrowth = queries.length > 0 ? totalScGrowth / queries.length : 0;
        const avgCcGrowth = queries.length > 0 ? totalCcGrowth / queries.length : 0;

        summaryCards.innerHTML = `
            <div class="summary-card">
                <h4>총 쿼리 수</h4>
                <div class="value">${result.totalQueries}</div>
            </div>
            <div class="summary-card">
                <h4>총 기간 수</h4>
                <div class="value">${result.totalRecords}</div>
            </div>
            <div class="summary-card">
                <h4>SC 평균 증감율</h4>
                <div class="value ${this.getGrowthClass(avgScGrowth)}">${avgScGrowth.toFixed(2)}%</div>
            </div>
            <div class="summary-card">
                <h4>CC 평균 증감율</h4>
                <div class="value ${this.getGrowthClass(avgCcGrowth)}">${avgCcGrowth.toFixed(2)}%</div>
            </div>
        `;
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    new WeeklyTracker();
});

