// src/js/data_injection.js
// This script handles the data injection for rendering the web report. 

// 全局變數，用於接收動態數據
let analysisData = {};

let currentPage = 1;
let itemsPerPage = 10;
let allQCData = [];

// DOM載入後執行
document.addEventListener('DOMContentLoaded', function() {
    // 等待數據載入後再執行
    if (window.analysisDataReady) {
        initializeReport();
    } else {
        // 監聽數據載入事件
        document.addEventListener('analysisDataLoaded', initializeReport);
    }
});

function initializeReport() {
    if (analysisData && Object.keys(analysisData).length > 0) {
        updateQCTable(analysisData.qc_stats);
      //    updateAlphaStats(analysisData.alpha_diversity);
        updateProjectInfo(analysisData.project_id);
    }
}

// 更新QC表格 - 添加分頁版本
function updateQCTable(qcData) {
    console.log('updateQCTable called with:', qcData);
    
    const tbody = document.querySelector('#qc-table tbody');
    if (!tbody || !qcData) {
        console.error('QC table tbody not found or no data');
        return;
    }
    
    allQCData = qcData; // 儲存所有數據
    renderQCPage(currentPage);
    createPagination();
}

function renderQCPage(page) {
    const tbody = document.querySelector('#qc-table tbody');
    tbody.innerHTML = '';
    
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, allQCData.length);
    const pageData = allQCData.slice(startIndex, endIndex);
    
    pageData.forEach(function(row, index) {
        const globalIndex = startIndex + index + 1;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${globalIndex}</td>
            <td>${row.sample || 'N/A'}</td>
            <td>${row.raw_reads ? row.raw_reads.toLocaleString() : 'N/A'}</td>
            <td>${row.trimmed_reads ? row.trimmed_reads.toLocaleString() : 'N/A'}</td>
            <td>${row.decontaminated_reads ? row.decontaminated_reads.toLocaleString() : 'N/A'}</td>
            <td>${row.decon_raw_percent || 'N/A'}%</td>
            <td>${row.decon_trimmed_percent || 'N/A'}%</td>
        `;
        tbody.appendChild(tr);
    });
    
    // 更新頁面信息
    updatePageInfo();
}

// 修改後的 createPagination 函數
function createPagination() {
    const totalPages = Math.ceil(allQCData.length / itemsPerPage);
    console.log(`Total samples: ${allQCData.length}, Items per page: ${itemsPerPage}, Total pages: ${totalPages}`);
    
    let paginationContainer = document.getElementById('qc-pagination');
    
    if (!paginationContainer) {
        const tableWrapper = document.querySelector('#qc-table').parentNode;
        const pagination = document.createElement('div');
        pagination.id = 'qc-pagination';
        pagination.className = 'pagination-container';
        tableWrapper.appendChild(pagination);
    }
    
    paginationContainer = document.getElementById('qc-pagination');
    paginationContainer.innerHTML = '';
    
    // 樣本信息統計
    const statsInfo = document.createElement('div');
    statsInfo.className = 'pagination-stats';
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, allQCData.length);
    statsInfo.innerHTML = `
        <span class="stats-text">顯示第 ${startIndex} - ${endIndex} 項，共 ${allQCData.length} 個樣本</span>
        <span class="page-indicator">第 ${currentPage} 頁 / 共 ${totalPages} 頁</span>
    `;
    paginationContainer.appendChild(statsInfo);
    
    // 分頁控制區域
    const paginationNav = document.createElement('div');
    paginationNav.className = 'pagination-nav';
    
    // 首頁按鈕
    if (totalPages > 5) {
        const firstBtn = createPageButton('首頁', 1, false, 'first-page');
        firstBtn.disabled = currentPage === 1;
        paginationNav.appendChild(firstBtn);
    }
    
    // 上一頁按鈕
    const prevBtn = createPageButton('‹', currentPage - 1, false, 'prev-page');
    prevBtn.disabled = currentPage === 1;
    prevBtn.title = '上一頁';
    paginationNav.appendChild(prevBtn);
    
    // 頁碼按鈕（智能截斷）
    const pageNumbers = calculatePageNumbers(currentPage, totalPages);
    pageNumbers.forEach(page => {
        if (page === '...') {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '⋯';
            paginationNav.appendChild(ellipsis);
        } else {
            const pageBtn = createPageButton(page, page, page === currentPage, 'page-number');
            paginationNav.appendChild(pageBtn);
        }
    });
    
    // 下一頁按鈕
    const nextBtn = createPageButton('›', currentPage + 1, false, 'next-page');
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.title = '下一頁';
    paginationNav.appendChild(nextBtn);
    
    // 尾頁按鈕
    if (totalPages > 5) {
        const lastBtn = createPageButton('尾頁', totalPages, false, 'last-page');
        lastBtn.disabled = currentPage === totalPages;
        paginationNav.appendChild(lastBtn);
    }
    
    paginationContainer.appendChild(paginationNav);
    
    // 🔥 修改：總是顯示頁面跳轉輸入框（超過3頁時）
    if (totalPages > 3) {
        const jumpContainer = document.createElement('div');
        jumpContainer.className = 'pagination-jump';
        jumpContainer.innerHTML = `
            <span>跳轉至第</span>
            <input type="number" id="jump-page-input" min="1" max="${totalPages}" 
                   value="${currentPage}" class="jump-input" placeholder="頁碼">
            <span>頁</span>
            <button onclick="jumpToPage()" class="jump-btn">跳轉</button>
        `;
        paginationContainer.appendChild(jumpContainer);
        
        // 添加Enter鍵支持
        setTimeout(() => {
            const jumpInput = document.getElementById('jump-page-input');
            if (jumpInput) {
                jumpInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        jumpToPage();
                    }
                });
            }
        }, 100);
    }
}

function createPageButton(text, page, isActive, className) {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = `pagination-btn ${className}`;
    if (isActive) {
        button.classList.add('active');
    }
    if (typeof page === 'number') {
        button.onclick = () => goToPage(page);
    }
    return button;
}

// 計算要顯示的頁碼（智能截斷）
function calculatePageNumbers(current, total) {
    const pages = [];
    
    if (total <= 7) {
        // 如果總頁數少於等於7，顯示所有頁碼
        for (let i = 1; i <= total; i++) {
            pages.push(i);
        }
    } else {
        // 智能截斷邏輯
        if (current <= 4) {
            // 當前頁在前端
            for (let i = 1; i <= 5; i++) {
                pages.push(i);
            }
            pages.push('...');
            pages.push(total);
        } else if (current >= total - 3) {
            // 當前頁在後端
            pages.push(1);
            pages.push('...');
            for (let i = total - 4; i <= total; i++) {
                pages.push(i);
            }
        } else {
            // 當前頁在中間
            pages.push(1);
            pages.push('...');
            for (let i = current - 1; i <= current + 1; i++) {
                pages.push(i);
            }
            pages.push('...');
            pages.push(total);
        }
    }
    
    return pages;
}

// 跳轉頁面功能
function jumpToPage() {
    const input = document.getElementById('jump-page-input');
    const page = parseInt(input.value);
    const totalPages = Math.ceil(allQCData.length / itemsPerPage);
    
    if (page >= 1 && page <= totalPages) {
        goToPage(page);
    } else {
        alert(`請輸入 1 到 ${totalPages} 之間的頁碼`);
        input.value = currentPage;
    }
}

// 修正 goToPage 函數
function goToPage(page) {
    const totalPages = Math.ceil(allQCData.length / itemsPerPage);
    if (page >= 1 && page <= totalPages && page !== currentPage) {
        currentPage = page;
        renderQCPage(currentPage);
        createPagination();
        
        // 滾動到表格頂部
        document.querySelector('#qc-table').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
}

function updatePageInfo() {
    const pageInfo = document.getElementById('page-info');
    if (pageInfo) {
        const startIndex = (currentPage - 1) * itemsPerPage + 1;
        const endIndex = Math.min(currentPage * itemsPerPage, allQCData.length);
        const totalItems = allQCData.length;
        
        pageInfo.textContent = `顯示 ${startIndex} - ${endIndex} 項，共 ${totalItems} 個樣本`;
    }
}


// 更新Alpha diversity統計
// function updateAlphaStats(alphaData) {
  //    const statsDiv = document.getElementById('alpha-stats');
  //    if (!statsDiv || !alphaData) return;
    
      //statsDiv.innerHTML = `
          //<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
              //<div style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
                  //<h3>Shannon Index</h3>
                  //<p>平均值: ${alphaData.shannon_mean} ± ${alphaData.shannon_std}</p>
              //</div>
              //<div style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
                  //<h3>Simpson Index</h3>
                  //<p>平均值: ${alphaData.simpson_mean} ± ${alphaData.simpson_std}</p>
            //</div>
            //<div style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
                //<h3>Chao1</h3>
                //<p>平均值: ${alphaData.chao1_mean} ± ${alphaData.chao1_std}</p>
            //</div>
        //</div>
    //`;
  //}

// 更新項目信息
function updateProjectInfo(projectId) {
    if (projectId) {
        const h1 = document.querySelector('h1');
        if (h1) {
            h1.textContent = `總體基因體 Reference-based 分析結果報告`;
        }
        
        // 🔥 關鍵：更新project-id span元素
        const projectIdSpan = document.querySelector('.project-id');
        if (projectIdSpan) {
            projectIdSpan.textContent = projectId;
        }
    }
}

// 供外部調用的數據設置函數
function setAnalysisData(data) {
    analysisData = data;
    window.analysisDataReady = true;

    console.log('Analysis data set:', analysisData);
    
    // 觸發數據載入事件
    const event = new CustomEvent('analysisDataLoaded');
    document.dispatchEvent(event);
}
